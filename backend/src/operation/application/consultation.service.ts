import { AccessError, type Role } from '../../access/domain/access';
import {
  RegistryStore,
  type RegistryTransaction,
} from '../../registry/application/ports';
import { exact, uuid, revision } from '../../registry/domain/registry';
import type { Clock } from '../../shared/time/clock';
import { OperationService } from './operation.service';
import { operationalDate } from '../../shared/time/operational-date';
import { calendarDate } from '../../registry/domain/calendar';
import { page } from '../../registry/domain/locations';
import { consultable, previousDate, tripSide } from '../domain/consultation';
import { localInstant } from '../domain/operation';
import type { Stage } from '../../fleet/domain/fleet';
import { consultationRows } from './consultation-rows';
import type { State } from '../../journey/domain/journey';
export class ConsultationService {
  constructor(
    private readonly store: RegistryStore,
    private readonly clock: Clock,
    private readonly operations: OperationService,
  ) {}
  overview(subject: string, input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new AccessError('INVALID_INPUT', 400);
    const { date: requested, ...query } = input as Record<string, unknown>,
      paging = page(query);
    const date =
      requested === undefined
        ? operationalDate(this.clock.now())
        : calendarDate(requested);
    return this.store.transaction(async (tx) => {
      await this.actor(tx, subject, ['admin', 'operator']);
      await tx.places.lock();
      const plan = await tx.operations.plan(date);
      if (!consultable(date, plan?.confirmedTrips ?? [], this.clock.now()))
        throw new AccessError('OPERATION_NOT_AVAILABLE', 404);
      const rows = await consultationRows(tx, date),
        planning = await this.operations.viewInTransaction(tx, date);
      const publicationIssues =
        plan?.confirmedVersion &&
        !(await tx.consultations.manifest(date, plan.confirmedVersion))
          ? ['CONFIRMED_MEMBERSHIP_MISSING']
          : [];
      const states = (): Record<State, number> => ({
        sem_resposta: 0,
        indeciso: 0,
        confirmado: 0,
        recusado: 0,
        cancelado: 0,
      });
      const counts = { pickup: states(), dropoff: states() };
      const breakdown: {
        universityId: string;
        side: 'pickup' | 'dropoff';
        groupId: string | null;
        placeId: string | null;
        counts: Record<State, number>;
      }[] = [];
      for (const row of rows)
        for (const side of ['pickup', 'dropoff'] as const)
          counts[side][row[side].state]++;
      for (const row of rows)
        for (const side of ['pickup', 'dropoff'] as const) {
          const groupId =
              side === 'pickup' ? row.pickupGroupId : row.dropoffGroupId,
            placeId =
              (side === 'pickup' ? row.pickupPlace : row.dropoffPlace)?.id ??
              null;
          let bucket = breakdown.find(
            (b) =>
              b.universityId === row.universityId &&
              b.side === side &&
              b.groupId === groupId &&
              b.placeId === placeId,
          );
          if (!bucket) {
            bucket = {
              universityId: row.universityId,
              side,
              groupId,
              placeId,
              counts: states(),
            };
            breakdown.push(bucket);
          }
          bucket.counts[row[side].state]++;
        }
      const messages = [] as Awaited<
        ReturnType<RegistryTransaction['messages']['list']>
      >;
      for (let offset = 0; ; offset += 100) {
        const batch = await tx.messages.list(date, 100, offset);
        messages.push(...batch);
        if (batch.length < 100) break;
      }
      if (!consultable(date, plan?.confirmedTrips ?? [], this.clock.now()))
        throw new AccessError('OPERATION_NOT_AVAILABLE', 404);
      return {
        date,
        planning,
        publicationIssues,
        counts,
        breakdown,
        total: rows.length,
        students: rows
          .slice(paging.offset, paging.offset + paging.limit)
          .map((row) => ({
            ...row,
            messages: messages.filter((m) => m.studentId === row.studentId),
          })),
      };
    });
  }
  private async actor(tx: RegistryTransaction, subject: string, roles: Role[]) {
    await tx.consultations.lockAccess();
    const actor = await tx.consultations.actor(subject);
    if (!actor?.active || !roles.includes(actor.role))
      throw new AccessError('FORBIDDEN', 403);
    return actor;
  }
  getLink(subject: string, id: string) {
    uuid(id);
    return this.store.transaction(async (tx) => {
      await this.actor(tx, subject, ['admin']);
      if (!(await tx.consultations.user(id)))
        throw new AccessError('NOT_FOUND', 404);
      return (
        (await tx.consultations.link(id)) ?? {
          userId: id,
          driverId: null,
          version: 0,
        }
      );
    });
  }
  link(subject: string, id: string, input: unknown) {
    uuid(id);
    const v = exact(input, ['driverId', 'expectedVersion']);
    const driverId = v.driverId === null ? null : uuid(v.driverId as string),
      expectedVersion =
        v.expectedVersion === 0 ? 0 : revision(v.expectedVersion);
    return this.store.transaction(async (tx) => {
      await this.actor(tx, subject, ['admin']);
      const user = await tx.consultations.user(id);
      if (!user) throw new AccessError('NOT_FOUND', 404);
      const old = await tx.consultations.link(id);
      if ((old?.version ?? 0) !== expectedVersion)
        throw new AccessError('VERSION_CONFLICT', 409);
      await tx.places.lock();
      if (driverId) {
        if (
          !user.active ||
          user.role !== 'driver' ||
          !(await tx.fleet.driver(driverId))?.active
        )
          throw new AccessError('DRIVER_ACCESS_REQUIRED', 409);
        const owner = await tx.consultations.owner(driverId);
        if (owner && owner.userId !== id)
          throw new AccessError('DRIVER_ALREADY_LINKED', 409);
      }
      const link = { userId: id, driverId, version: expectedVersion + 1 };
      await tx.consultations.saveLink(link);
      return link;
    });
  }
  trips(subject: string) {
    return this.driverViews(subject).then((rows) =>
      rows.map(({ students, ...trip }) => {
        void students;
        return trip;
      }),
    );
  }
  async trip(subject: string, id: string) {
    return this.store.transaction((tx) =>
      this.tripInTransaction(tx, subject, id),
    );
  }
  async tripInTransaction(
    tx: RegistryTransaction,
    subject: string,
    id: string,
  ) {
    if (!/^\d{4}-\d{2}-\d{2}:\d{1,10}:\d{1,3}:\d$/.test(id))
      throw new AccessError('NOT_FOUND', 404);
    const result = (await this.driverViewsInTransaction(tx, subject)).find(
      (t) => t.id === id,
    );
    if (!result) throw new AccessError('NOT_FOUND', 404);
    return result;
  }
  private driverViews(subject: string) {
    return this.store.transaction((tx) =>
      this.driverViewsInTransaction(tx, subject),
    );
  }
  private async driverViewsInTransaction(
    tx: RegistryTransaction,
    subject: string,
  ) {
    const actor = await this.actor(tx, subject, ['driver']);
    await tx.places.lock();
    const link = await tx.consultations.link(actor.id);
    if (!link?.driverId || !(await tx.fleet.driver(link.driverId))?.active)
      throw new AccessError('DRIVER_ACCESS_REQUIRED', 403);
    const now = this.clock.now(),
      today = operationalDate(now);
    const result: DriverTrip[] = [];
    for (const date of [previousDate(today), today]) {
      const plan = await tx.operations.plan(date);
      if (
        !plan?.confirmedVersion ||
        !plan.confirmedTrips ||
        !consultable(date, plan.confirmedTrips, now)
      )
        continue;
      if (
        !plan.confirmedTrips.some((t) =>
          t.legs.some((l) => l.driverId === link.driverId),
        )
      )
        continue;
      const rows = await consultationRows(tx, date),
        manifest = await tx.consultations.manifest(date, plan.confirmedVersion),
        planning = await this.operations.viewInTransaction(tx, date);
      if (!consultable(date, plan.confirmedTrips, this.clock.now())) continue;
      for (let index = 0; index < plan.confirmedTrips.length; index++) {
        const trip = plan.confirmedTrips[index];
        for (let legIndex = 0; legIndex < trip.legs.length; legIndex++) {
          const leg = trip.legs[legIndex];
          if (leg.driverId !== link.driverId) continue;
          const side = tripSide(trip, legIndex),
            groupKey = side === 'pickup' ? 'pickupGroupId' : 'dropoffGroupId';
          const passengers = rows.filter((row) => {
            const old = manifest?.find((m) => m.studentId === row.studentId);
            if (
              !old?.[side] ||
              row[side].state !== 'confirmado' ||
              row.issues.includes('CONTEXT_CHANGED')
            )
              return false;
            if (trip.stage !== 'intermunicipal' && !row[groupKey]) return false;
            return trip.stage === 'intermunicipal'
              ? old.universityId === row.universityId &&
                  row.universityId === trip.universityId
              : old[groupKey] === row[groupKey] &&
                  row[groupKey] === trip.groupId;
          });
          const vehicle = await tx.fleet.vehicle(trip.vehicleId);
          result.push({
            id: `${date}:${plan.confirmedVersion}:${index}:${legIndex}`,
            date,
            stage: trip.stage,
            side,
            universityId: trip.universityId ?? null,
            groupId: trip.groupId ?? null,
            vehicle: vehicle
              ? {
                  id: vehicle.id,
                  identifier: vehicle.identifier,
                  plate: vehicle.plate,
                  kind: vehicle.kind,
                  seats: vehicle.seats,
                }
              : null,
            start: localInstant(date, leg.start),
            end: localInstant(date, leg.end),
            needsAdjustment: !manifest || planning.status !== 'confirmed',
            students: passengers.map((row) => ({
              studentId: row.studentId,
              name: row.name,
              phone: row.phone,
              place: side === 'pickup' ? row.pickupPlace : row.dropoffPlace,
              origin: row[side].origin,
            })),
          });
        }
      }
    }
    return result;
  }
}
export interface DriverTrip {
  id: string;
  date: string;
  stage: Stage;
  side: 'pickup' | 'dropoff';
  universityId: string | null;
  groupId: string | null;
  vehicle: {
    id: string;
    identifier: string;
    plate: string;
    kind: string;
    seats: number;
  } | null;
  start: Date;
  end: Date;
  needsAdjustment: boolean;
  students: {
    studentId: string;
    name: string;
    phone: string;
    place: { id: string; label: string } | null;
    origin: string;
  }[];
}
