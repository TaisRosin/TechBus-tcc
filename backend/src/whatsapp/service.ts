import { timingSafeEqual } from 'node:crypto';
import { AccessError } from '../access/domain/access';
import type { Clock } from '../shared/time/clock';
import { operationalDate } from '../shared/time/operational-date';
import { page } from '../registry/domain/locations';
import type { EvolutionConfig } from './config';
import { projectWebhook } from './domain';
import { WhatsAppStore } from './store';

export class WhatsAppService {
  constructor(
    private readonly store: WhatsAppStore,
    private readonly clock: Clock,
    private readonly config?: EvolutionConfig,
  ) {}
  async receive(secret: unknown, body: unknown): Promise<{ accepted: true }> {
    if (!this.config) throw new AccessError('WHATSAPP_DISABLED', 503);
    const supplied =
      typeof secret === 'string' ? Buffer.from(secret) : Buffer.alloc(0);
    const expected = Buffer.from(this.config.webhookSecret);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    )
      throw new AccessError('UNAUTHENTICATED', 401);
    const event = projectWebhook(body, this.config.instance);
    if (event)
      await this.store.receive(this.config.instance, event, this.clock);
    return { accepted: true };
  }
  current(actor: string, query: unknown) {
    const { limit, offset } = page(query);
    return this.store.transaction(async (m) => {
      const user = (
        await m.query<{ active: boolean; role: string }[]>(
          'SELECT active,role FROM app.team_users WHERE subject=$1 FOR SHARE',
          [actor],
        )
      )[0];
      if (!user?.active || !['admin', 'operator'].includes(user.role))
        throw new AccessError('FORBIDDEN', 403);
      return m.query<unknown[]>(
        `SELECT e.id,e.kind,e.received_at AS "receivedAt",e.phone,e.text_body AS text,e.provider_status AS "providerStatus",e.disposition,e.conflict,
        CASE WHEN j.event_id IS NULL THEN NULL ELSE json_build_object('state',j.state,'code',j.code,'startedAt',j.started_at,'finishedAt',j.finished_at) END AS processing,
        CASE WHEN c.event_id IS NULL THEN NULL ELSE json_build_object('state',c.state,'code',c.code,'purpose',c.purpose,'text',c.text,'answerEventId',c.answer_event_id) END AS clarification,
        CASE WHEN ack.event_id IS NULL THEN NULL ELSE json_build_object('state',ack.state,'text',ack.text,'journeyVersion',ack.journey_version,'deliveryCode',ack.delivery_code,'dispatchStartedAt',ack.dispatch_started_at,'dispatchFinishedAt',ack.dispatch_finished_at) END AS acknowledgement,
        a.attempt_id AS "attemptId",CASE WHEN i.event_id IS NULL THEN NULL ELSE json_build_object('state',i.state,'source',i.source,'proposal',CASE WHEN e.conflict THEN NULL ELSE i.proposal END,'code',CASE WHEN e.conflict THEN 'EVENT_CONFLICT' ELSE i.code END,'startedAt',i.started_at,'finishedAt',i.finished_at) END AS interpretation
        FROM app.whatsapp_events e LEFT JOIN app.conversation_jobs j ON j.event_id=e.id LEFT JOIN app.journey_acknowledgements ack ON ack.event_id=e.id LEFT JOIN app.message_interpretations i ON i.event_id=e.id LEFT JOIN app.whatsapp_attempts a
        ON e.kind='status' AND a.instance=e.instance AND e.external_id=a.provider_id||':'||e.provider_status
        LEFT JOIN app.conversation_clarifications c ON c.event_id=COALESCE(i.context_event_id,e.id)
        WHERE e.received_at >= ($1::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND e.received_at < (($1::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        ORDER BY e.received_at,e.id LIMIT $2 OFFSET $3`,
        [operationalDate(this.clock.now()), limit, offset],
      );
    });
  }
}
