import { AccessError } from '../../access/domain/access';
import {
  RegistryStore,
  type RegistryTransaction,
} from '../../registry/application/ports';
import { uuid, invalid, type Student } from '../../registry/domain/registry';
import { evaluateEligibility } from '../../registry/domain/calendar';
import type { Clock } from '../../shared/time/clock';
import { operationalDate } from '../../shared/time/operational-date';
import { closingDue, defaultReturn, returnGuidance } from '../domain/closing';
import {
  emptyLegs,
  parseCommand,
  transition,
  type Journey,
  type Receipt,
  type CommandResult,
} from '../domain/journey';

const hour = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  hourCycle: 'h23',
});
export class JourneyService {
  constructor(
    private readonly store: RegistryStore,
    private readonly clock: Clock,
  ) {}
  // Use when a trusted ingress has resolved identity but cannot prove event order.
  // Receiving later is not proof that a provider's event was produced later.
  receiveUnordered(studentId: string, eventId: string) {
    return this.receive(studentId, eventId, 'uncertain');
  }
  // Internal ingress only: future authenticated adapters must resolve identity before calling.
  async receive(
    studentId: string,
    eventId: string,
    ordering: Receipt['ordering'] = 'received',
  ) {
    uuid(studentId);
    uuid(eventId);
    if (!['received', 'uncertain'].includes(ordering)) return invalid();
    return this.store.transaction(async (tx) => {
      await tx.places.lock();
      if (!(await tx.student(studentId, true)))
        throw new AccessError('NOT_FOUND', 404);
      const existing = await tx.journeys.receipt(studentId, eventId);
      if (existing) return existing;
      const receivedAt = this.clock.now();
      const receipt: Receipt = {
        studentId,
        id: eventId,
        sequence: await tx.journeys.nextSequence(studentId),
        receivedAt,
        date: operationalDate(receivedAt),
        ordering,
        result: null,
      };
      await tx.journeys.receive(receipt);
      return receipt;
    });
  }
  async apply(
    studentId: string,
    receiptId: string,
    input: unknown,
  ): Promise<CommandResult> {
    uuid(studentId);
    uuid(receiptId);
    const command = parseCommand(input);
    return this.store.transaction(async (tx) => {
      await tx.places.lock();
      const student = await tx.student(studentId, true);
      if (!student) throw new AccessError('NOT_FOUND', 404);
      const receipt = await tx.journeys.receipt(studentId, receiptId);
      if (!receipt) throw new AccessError('NOT_FOUND', 404);
      if (
        receipt.result &&
        (receipt.result.code !== 'AWAITING_TIMELY_COMMAND' ||
          command.kind !== 'cancel_return')
      )
        return receipt.result;
      const finish = async (result: CommandResult) => {
        await tx.journeys.finish(studentId, receiptId, result);
        if (command.kind !== 'cancel_return')
          await this.settleCancellations(tx, student, receipt.date);
        return result;
      };
      if (receipt.ordering === 'uncertain')
        return finish({ status: 'pending', code: 'ORDER_UNCERTAIN' });
      if (command.kind === 'cancel_return') {
        const receivedHour = Number(hour.format(receipt.receivedAt));
        if (receivedHour < 17)
          return finish({ status: 'rejected', code: 'CANCEL_WINDOW_NOT_OPEN' });
        if (receivedHour >= 22)
          return finish({ status: 'rejected', code: 'DEADLINE_PASSED' });
        await tx.journeys.markCancellation(studentId, receiptId);
        return finish(await this.cancel(tx, student, receipt));
      }
      if (Number(hour.format(receipt.receivedAt)) >= 17)
        return finish({ status: 'rejected', code: 'DEADLINE_PASSED' });
      const previous = await tx.journeys.get(studentId, receipt.date);
      if (previous && previous.lastSequence >= receipt.sequence)
        return finish({ status: 'rejected', code: 'STALE_COMMAND' });
      if (command.kind === 'unclear')
        return finish({
          status: 'pending',
          code: command.persistent
            ? 'TEAM_REVIEW_REQUIRED'
            : 'CLARIFICATION_REQUIRED',
        });
      if (previous && previous.universityId !== student.universityId)
        return finish({ status: 'pending', code: 'CONTEXT_CHANGED' });
      const base =
        previous?.dropoff.origin === 'padrao_fechamento'
          ? {
              ...previous,
              dropoff: {
                state: previous.closureBaseState!,
                origin:
                  previous.closureBaseState === 'indeciso'
                    ? ('aluno_explicito' as const)
                    : ('none' as const),
              },
            }
          : (previous ?? emptyLegs());
      const next = transition(base, command);
      if (previous?.cancelSequence) next.dropoff = { ...previous.dropoff };
      const adding = (['pickup', 'dropoff'] as const).some(
        (side) =>
          next[side].state === 'confirmado' &&
          previous?.[side].state !== 'confirmado',
      );
      if (adding || command.kind === 'places') {
        const calendar = await tx.calendar(student.universityId, 'read');
        const exceptions = await tx.exceptions(
          student.universityId,
          receipt.date,
          receipt.date,
        );
        const eligibility = evaluateEligibility(
          {
            student,
            contracts: await tx.contracts(studentId),
            calendar,
            exception: exceptions[0]?.operates ?? null,
          },
          'request',
          receipt.receivedAt,
        );
        if (!eligibility.eligible)
          return finish({ status: 'rejected', code: eligibility.reason });
      }
      const initiationEligible = evaluateEligibility(
        {
          student,
          calendar: await tx.calendar(student.universityId, 'read'),
          contracts: await tx.contracts(studentId),
          exception:
            (
              await tx.exceptions(
                student.universityId,
                receipt.date,
                receipt.date,
              )
            )[0]?.operates ?? null,
        },
        'request',
        receipt.receivedAt,
      ).eligible;
      const journey: Journey = {
        studentInitiated: previous?.studentInitiated || initiationEligible,
        studentInitiatedAt:
          previous?.studentInitiatedAt ??
          (initiationEligible ? receipt.receivedAt : null),
        studentId,
        date: receipt.date,
        universityId: previous?.universityId ?? student.universityId,
        origin:
          previous?.origin ??
          (student.habitualDays.includes(
            new Date(`${receipt.date}T12:00:00Z`).getUTCDay(),
          )
            ? 'habitual'
            : 'extra'),
        ...next,
        version: (previous?.version ?? 0) + 1,
        lastSequence: receipt.sequence,
        pointId: previous?.pointId ?? null,
        locationId: previous?.locationId ?? null,
        closedSequence: previous?.closedSequence ?? null,
        closureIssue: null,
        closureBaseState: null,
        cancelSequence: previous?.cancelSequence ?? null,
      };
      if (command.kind === 'places') {
        if (
          command.pointId &&
          !(await this.validPlace(tx, 'pickup', command.pointId))
        )
          return finish({ status: 'rejected', code: 'LOCATION_INVALID' });
        if (
          command.locationId &&
          !(await this.validPlace(tx, 'dropoff', command.locationId))
        )
          return finish({ status: 'rejected', code: 'LOCATION_INVALID' });
        journey.pointId = command.pointId ?? journey.pointId;
        journey.locationId = command.locationId ?? journey.locationId;
      }
      const defaults = await tx.places.defaults(studentId);
      for (const side of ['pickup', 'dropoff'] as const) {
        const key = side === 'pickup' ? 'pointId' : 'locationId';
        if (
          journey[side].state === 'confirmado' &&
          previous?.[side].state !== 'confirmado' &&
          !journey[key]
        ) {
          const value = defaults.find((d) => d.direction === side)?.[key];
          if (value && (await this.validPlace(tx, side, value)))
            journey[key] = value;
        }
      }
      await this.reconcileClosing(tx, student, journey);
      await tx.journeys.save(journey);
      return finish({ status: 'applied', version: journey.version });
    });
  }
  async today(actor: string, studentId: string) {
    uuid(studentId);
    return this.store.transaction(async (tx) => {
      await tx.authorize(actor);
      await tx.places.lock();
      const student = await tx.student(studentId, true);
      if (!student) throw new AccessError('NOT_FOUND', 404);
      const date = operationalDate(this.clock.now());
      const journey = await tx.journeys.get(studentId, date);
      const pending = await tx.journeys.pending(
        studentId,
        date,
        journey?.lastSequence ?? 0,
      );
      const view = await this.view(tx, journey);
      if (journey && (view.counts.pickup || view.counts.dropoff)) {
        if (journey.universityId !== student.universityId)
          view.issues.push('CONTEXT_CHANGED');
        const calendar = await tx.calendar(journey.universityId, 'read');
        const exceptions = await tx.exceptions(
          journey.universityId,
          date,
          date,
        );
        const eligibility = evaluateEligibility(
          {
            student,
            contracts: await tx.contracts(studentId),
            calendar,
            exception: exceptions[0]?.operates ?? null,
          },
          'request',
          new Date(`${date}T12:00:00Z`),
        );
        if (!eligibility.eligible) view.issues.push(eligibility.reason);
      }
      return {
        ...view,
        needsAdjustment: view.issues.length > 0 || pending.length > 0,
        pending,
      };
    });
  }
  async close(studentId: string, date: string) {
    uuid(studentId);
    if (!closingDue(date, this.clock.now()))
      throw new AccessError('CLOSURE_NOT_DUE', 409);
    return this.store.transaction(async (tx) => {
      await tx.places.lock();
      const student = await tx.student(studentId, true);
      if (!student) throw new AccessError('NOT_FOUND', 404);
      let journey = await tx.journeys.get(studentId, date);
      if (journey && (await this.reconcileClosing(tx, student, journey))) {
        journey.version++;
        await tx.journeys.save(journey);
      }
      await this.settleCancellations(tx, student, date);
      journey = await tx.journeys.get(studentId, date);
      const view = await this.view(tx, journey),
        pending = await tx.journeys.pending(
          studentId,
          date,
          journey?.lastSequence ?? 0,
        );
      return {
        ...view,
        pending,
        needsAdjustment: view.needsAdjustment || pending.length > 0,
      };
    });
  }
  async closeDay(date: string, afterStudentId?: string, limit = 100) {
    if (!closingDue(date, this.clock.now()))
      throw new AccessError('CLOSURE_NOT_DUE', 409);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return invalid();
    if (afterStudentId !== undefined) uuid(afterStudentId);
    const ids = await this.store.transaction((tx) =>
      tx.journeys.page(date, afterStudentId ?? null, limit),
    );
    const results: Array<
      | {
          studentId: string;
          status: 'processed';
          needsAdjustment: boolean;
          pending: string[];
        }
      | { studentId: string; status: 'failed'; code: string }
    > = [];
    for (const studentId of ids) {
      try {
        const view = await this.close(studentId, date);
        results.push({
          studentId,
          status: 'processed',
          needsAdjustment: view.needsAdjustment,
          pending: view.pending,
        });
      } catch (error) {
        results.push({
          studentId,
          status: 'failed',
          code:
            error instanceof AccessError ? error.code : 'CLOSURE_UNAVAILABLE',
        });
      }
    }
    return {
      results,
      nextCursor: ids.length === limit ? ids[ids.length - 1] : null,
    };
  }
  private async reconcileClosing(
    tx: RegistryTransaction,
    student: Student,
    journey: Journey,
  ): Promise<boolean> {
    if (
      !closingDue(journey.date, this.clock.now()) ||
      journey.closedSequence === journey.lastSequence
    )
      return false;
    journey.closedSequence = journey.lastSequence;
    journey.closureIssue = null;
    const value = defaultReturn(journey);
    if (!value) return true;
    if (student.universityId !== journey.universityId) {
      journey.closureIssue = 'CONTEXT_CHANGED';
      return true;
    }
    const calendar = await tx.calendar(journey.universityId, 'read');
    const exceptions = await tx.exceptions(
      journey.universityId,
      journey.date,
      journey.date,
    );
    const eligibility = evaluateEligibility(
      {
        student,
        contracts: await tx.contracts(student.id),
        calendar,
        exception: exceptions[0]?.operates ?? null,
      },
      'request',
      new Date(`${journey.date}T12:00:00Z`),
    );
    if (!eligibility.eligible) {
      journey.closureIssue = eligibility.reason;
      return true;
    }
    journey.closureBaseState = journey.dropoff.state as
      | 'sem_resposta'
      | 'indeciso';
    journey.dropoff = value;
    if (!journey.locationId) {
      const value = (await tx.places.defaults(student.id)).find(
        (v) => v.direction === 'dropoff',
      )?.locationId;
      if (value && (await this.validPlace(tx, 'dropoff', value)))
        journey.locationId = value;
    }
    return true;
  }
  private async cancel(
    tx: RegistryTransaction,
    student: Student,
    receipt: Receipt,
  ): Promise<CommandResult> {
    const journey = await tx.journeys.get(student.id, receipt.date);
    const closed = journey
      ? await this.reconcileClosing(tx, student, journey)
      : false;
    if (journey?.dropoff.state === 'cancelado')
      return { status: 'applied', version: journey.version };
    if (!journey || journey.dropoff.state !== 'confirmado') {
      if (journey && closed) {
        journey.version++;
        await tx.journeys.save(journey);
      }
      const waiting = await tx.journeys.waitingBefore(
        student.id,
        receipt.date,
        receipt.sequence,
        journey?.lastSequence ?? 0,
      );
      return waiting
        ? { status: 'pending', code: 'AWAITING_TIMELY_COMMAND' }
        : { status: 'rejected', code: 'RETURN_NOT_CONFIRMED' };
    }
    journey.dropoff = { state: 'cancelado', origin: 'aluno_explicito' };
    journey.cancelSequence = receipt.sequence;
    journey.closureBaseState = null;
    journey.version++;
    await tx.journeys.save(journey);
    return { status: 'applied', version: journey.version };
  }
  private async settleCancellations(
    tx: RegistryTransaction,
    student: Student,
    date: string,
  ) {
    for (const receipt of await tx.journeys.pendingCancellations(
      student.id,
      date,
    )) {
      await tx.journeys.finish(
        student.id,
        receipt.id,
        await this.cancel(tx, student, receipt),
      );
    }
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
          ? await tx.places.get('region', location.regionId)
          : null;
    if (!item?.active || !item.groupId) return false;
    const group = await tx.places.get('group', item.groupId);
    return !!group?.active && group.direction === side;
  }
  private async view(tx: RegistryTransaction, journey: Journey | null) {
    const counts = {
      pickup: journey?.pickup.state === 'confirmado' ? 1 : 0,
      dropoff: journey?.dropoff.state === 'confirmado' ? 1 : 0,
    };
    const issues: string[] = [];
    if (journey?.closureIssue)
      issues.push(`CLOSURE_BLOCKED_${journey.closureIssue}`);
    if (counts.pickup && !journey?.pointId)
      issues.push('PICKUP_LOCATION_REQUIRED');
    if (counts.dropoff && !journey?.locationId)
      issues.push('DROPOFF_LOCATION_REQUIRED');
    if (
      counts.pickup &&
      journey?.pointId &&
      !(await this.validPlace(tx, 'pickup', journey.pointId))
    )
      issues.push('PICKUP_LOCATION_INVALID');
    if (
      counts.dropoff &&
      journey?.locationId &&
      !(await this.validPlace(tx, 'dropoff', journey.locationId))
    )
      issues.push('DROPOFF_LOCATION_INVALID');
    return {
      journey,
      counts,
      issues,
      needsAdjustment: issues.length > 0,
      ...(journey
        ? { guidance: returnGuidance(journey, this.clock.now()) }
        : {}),
    };
  }
}
