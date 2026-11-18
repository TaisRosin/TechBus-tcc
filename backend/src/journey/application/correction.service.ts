import { returnItem } from '../../registry/application/return-item';
import { createHash } from 'node:crypto';
import { AccessError } from '../../access/domain/access';
import {
  RegistryStore,
  type RegistryTransaction,
} from '../../registry/application/ports';
import { uuid } from '../../registry/domain/registry';
import { evaluateEligibility } from '../../registry/domain/calendar';
import type { Clock } from '../../shared/time/clock';
import { operationalDate } from '../../shared/time/operational-date';
import { correctLegs, parseCorrection } from '../domain/correction';
import { emptyLegs, type Journey } from '../domain/journey';
import { closingDue } from '../domain/closing';
import type { CorrectionResult } from './correction-ports';
export class CorrectionService {
  constructor(
    private readonly store: RegistryStore,
    private readonly clock: Clock,
  ) {}
  async current(actor: string, id: string) {
    uuid(id);
    return this.store.transaction(async (tx) => {
      await tx.authorize(actor);
      await tx.places.lock();
      const student = await tx.student(id, true);
      if (!student) throw new AccessError('NOT_FOUND', 404);
      const date = operationalDate(this.clock.now()),
        journey = await tx.journeys.get(id, date);
      return {
        date,
        journey,
        version: journey?.version ?? 0,
        studentUniversityId: student.universityId,
        pendingReceipts: await tx.corrections.pending(id, date),
      };
    });
  }
  private async validPlace(
    tx: RegistryTransaction,
    side: 'pickup' | 'dropoff',
    id: string,
  ) {
    const location = side === 'dropoff' ? await tx.places.location(id) : null;
    const item =
      side === 'pickup'
        ? await tx.places.get('point', id)
        : location
          ? await returnItem(tx.places, location)
          : null;
    const group = item?.groupId
      ? await tx.places.get('group', item.groupId)
      : null;
    return !!item?.active && !!group?.active && group.direction === side;
  }
  async correct(
    actor: string,
    id: string,
    input: unknown,
  ): Promise<CorrectionResult> {
    uuid(id);
    const command = parseCorrection(input),
      { changes } = command;
    const requestHash = createHash('sha256')
      .update(JSON.stringify([actor, command]))
      .digest('hex');
    return this.store.transaction(async (tx) => {
      await tx.authorize(actor);
      await tx.places.lock();
      const student = await tx.student(id, true);
      if (!student) throw new AccessError('NOT_FOUND', 404);
      const now = this.clock.now(),
        date = operationalDate(now),
        existing = await tx.corrections.get(id, command.operationId);
      if (existing) {
        if (existing.date !== date || existing.requestHash !== requestHash)
          throw new AccessError('IDEMPOTENCY_CONFLICT', 409);
        return existing.result;
      }
      if (await tx.journeys.receipt(id, command.operationId))
        throw new AccessError('IDEMPOTENCY_CONFLICT', 409);
      const previous = await tx.journeys.get(id, date);
      if ((previous?.version ?? 0) !== command.expectedVersion)
        throw new AccessError('VERSION_CONFLICT', 409);
      const pending = await tx.corrections.pending(id, date);
      if (
        pending
          .map((r) => r.id)
          .sort()
          .join(',') !== command.reviewedReceiptIds.join(',')
      )
        throw new AccessError('PENDING_REVIEW_REQUIRED', 409);
      if (!previous && !Object.keys(changes).length)
        throw new AccessError('INVALID_INPUT', 400);
      if (changes.universityId && changes.universityId !== student.universityId)
        throw new AccessError('CONTEXT_CHANGED', 409);
      const universityId =
          changes.universityId ??
          previous?.universityId ??
          student.universityId,
        legs = correctLegs(previous ?? emptyLegs(), changes);
      const adding = (['pickup', 'dropoff'] as const).some(
        (side) =>
          legs[side].state === 'confirmado' &&
          previous?.[side].state !== 'confirmado',
      );
      const moving = !!previous && universityId !== previous.universityId;
      if (adding || moving) {
        if (universityId !== student.universityId)
          throw new AccessError('CONTEXT_CHANGED', 409);
        const calendar = await tx.calendar(universityId, 'read'),
          exceptions = await tx.exceptions(universityId, date, date);
        const eligibility = evaluateEligibility(
          {
            student,
            contracts: await tx.contracts(id),
            calendar,
            exception: exceptions[0]?.operates ?? null,
          },
          'request',
          new Date(`${date}T12:00:00Z`),
        );
        if (!eligibility.eligible)
          throw new AccessError(eligibility.reason, 409);
      }
      for (const side of ['pickup', 'dropoff'] as const) {
        const key = side === 'pickup' ? 'pointId' : 'locationId';
        if (changes[key] && !(await this.validPlace(tx, side, changes[key])))
          throw new AccessError('LOCATION_INVALID', 409);
      }
      const sequence = await tx.journeys.nextSequence(id);
      const journey: Journey = {
        studentInitiated: previous?.studentInitiated ?? false,
        studentInitiatedAt: previous?.studentInitiatedAt ?? null,
        studentId: id,
        date,
        universityId,
        origin:
          previous?.origin ??
          (student.habitualDays.includes(
            new Date(`${date}T12:00:00Z`).getUTCDay(),
          )
            ? 'habitual'
            : 'extra'),
        ...legs,
        version: (previous?.version ?? 0) + 1,
        lastSequence: sequence,
        pointId: changes.pointId ?? previous?.pointId ?? null,
        locationId: changes.locationId ?? previous?.locationId ?? null,
        closedSequence:
          previous?.closedSequence === previous?.lastSequence && previous
            ? sequence
            : closingDue(date, now) && (!!changes.pickup || !!changes.dropoff)
              ? sequence
              : (previous?.closedSequence ?? null),
        closureIssue:
          changes.pickup || changes.dropoff || moving
            ? null
            : (previous?.closureIssue ?? null),
        closureBaseState: changes.dropoff
          ? null
          : (previous?.closureBaseState ?? null),
        cancelSequence: changes.dropoff
          ? null
          : (previous?.cancelSequence ?? null),
      };
      const defaults = await tx.places.defaults(id);
      for (const side of ['pickup', 'dropoff'] as const) {
        const key = side === 'pickup' ? 'pointId' : 'locationId';
        const value = defaults.find((d) => d.direction === side)?.[key];
        if (
          legs[side].state === 'confirmado' &&
          previous?.[side].state !== 'confirmado' &&
          !journey[key] &&
          value &&
          (await this.validPlace(tx, side, value))
        )
          journey[key] = value;
      }
      await tx.journeys.receive({
        id: command.operationId,
        studentId: id,
        sequence,
        receivedAt: now,
        date,
        ordering: 'received',
        result: null,
      });
      for (const receipt of pending)
        await tx.journeys.finish(id, receipt.id, {
          status: 'rejected',
          code: 'RESOLVED_BY_TEAM',
        });
      await tx.journeys.save(journey);
      await tx.journeys.finish(id, command.operationId, {
        status: 'applied',
        version: journey.version,
      });
      const result: CorrectionResult = {
        operationId: command.operationId,
        version: journey.version,
        correctedAt: now.toISOString(),
        journey,
      };
      await tx.corrections.insert({
        studentId: id,
        operationId: command.operationId,
        date,
        actorId: await tx.operations.actorId(actor),
        requestHash,
        reason: command.reason,
        createdAt: now,
        result,
      });
      return result;
    });
  }
}
