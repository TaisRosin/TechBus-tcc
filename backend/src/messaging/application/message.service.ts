import { randomUUID } from 'node:crypto';
import { AccessError } from '../../access/domain/access';
import {
  RegistryStore,
  type RegistryTransaction,
} from '../../registry/application/ports';
import { exact, revision, uuid } from '../../registry/domain/registry';
import { page } from '../../registry/domain/locations';
import { evaluateEligibility } from '../../registry/domain/calendar';
import { operationalDate } from '../../shared/time/operational-date';
import type { Clock } from '../../shared/time/clock';
import { JourneyService } from '../../journey/application/journey.service';
import { emptyLegs } from '../../journey/domain/journey';
import { localHour, returnGuidance } from '../../journey/domain/closing';
import {
  latestSlot,
  pendingText,
  type OutgoingMessage,
  type Slot,
} from '../domain/messages';
import {
  DisabledMessageSender,
  MessageSender,
  type SendOutcome,
  type SendRequest,
} from './ports';

export class MessageService {
  constructor(
    private readonly store: RegistryStore,
    private readonly clock: Clock,
    private readonly sender: MessageSender,
    private readonly journeys: JourneyService,
  ) {}
  async current(actor: string, query: unknown) {
    const { limit, offset } = page(query);
    return this.store.transaction(async (tx) => {
      await tx.authorize(actor);
      return tx.messages.list(operationalDate(this.clock.now()), limit, offset);
    });
  }
  async prepare(studentId: string): Promise<OutgoingMessage | null> {
    uuid(studentId);
    return this.store.transaction(async (tx) => {
      await tx.places.lock();
      const now = this.clock.now(),
        date = operationalDate(now),
        slot = localHour(now) >= 17 ? 17 : latestSlot(now);
      if (slot === null) return null;
      const content = await this.content(tx, studentId, date, slot, now);
      await tx.messages.skipEarlier(studentId, date, slot);
      const existing = await tx.messages.find(studentId, date, slot);
      if (existing) return existing;
      if (!content) return null;
      const message: OutgoingMessage = {
        id: randomUUID(),
        studentId,
        date,
        slot,
        status: 'ready',
        version: 1,
        ...content,
        code: null,
      };
      await tx.messages.save(message, true);
      return message;
    });
  }
  async tick() {
    const date = operationalDate(this.clock.now());
    const failures: { studentId: string; code: string }[] = [];
    if (localHour(this.clock.now()) >= 17) {
      let after: string | undefined;
      do {
        const batch = await this.journeys.closeDay(date, after);
        for (const result of batch.results)
          if (result.status === 'failed')
            failures.push({ studentId: result.studentId, code: result.code });
        after = batch.nextCursor ?? undefined;
      } while (after);
    }
    const ids: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const students = await this.store.transaction((tx) =>
        tx.students(100, offset),
      );
      for (const student of students) {
        if (operationalDate(this.clock.now()) !== date)
          return { ids, failures };
        try {
          const message = await this.prepare(student.id);
          if (message?.status === 'ready') ids.push(message.id);
        } catch (error) {
          failures.push({
            studentId: student.id,
            code:
              error instanceof AccessError
                ? error.code
                : 'PREPARATION_UNAVAILABLE',
          });
        }
      }
      if (students.length < 100) break;
    }
    return { ids, failures };
  }
  dispatch(id: string, allowedPhones?: readonly string[]) {
    return this.send(id, undefined, allowedPhones);
  }
  retry(actor: string, id: string, input: unknown) {
    const { expectedVersion } = exact(input, ['expectedVersion']);
    return this.send(id, { actor, version: revision(expectedVersion) });
  }
  private async send(
    id: string,
    retry?: { actor: string; version: number },
    allowedPhones?: readonly string[],
  ): Promise<OutgoingMessage> {
    uuid(id);
    const claimed = await this.store.transaction(async (tx) => {
      if (retry) await tx.authorize(retry.actor);
      await tx.places.lock();
      const initial = await tx.messages.get(id);
      if (
        !initial ||
        (retry && initial.date !== operationalDate(this.clock.now()))
      )
        throw new AccessError('MESSAGE_NOT_FOUND', 404);
      const content = await this.content(
        tx,
        initial.studentId,
        initial.date,
        initial.slot,
        this.clock.now(),
      );
      const message = (await tx.messages.get(id, true))!;
      if (retry) {
        if (message.version !== retry.version)
          throw new AccessError('VERSION_CONFLICT', 409);
        if (message.status !== 'failed')
          throw new AccessError('RETRY_NOT_ALLOWED', 409);
      } else if (message.status !== 'ready') return { message, request: null };
      if (content && allowedPhones && !allowedPhones.includes(content.phone))
        return { message, request: null };
      if (!content) {
        message.status = 'skipped';
        message.code = 'NO_LONGER_RELEVANT';
        message.version++;
        await tx.messages.save(message);
        return { message, request: null };
      }
      Object.assign(message, content);
      message.status = 'sending';
      message.code = null;
      message.version++;
      const request: SendRequest = {
        attemptId: randomUUID(),
        messageId: id,
        ...content,
      };
      await tx.messages.save(message);
      await tx.messages.start(request, this.clock.now());
      return { message, request };
    });
    if (!claimed.request) return claimed.message;
    let outcome: SendOutcome,
      code: string | null = null;
    try {
      outcome = await this.sender.send(claimed.request);
      if (!outcome || !['sent', 'failed', 'unknown'].includes(outcome.status)) {
        outcome = { status: 'unknown' };
        code = 'INVALID_SENDER_RESULT';
      } else if (this.sender instanceof DisabledMessageSender)
        code = 'SENDER_NOT_CONFIGURED';
      else if (outcome.status !== 'sent')
        code =
          outcome.status === 'failed' ? 'DELIVERY_FAILED' : 'DELIVERY_UNKNOWN';
    } catch {
      outcome = { status: 'unknown' };
      code = 'DELIVERY_UNKNOWN';
    }
    return this.store.transaction(async (tx) => {
      const message = (await tx.messages.get(id, true))!;
      if (
        message.status !== 'sending' ||
        message.version !== claimed.message.version
      )
        throw new AccessError('MESSAGE_STATE_CONFLICT', 409);
      message.status = outcome.status;
      message.code = code;
      message.version++;
      await tx.messages.finish(
        claimed.request.attemptId,
        outcome.status,
        code,
        this.clock.now(),
      );
      await tx.messages.save(message);
      return message;
    });
  }
  private async content(
    tx: RegistryTransaction,
    id: string,
    date: string,
    slot: Slot,
    now: Date,
  ): Promise<{ phone: string; text: string } | null> {
    const student = await tx.student(id, true);
    if (!student || date !== operationalDate(now)) return null;
    const calendar = await tx.calendar(student.universityId, 'read');
    const journey = await tx.journeys.get(id, date);
    const snapshot = {
      student,
      calendar,
      contracts: await tx.contracts(id),
      exception:
        (await tx.exceptions(student.universityId, date, date))[0]?.operates ??
        null,
    };
    now = this.clock.now();
    if (date !== operationalDate(now)) return null;
    if (journey && journey.universityId !== student.universityId) return null;
    if (slot === 17) {
      if (
        localHour(now) < 17 ||
        !journey ||
        journey.dropoff.state !== 'confirmado' ||
        journey.dropoff.origin !== 'padrao_fechamento'
      )
        return null;
      const guidance = returnGuidance(journey, now);
      return guidance ? { phone: student.phone, text: guidance.text } : null;
    }
    if (latestSlot(now) !== slot) return null;
    const habitual = evaluateEligibility(
      snapshot,
      'consultation',
      now,
    ).eligible;
    const slotStart = new Date(
      `${date}T${String(slot).padStart(2, '0')}:00:00-03:00`,
    );
    if (
      !habitual &&
      !(
        slot !== 5 &&
        journey?.origin === 'extra' &&
        journey.studentInitiated &&
        journey.studentInitiatedAt &&
        journey.studentInitiatedAt <= slotStart &&
        evaluateEligibility(snapshot, 'request', now).eligible
      )
    )
      return null;
    const text = pendingText(journey ?? emptyLegs());
    if (!text) return null;
    const guidance = journey ? returnGuidance(journey, now) : null;
    return {
      phone: student.phone,
      text:
        guidance?.code === 'RETURN_DEFAULT_AT_17'
          ? `${text} ${guidance.text}`
          : text,
    };
  }
}
