import { AccessError } from '../../access/domain/access';
import {
  RegistryStore,
  type RegistryTransaction,
} from '../../registry/application/ports';
import { exact, revision, uuid, invalid } from '../../registry/domain/registry';
import { createHash } from 'node:crypto';
import { calendarDate } from '../../registry/domain/calendar';
import { operationalDate } from '../../shared/time/operational-date';
import { consultable } from '../../operation/domain/consultation';
import { consultationRows } from '../../operation/application/consultation-rows';
import type { Publication } from './ports';
import type { Clock } from '../../shared/time/clock';
import { OperationService } from '../../operation/application/operation.service';
import { ConsultationService } from '../../operation/application/consultation.service';
import { stopIds, filterOrder } from '../domain/itinerary';
export class ItineraryService {
  constructor(
    private readonly store: RegistryStore,
    private readonly clock: Clock,
    private readonly operations: OperationService,
    private readonly consultations: ConsultationService,
  ) {}
  private run<T>(
    subject: string,
    work: (tx: RegistryTransaction) => Promise<T>,
  ) {
    return this.store.transaction(async (tx) => {
      await tx.authorize(subject);
      await tx.places.lock();
      return work(tx);
    });
  }
  private async group(tx: RegistryTransaction, id: string) {
    const group = await tx.places.get('group', id);
    if (!group?.active) throw new AccessError('GROUP_UNAVAILABLE', 409);
    return group;
  }
  order(subject: string, id: string) {
    uuid(id);
    return this.run(subject, async (tx) => {
      await this.group(tx, id);
      return (
        (await tx.itineraries.order(id)) ?? {
          groupId: id,
          version: 0,
          stopIds: [],
        }
      );
    });
  }
  setOrder(subject: string, id: string, input: unknown) {
    uuid(id);
    const v = exact(input, ['expectedVersion', 'stopIds']),
      ids = stopIds(v.stopIds);
    const expected = v.expectedVersion === 0 ? 0 : revision(v.expectedVersion);
    return this.run(subject, async (tx) => {
      const group = await this.group(tx, id),
        old = await tx.itineraries.order(id);
      if ((old?.version ?? 0) !== expected)
        throw new AccessError('VERSION_CONFLICT', 409);
      for (const stop of ids) {
        const location =
          group.direction === 'dropoff' ? await tx.places.location(stop) : null;
        const item =
          group.direction === 'pickup'
            ? await tx.places.get('point', stop)
            : location
              ? await tx.places.get('region', location.regionId)
              : null;
        if (!item?.active || item.groupId !== id)
          throw new AccessError('STOP_NOT_IN_GROUP', 409);
      }
      const order = { groupId: id, version: expected + 1, stopIds: ids };
      await tx.itineraries.saveOrder(order);
      return order;
    });
  }
  preview(subject: string, id: string, input: unknown) {
    uuid(id);
    const v = exact(
      input,
      input && typeof input === 'object' && 'date' in input ? ['date'] : [],
    );
    const date =
      v.date === undefined
        ? operationalDate(this.clock.now())
        : calendarDate(v.date);
    return this.run(subject, (tx) => this.previewInTransaction(tx, id, date));
  }
  private async previewInTransaction(
    tx: RegistryTransaction,
    id: string,
    date: string,
  ) {
    const group = await this.group(tx, id),
      plan = await tx.operations.plan(date);
    if (!consultable(date, plan?.confirmedTrips ?? [], this.clock.now()))
      throw new AccessError('OPERATION_NOT_AVAILABLE', 404);
    const rows = await consultationRows(tx, date),
      planning = await this.operations.viewInTransaction(tx, date);
    const side = group.direction === 'pickup' ? 'pickup' : 'dropoff';
    const passengers = rows.filter(
      (r) =>
        r[side].state === 'confirmado' &&
        r[side === 'pickup' ? 'pickupGroupId' : 'dropoffGroupId'] === id,
    );
    const stops = new Map<
      string,
      { id: string; label: string; studentIds: string[] }
    >();
    for (const row of passengers) {
      const place = row[side === 'pickup' ? 'pickupPlace' : 'dropoffPlace'];
      if (!place) continue;
      const stop = stops.get(place.id) ?? { ...place, studentIds: [] };
      stop.studentIds.push(row.studentId);
      stops.set(place.id, stop);
    }
    const order = (await tx.itineraries.order(id)) ?? {
      groupId: id,
      version: 0,
      stopIds: [],
    };
    const filtered = filterOrder(order.stopIds, [...stops.keys()]);
    const candidate = {
      ordered: filtered.ordered.map((key) => stops.get(key)!),
      pending: filtered.pending.map((key) => stops.get(key)!),
    };
    const publication = await tx.itineraries.publication(date, id);
    const previewToken = createHash('sha256')
      .update(
        JSON.stringify([
          date,
          group,
          order,
          planning.demandToken,
          plan?.version,
          plan?.confirmedVersion,
          plan?.confirmedTrips,
          planning.status,
          [...stops.values()],
        ]),
      )
      .digest('hex');
    if (!consultable(date, plan?.confirmedTrips ?? [], this.clock.now()))
      throw new AccessError('OPERATION_NOT_AVAILABLE', 404);
    return {
      date,
      groupId: id,
      side,
      method: 'manual' as const,
      order,
      candidate,
      publication,
      version: publication?.version ?? 0,
      previewToken,
      planning,
      needsAdjustment:
        !publication ||
        publication.sourceToken !== previewToken ||
        planning.status !== 'confirmed',
    };
  }
  publish(subject: string, id: string, input: unknown) {
    uuid(id);
    const v = exact(input, ['date', 'expectedVersion', 'previewToken']);
    const date = calendarDate(v.date),
      expected = v.expectedVersion === 0 ? 0 : revision(v.expectedVersion);
    if (
      typeof v.previewToken !== 'string' ||
      !/^[a-f0-9]{64}$/.test(v.previewToken)
    )
      return invalid();
    const previewToken = v.previewToken;
    return this.run(subject, async (tx) => {
      const view = await this.previewInTransaction(tx, id, date);
      if (view.version !== expected)
        throw new AccessError('VERSION_CONFLICT', 409);
      if (view.previewToken !== previewToken)
        throw new AccessError('PREVIEW_CHANGED', 409);
      if (view.candidate.pending.length || !view.order.version)
        throw new AccessError('ITINERARY_INCOMPLETE', 409);
      const plan = view.planning.plan;
      if (
        view.planning.status !== 'confirmed' ||
        !plan?.confirmedVersion ||
        !plan.confirmedTrips?.some((t) => t.groupId === id)
      )
        throw new AccessError('PLANNING_REQUIRES_ADJUSTMENT', 409);
      if (!(await tx.consultations.manifest(date, plan.confirmedVersion)))
        throw new AccessError('CONFIRMED_MEMBERSHIP_MISSING', 409);
      const publication: Publication = {
        date,
        groupId: id,
        version: expected + 1,
        planVersion: plan.confirmedVersion,
        orderVersion: view.order.version,
        stopIds: view.candidate.ordered.map((s) => s.id),
        sourceToken: previewToken,
        publishedBy: await tx.operations.actorId(subject),
        publishedAt: this.clock.now(),
      };
      await tx.itineraries.savePublication(publication);
      return publication;
    });
  }
  driverItinerary(subject: string, id: string) {
    return this.store.transaction(async (tx) => {
      const trip = await this.consultations.tripInTransaction(tx, subject, id);
      if (!trip.groupId) throw new AccessError('LOCAL_ITINERARY_ONLY', 409);
      const publication = await tx.itineraries.publication(
          trip.date,
          trip.groupId,
        ),
        order = await tx.itineraries.order(trip.groupId);
      const compatible =
        publication?.planVersion === Number(trip.id.split(':')[1])
          ? publication
          : null;
      const stops = new Map<
        string,
        { id: string; label: string; studentIds: string[] }
      >();
      for (const student of trip.students) {
        if (!student.place) continue;
        const stop = stops.get(student.place.id) ?? {
          ...student.place,
          studentIds: [],
        };
        stop.studentIds.push(student.studentId);
        stops.set(stop.id, stop);
      }
      const filtered = filterOrder(compatible?.stopIds ?? [], [
        ...stops.keys(),
      ]);
      const needsAdjustment =
        !compatible ||
        trip.needsAdjustment ||
        compatible.orderVersion !== order?.version ||
        filtered.pending.length > 0;
      return {
        tripId: id,
        date: trip.date,
        groupId: trip.groupId,
        side: trip.side,
        method: 'manual' as const,
        status: compatible ? ('published' as const) : ('unpublished' as const),
        publicationVersion: compatible?.version ?? null,
        ordered: filtered.ordered.map((key) => stops.get(key)!),
        pending: filtered.pending.map((key) => stops.get(key)!),
        needsAdjustment,
      };
    });
  }
}
