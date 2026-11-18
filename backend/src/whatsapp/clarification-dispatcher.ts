import type { Clock } from '../shared/time/clock';
import {
  beforeDeadline,
  validQuestion,
  type Clarification,
} from '../interpretation/context-store';
import type { EvolutionConfig } from './config';
import { WhatsAppStore } from './store';
import { PostgresRegistryStore } from '../registry/infrastructure/postgres-registry-store';

export class ClarificationDispatcher {
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private stopped = false;
  constructor(
    private readonly store: WhatsAppStore,
    private readonly clock: Clock,
    private readonly config?: EvolutionConfig,
    private readonly transport: typeof fetch = fetch,
  ) {}
  onModuleInit() {
    if (this.config?.sendEnabled)
      this.timer = setInterval(() => {
        if (!this.running && !this.stopped)
          this.running = this.runOnce()
            .catch(() => {})
            .finally(() => {
              this.running = undefined;
            });
      }, 5000);
  }
  async onModuleDestroy() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }
  async runOnce(): Promise<void> {
    const config = this.config;
    if (!config?.sendEnabled || !config.testPhones.length) return;
    for (let n = 0; n < 10 && !this.stopped; n++) {
      const reserved = await this.store.transaction(async (m) => {
        await m.query('SELECT pg_advisory_xact_lock(82406,1)');
        await PostgresRegistryStore.transactionPort(m).places.lock();
        const [q] = await m.query<Clarification[]>(
          "SELECT *,date::text AS date FROM app.conversation_clarifications WHERE state='prepared' AND instance=$1 AND phone=ANY($2::text[]) ORDER BY created_at,event_id LIMIT 1 FOR UPDATE",
          [config.instance, config.testPhones],
        );
        if (!q) return null;
        const [newer] = await m.query<{ exists: boolean }[]>(
          `SELECT EXISTS(SELECT 1 FROM app.journey_receipts r WHERE r.student_id=$1 AND r.date=$2::date AND r.sequence>(SELECT sequence FROM app.journey_receipts WHERE id=$3 AND student_id=$1)) AS exists`,
          [q.student_id, q.date, q.event_id],
        );
        if (
          !beforeDeadline(this.clock.now()) ||
          newer.exists ||
          !(await validQuestion(m, q, this.clock.now()))
        ) {
          await m.query(
            "UPDATE app.conversation_clarifications SET state='superseded',code='CONTEXT_CHANGED' WHERE event_id=$1",
            [q.event_id],
          );
          return { question: null };
        }
        await m.query(
          "UPDATE app.conversation_clarifications SET state='sending',dispatch_started_at=$2,code='DISPATCHING' WHERE event_id=$1",
          [q.event_id, this.clock.now()],
        );
        return { question: q };
      });
      if (!reserved) return;
      if (!reserved.question) continue;
      const q = reserved.question;
      let providerId: string | null = null;
      try {
        const response = await this.transport(
          config.baseUrl +
            '/message/sendText/' +
            encodeURIComponent(config.instance),
          {
            method: 'POST',
            headers: {
              Origin: config.baseUrl,
              apikey: config.apiKey,
              'Content-Type': 'application/json',
            },
            redirect: 'error',
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({
              number: q.phone.slice(1),
              text: q.text,
              linkPreview: false,
            }),
          },
        );
        if (response.ok && response.body) {
          const reader = response.body.getReader(),
            chunks: Uint8Array[] = [];
          let size = 0;
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            size += part.value.length;
            if (size > 8192) {
              await reader.cancel();
              throw new Error('RESPONSE_TOO_LARGE');
            }
            chunks.push(part.value);
          }
          const value: unknown = JSON.parse(
            Buffer.concat(chunks).toString('utf8'),
          );
          if (
            value &&
            typeof value === 'object' &&
            'key' in value &&
            value.key &&
            typeof value.key === 'object' &&
            'id' in value.key &&
            typeof value.key.id === 'string' &&
            value.key.id.length > 0 &&
            value.key.id.length <= 180 &&
            ![...value.key.id].some((c) => c.charCodeAt(0) < 32)
          )
            providerId = value.key.id;
        }
      } catch {
        /* An uncertain dispatch is never retried automatically. */
      }
      await this.store.transaction(async (m) => {
        await m.query(
          "UPDATE app.conversation_clarifications SET state=$2,provider_id=$3,dispatch_finished_at=$4,code=$5 WHERE event_id=$1 AND state='sending'",
          [
            q.event_id,
            providerId ? 'sent' : 'unknown',
            providerId,
            this.clock.now(),
            providerId ? 'PROVIDER_ACCEPTED' : 'DELIVERY_UNCERTAIN',
          ],
        );
      });
    }
  }
}
