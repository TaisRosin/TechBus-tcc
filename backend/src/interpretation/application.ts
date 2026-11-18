import { AccessError } from '../access/domain/access';
import { exact, uuid } from '../registry/domain/registry';
import { PostgresRegistryStore } from '../registry/infrastructure/postgres-registry-store';
import { JourneyService } from '../journey/application/journey.service';
import type { Clock } from '../shared/time/clock';
import { operationalDate } from '../shared/time/operational-date';
import { WhatsAppStore } from '../whatsapp/store';
import {
  parseProviderOrder,
  compareProviderOrder,
} from '../whatsapp/provider-order';
import { fixedProposal, quotedContext } from './context-store';
import { prepareAcknowledgement } from './acknowledgement-store';

interface OrderedEvent {
  id: string;
  student_id: string;
  receipt_id: string;
  received_at: Date;
  original_order: unknown;
  conflict: boolean;
  sequence: number;
  result: { status: string; code?: string } | null;
}
export class InterpretationApplication {
  constructor(
    private readonly store: WhatsAppStore,
    private readonly clock: Clock,
  ) {}
  apply(actor: string, id: string, body: unknown) {
    return this.run(actor, id, body);
  }
  applyReceived(id: string) {
    return this.run(null, id, {});
  }
  private async run(actor: string | null, id: string, body: unknown) {
    uuid(id);
    exact(body, []);
    return this.store.transaction(async (m) => {
      const tx = PostgresRegistryStore.transactionPort(m);
      if (actor !== null) await tx.authorize(actor);
      await m.query('SELECT pg_advisory_xact_lock(82406,1)');
      await tx.places.lock();
      const events = await m.query<OrderedEvent[]>(
        `SELECT e.id,e.student_id,e.receipt_id,e.received_at,e.original_order,e.conflict,r.sequence,r.result
        FROM app.whatsapp_events e JOIN app.journey_receipts r ON r.id=e.receipt_id AND r.student_id=e.student_id WHERE e.id=$1`,
        [id],
      );
      const event = events[0];
      if (
        !event ||
        operationalDate(event.received_at) !== operationalDate(this.clock.now())
      )
        throw new AccessError('NOT_FOUND', 404);
      const pending = (code: string) => ({ status: 'pending', code });
      if (event.conflict) return pending('EVENT_CONFLICT');
      if (!(await tx.student(event.student_id, true))?.active)
        return pending('STUDENT_INACTIVE');
      if (event.result && event.result.code !== 'ORDER_UNCERTAIN')
        return event.result;
      const [interpretation] = await m.query<
        { state: string; proposal: unknown; context_event_id: string | null }[]
      >(
        'SELECT state,proposal,context_event_id FROM app.message_interpretations WHERE event_id=$1',
        [id],
      );
      if (interpretation?.state !== 'completed' || !interpretation.proposal)
        return pending('INTERPRETATION_PENDING');
      const context = interpretation.context_event_id
        ? await quotedContext(m, id, this.clock.now())
        : null;
      if (
        interpretation.context_event_id &&
        (!context?.proposal ||
          context.question.event_id !== interpretation.context_event_id)
      )
        return pending('CONTEXT_REVIEW_REQUIRED');
      const translated = await fixedProposal(
        m,
        context?.proposal ?? interpretation.proposal,
      );
      if (!translated.command) return pending(translated.code!);
      const evidence = parseProviderOrder(event.original_order);
      if (
        !evidence ||
        evidence.seconds * 1000 > event.received_at.getTime() ||
        operationalDate(new Date(evidence.seconds * 1000)) !==
          operationalDate(event.received_at)
      )
        return pending('ORDER_UNCERTAIN');
      const peers = await m.query<OrderedEvent[]>(
        `SELECT e.id,e.original_order,e.conflict,r.result,r.sequence
        FROM app.whatsapp_events e JOIN app.journey_receipts r ON r.id=e.receipt_id AND r.student_id=e.student_id
        WHERE e.student_id=$1 AND r.date=$2::date AND e.id<>$3`,
        [event.student_id, operationalDate(event.received_at), id],
      );
      for (const peer of peers) {
        if (peer.conflict) return pending('EVENT_CONFLICT');
        const order = compareProviderOrder(
          event.original_order,
          peer.original_order,
        );
        if (order === 'uncertain') return pending('ORDER_UNCERTAIN');
        if (order === 'older' && peer.result?.status === 'applied')
          return pending('STALE_PROVIDER_MESSAGE');
        if (
          order === 'newer' &&
          peer.id !== context?.question.event_id &&
          (!peer.result || peer.result.status === 'pending')
        )
          return pending('ORDER_PREDECESSOR_PENDING');
      }
      // Keep administrative revisions and arrival-sequence safeguards. Never renumber receipts.
      const current = await tx.journeys.get(
        event.student_id,
        operationalDate(event.received_at),
      );
      if (current && current.lastSequence >= event.sequence)
        return pending('REVISION_REVIEW_REQUIRED');
      if (current) {
        const [internalRevision] = await m.query<{ received_at: Date }[]>(
          `SELECT r.received_at FROM app.journey_receipts r WHERE r.student_id=$1 AND r.sequence=$2
           AND NOT EXISTS(SELECT 1 FROM app.whatsapp_events e WHERE e.receipt_id=r.id AND e.student_id=r.student_id)`,
          [event.student_id, current.lastSequence],
        );
        if (
          internalRevision &&
          evidence.seconds * 1000 <= internalRevision.received_at.getTime()
        )
          return pending('REVISION_REVIEW_REQUIRED');
      }
      await m.query('SAVEPOINT context_application');
      if (context)
        await m.query(
          'UPDATE app.journey_receipts SET result=$2::jsonb WHERE id=$1 AND student_id=$3',
          [
            context.question.event_id,
            JSON.stringify({ status: 'rejected', code: 'CLARIFIED' }),
            event.student_id,
          ],
        );
      await m.query(
        "UPDATE app.journey_receipts SET ordering='received',result=NULL WHERE id=$1 AND student_id=$2",
        [event.receipt_id, event.student_id],
      );
      const service = new JourneyService(
        { transaction: (work) => work(tx) },
        this.clock,
      );
      const result = await service.apply(
        event.student_id,
        event.receipt_id,
        translated.command,
      );
      if (result.status === 'applied') {
        if (context)
          await m.query(
            "UPDATE app.conversation_clarifications SET state='answered',answer_event_id=$2,code='ANSWER_APPLIED' WHERE event_id=$1",
            [context.question.event_id, id],
          );
        const journey = await tx.journeys.get(
          event.student_id,
          operationalDate(event.received_at),
        );
        if (!journey) throw new Error('APPLIED_JOURNEY_MISSING');
        await prepareAcknowledgement(m, tx, id, journey, this.clock.now());
      } else if (context) {
        await m.query('ROLLBACK TO SAVEPOINT context_application');
        await m.query(
          'UPDATE app.journey_receipts SET result=$2::jsonb WHERE id=$1 AND student_id=$3',
          [id, JSON.stringify(result), event.student_id],
        );
      }
      await m.query(
        'UPDATE app.message_interpretations SET code=$2 WHERE event_id=$1',
        [id, result.code ?? 'APPLIED'],
      );
      return result;
    });
  }
}
