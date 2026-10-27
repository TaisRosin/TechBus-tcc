import { createHash } from 'node:crypto';
import { AccessError } from '../../access/domain/access';
import {
  RegistryStore,
  type RegistryTransaction,
} from '../../registry/application/ports';
import { exact, invalid, revision } from '../../registry/domain/registry';
import { evaluateEligibility } from '../../registry/domain/calendar';
import {
  covers,
  interval,
  parseProposal,
  type ProposedTrip,
} from '../../fleet/domain/fleet';
import { FleetService } from '../../fleet/application/fleet.service';
import { closingDue } from '../../journey/domain/closing';
import type { Plan, Occupancy } from './ports';
import type { Vehicle } from '../../fleet/application/ports';
import type { Clock } from '../../shared/time/clock';
import { operationalDate } from '../../shared/time/operational-date';
import {
  demand,
  recommend,
  localInstant,
  coverageIssues,
  type Requirement,
} from '../domain/operation';
import { consultationRows, membership } from './consultation-rows';

export class OperationService {
  constructor(
    private readonly store: RegistryStore,
    private readonly clock: Clock,
  ) {}
  private run<T>(
    actor: string,
    work: (tx: RegistryTransaction, date: string) => Promise<T>,
  ) {
    return this.store.transaction(async (tx) => {
      await tx.authorize(actor);
      await tx.places.lock();
      return work(tx, operationalDate(this.clock.now()));
    });
  }
  private async snapshot(tx: RegistryTransaction, date: string) {
    const universities = ['unimater', 'unidep'].map((universityId) => ({
      universityId,
      pickup: 0,
      dropoff: 0,
      required: 0,
    }));
    const groups: {
        groupId: string;
        stage: 'collection' | 'distribution';
        count: number;
      }[] = [],
      issues: { studentId: string; code: string }[] = [],
      revisions: unknown[] = [];
    let cursor: string | null = null,
      closingPending = false;
    while (true) {
      const ids = await tx.journeys.page(date, cursor, 100);
      for (const id of ids) {
        const student = await tx.student(id, true),
          journey = await tx.journeys.get(id, date);
        const pending = await tx.journeys.pending(
          id,
          date,
          journey?.lastSequence ?? 0,
        );
        const add = (code: string) => issues.push({ studentId: id, code });
        revisions.push([student?.version, journey, pending]);
        if (pending.length) add('COMMAND_PENDING');
        if (!journey || !student) continue;
        if (journey.closedSequence !== journey.lastSequence)
          closingPending = true;
        if (journey.closureIssue)
          add(`CLOSURE_BLOCKED_${journey.closureIssue}`);
        const counts = {
          pickup: journey.pickup.state === 'confirmado' ? 1 : 0,
          dropoff: journey.dropoff.state === 'confirmado' ? 1 : 0,
        };
        if (!counts.pickup && !counts.dropoff) continue;
        const uni = universities.find(
          (u) => u.universityId === journey.universityId,
        )!;
        uni.pickup += counts.pickup;
        uni.dropoff += counts.dropoff;
        uni.required = demand(uni.pickup, uni.dropoff);
        if (journey.universityId !== student.universityId)
          add('CONTEXT_CHANGED');
        const calendar = await tx.calendar(journey.universityId, 'read'),
          contracts = await tx.contracts(id),
          exceptions = await tx.exceptions(journey.universityId, date, date);
        revisions.push([calendar, contracts, exceptions]);
        const eligibility = evaluateEligibility(
          {
            student,
            contracts,
            calendar,
            exception: exceptions[0]?.operates ?? null,
          },
          'request',
          new Date(`${date}T12:00:00Z`),
        );
        if (!eligibility.eligible) add(eligibility.reason);
        for (const side of ['pickup', 'dropoff'] as const) {
          if (!counts[side]) continue;
          const location =
            side === 'dropoff' && journey.locationId
              ? await tx.places.location(journey.locationId)
              : null;
          const item =
            side === 'pickup' && journey.pointId
              ? await tx.places.get('point', journey.pointId)
              : location
                ? await tx.places.get('region', location.regionId)
                : null;
          const group = item?.groupId
            ? await tx.places.get('group', item.groupId)
            : null;
          revisions.push([location, item, group]);
          if (!item?.active || !group?.active || group.direction !== side) {
            add(`${side.toUpperCase()}_LOCATION_INVALID`);
            continue;
          }
          const stage = side === 'pickup' ? 'collection' : 'distribution';
          const existing = groups.find(
            (g) => g.groupId === group.id && g.stage === stage,
          );
          if (existing) existing.count++;
          else groups.push({ groupId: group.id, stage, count: 1 });
        }
      }
      if (ids.length < 100) break;
      cursor = ids[ids.length - 1];
    }
    const demandToken = createHash('sha256')
      .update(JSON.stringify([date, revisions]))
      .digest('hex');
    const required: Requirement[] = [
      ...universities.map((u) => ({
        key: u.universityId,
        stage: 'intermunicipal' as const,
        count: u.required,
      })),
      ...groups.map((g) => ({
        key: g.groupId,
        stage: g.stage,
        count: g.count,
      })),
    ];
    return {
      date,
      universities,
      groups,
      issues,
      closingPending,
      demandToken,
      required,
    };
  }
  current(actor: string) {
    return this.run(actor, (tx, date) => this.viewInTransaction(tx, date));
  }
  async viewInTransaction(tx: RegistryTransaction, date: string) {
    const snapshot = await this.snapshot(tx, date),
      plan = await tx.operations.plan(date);
    const planningIssues = plan
      ? await this.validate(tx, date, snapshot.required, plan.draft)
      : [];
    const changed =
      plan?.needsAdjustment ||
      plan?.confirmedVersion !== plan?.version ||
      plan?.confirmedToken !== snapshot.demandToken ||
      snapshot.issues.length > 0 ||
      snapshot.closingPending ||
      planningIssues.length > 0;
    return {
      ...snapshot,
      plan,
      planningIssues,
      version: plan?.version ?? 0,
      status: plan?.confirmedVersion
        ? changed
          ? 'needs_adjustment'
          : 'confirmed'
        : 'draft',
    };
  }
  private inputVersion(v: Record<string, unknown>) {
    const expectedVersion =
      v.expectedVersion === 0 ? 0 : revision(v.expectedVersion);
    if (
      typeof v.demandToken !== 'string' ||
      !/^[a-f0-9]{64}$/.test(v.demandToken)
    )
      return invalid();
    return { expectedVersion, demandToken: v.demandToken };
  }
  async saveDraft(actor: string, input: unknown) {
    const v = exact(input, ['expectedVersion', 'demandToken', 'trips']),
      { expectedVersion, demandToken } = this.inputVersion(v);
    return this.run(actor, async (tx, date) => {
      const trips =
        Array.isArray(v.trips) && v.trips.length === 0
          ? []
          : parseProposal({ date, trips: v.trips }).trips;
      const snapshot = await this.snapshot(tx, date),
        old = await tx.operations.plan(date);
      if ((old?.version ?? 0) !== expectedVersion)
        throw new AccessError('VERSION_CONFLICT', 409);
      if (snapshot.demandToken !== demandToken)
        throw new AccessError('DEMAND_CHANGED', 409);
      const plan: Plan = {
        date,
        version: expectedVersion + 1,
        draft: trips,
        demandToken,
        confirmedVersion: old?.confirmedVersion ?? null,
        confirmedTrips: old?.confirmedTrips ?? null,
        confirmedToken: old?.confirmedToken ?? null,
        confirmedBy: old?.confirmedBy ?? null,
        confirmedAt: old?.confirmedAt ?? null,
        needsAdjustment: !!old?.confirmedVersion,
      };
      await tx.operations.save(plan);
      return {
        plan,
        version: plan.version,
        status: plan.confirmedVersion ? 'needs_adjustment' : 'draft',
      };
    });
  }
  private occupancies(date: string, trips: ProposedTrip[]): Occupancy[] {
    return trips.flatMap((t) => [
      {
        vehicleId: t.vehicleId,
        driverId: null,
        start: localInstant(date, t.start),
        end: localInstant(date, t.end),
      },
      ...t.legs.map((l) => ({
        vehicleId: null,
        driverId: l.driverId,
        start: localInstant(date, l.start),
        end: localInstant(date, l.end),
      })),
    ]);
  }
  private async validate(
    tx: RegistryTransaction,
    date: string,
    required: Requirement[],
    trips: ProposedTrip[],
  ) {
    const fleet = await new FleetService(this.store).evaluateInTransaction(
      tx,
      date,
      trips,
    );
    const capacities = new Map<string, number>();
    for (const id of [...new Set(trips.map((t) => t.vehicleId))].sort()) {
      const v = await tx.fleet.vehicle(id);
      if (v) capacities.set(id, v.seats);
    }
    const issues = [
      ...fleet.issues.map((i) => i.code),
      ...coverageIssues(required, trips, capacities),
    ];
    for (const value of this.occupancies(date, trips))
      if (await tx.operations.conflicts(date, value))
        issues.push(value.vehicleId ? 'VEHICLE_OCCUPIED' : 'DRIVER_OCCUPIED');
    return [...new Set(issues)];
  }
  async confirm(actor: string, input: unknown) {
    const { expectedVersion, demandToken } = this.inputVersion(
      exact(input, ['expectedVersion', 'demandToken']),
    );
    return this.run(actor, async (tx, date) => {
      if (!closingDue(date, this.clock.now()))
        throw new AccessError('CLOSURE_NOT_DUE', 409);
      const snapshot = await this.snapshot(tx, date),
        plan = await tx.operations.plan(date);
      if (!plan || plan.version !== expectedVersion)
        throw new AccessError('VERSION_CONFLICT', 409);
      if (
        snapshot.demandToken !== demandToken ||
        plan.demandToken !== demandToken
      )
        throw new AccessError('DEMAND_CHANGED', 409);
      const issues = await this.validate(
        tx,
        date,
        snapshot.required,
        plan.draft,
      );
      if (snapshot.closingPending || snapshot.issues.length || issues.length)
        throw new AccessError('PLANNING_REQUIRES_ADJUSTMENT', 409);
      if (
        plan.confirmedVersion === plan.version &&
        plan.confirmedToken === demandToken &&
        !plan.needsAdjustment &&
        (await tx.consultations.manifest(date, plan.version))
      )
        return { plan, version: plan.version, status: 'confirmed' };
      plan.confirmedVersion = plan.version;
      plan.confirmedTrips = plan.draft;
      plan.confirmedToken = demandToken;
      plan.confirmedBy = await tx.operations.actorId(actor);
      plan.confirmedAt = this.clock.now();
      plan.needsAdjustment = false;
      await tx.operations.save(plan);
      if (!(await tx.consultations.manifest(date, plan.version))) {
        await tx.consultations.saveManifest(
          date,
          plan.version,
          (await consultationRows(tx, date))
            .map(membership)
            .filter((m) => m.pickup || m.dropoff),
        );
      }
      await tx.operations.replaceOccupancies(
        date,
        plan.version,
        this.occupancies(date, plan.draft),
      );
      return { plan, version: plan.version, status: 'confirmed' };
    });
  }
  async options(actor: string, input: unknown) {
    const v = exact(input, ['universityId', 'start', 'end']);
    if (!['unimater', 'unidep'].includes(v.universityId as string))
      return invalid();
    const universityId = v.universityId as string;
    const { start, end } = interval(v.start, v.end);
    return this.run(actor, async (tx, date) => {
      const snapshot = await this.snapshot(tx, date),
        required = snapshot.universities.find(
          (u) => u.universityId === v.universityId,
        )!.required;
      const plan = await tx.operations.plan(date);
      const available: Vehicle[] = [];
      for (let offset = 0; ; offset += 100) {
        const batch = await tx.fleet.vehicles(100, offset);
        for (const v of batch) {
          if (!v.active || v.seats < required) continue;
          if (
            plan?.confirmedTrips?.some(
              (t) =>
                t.vehicleId === v.id &&
                t.universityId !== universityId &&
                t.start < end &&
                start < t.end,
            )
          )
            continue;
          const exceptions = await tx.fleet.exceptions(v.id, date, date),
            windows =
              exceptions[0]?.windows ??
              v.week?.[new Date(`${date}T12:00:00Z`).getUTCDay()];
          if (
            windows &&
            covers(windows, 'intermunicipal', start, end) &&
            !(await tx.operations.conflicts(date, {
              vehicleId: v.id,
              driverId: null,
              start: localInstant(date, start),
              end: localInstant(date, end),
            }))
          )
            available.push(v);
        }
        if (batch.length < 100) break;
      }
      return {
        required,
        ...recommend(required, available),
        demandToken: snapshot.demandToken,
      };
    });
  }
}
