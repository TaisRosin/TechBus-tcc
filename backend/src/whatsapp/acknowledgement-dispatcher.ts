import type { Clock } from '../shared/time/clock';
import { operationalDate } from '../shared/time/operational-date';
import { PostgresRegistryStore } from '../registry/infrastructure/postgres-registry-store';
import { acknowledgementSnapshot } from '../interpretation/acknowledgement-store';
import type { EvolutionConfig } from './config';
import { WhatsAppStore } from './store';
interface Reply {
  event_id: string;
  student_id: string;
  date: string;
  journey_version: number;
  phone: string;
  text: string;
  conflict: boolean;
}
export class AcknowledgementDispatcher {
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
    console.log(
      '[ACK] Inicializado. Envio habilitado:',
      this.config?.sendEnabled,
    );

    if (this.config?.sendEnabled) {
      this.timer = setInterval(() => {
        console.log('[ACK] Verificando confirmações pendentes...');

        if (!this.running && !this.stopped) {
          this.running = this.runOnce()
            .catch(() => {
              console.error('[ACK] DISPATCH_FAILED');
            })
            .finally(() => {
              this.running = undefined;
            });
        }
      }, 5000);
    }
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
        const tx = PostgresRegistryStore.transactionPort(m);
        await tx.places.lock();
        const [reply] = await m.query<Reply[]>(
          `SELECT a.*,a.date::text AS date,e.conflict FROM app.journey_acknowledgements a JOIN app.whatsapp_events e ON e.id=a.event_id
      WHERE a.state='prepared' AND e.instance=$1 AND a.phone=ANY($2::text[]) ORDER BY a.created_at,a.event_id LIMIT 1 FOR UPDATE OF a`,
          [config.instance, config.testPhones],
        );
        if (!reply) return null;
        const student = await tx.student(reply.student_id, true);
        const journey = await tx.journeys.get(reply.student_id, reply.date);
        const [newer] = await m.query<{ exists: boolean }[]>(
          `SELECT EXISTS(SELECT 1 FROM app.journey_receipts WHERE student_id=$1 AND date=$2::date AND sequence>$3) AS exists`,
          [reply.student_id, reply.date, journey?.lastSequence ?? 0],
        );
        const valid =
          !reply.conflict &&
          student?.active &&
          student.phone === reply.phone &&
          journey?.version === reply.journey_version &&
          reply.date === operationalDate(this.clock.now()) &&
          !newer.exists &&
          (await acknowledgementSnapshot(tx, journey, this.clock.now())) ===
            reply.text;
        if (!valid) {
          await m.query(
            "UPDATE app.journey_acknowledgements SET state='superseded',delivery_code='CONTEXT_CHANGED' WHERE event_id=$1",
            [reply.event_id],
          );
          return { reply: null };
        }
        await m.query(
          "UPDATE app.journey_acknowledgements SET state='sending',dispatch_started_at=$2,delivery_code='DISPATCHING' WHERE event_id=$1",
          [reply.event_id, this.clock.now()],
        );
        return { reply };
      });
      if (!reserved) return;
      if (!reserved.reply) continue;
      const reply = reserved.reply;
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
              number: reply.phone.slice(1),
              text: reply.text,
              linkPreview: false,
            }),
          },
        );
        if (response.ok && response.body) {
          const reader = response.body.getReader();
          let size = 0;
          const chunks: Uint8Array[] = [];
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
        /* Dispatch may already have succeeded. Never blindly resend. */
      }
      await this.store.transaction(async (m) => {
        await m.query(
          `UPDATE app.journey_acknowledgements SET state=$2,provider_id=$3,dispatch_finished_at=$4,delivery_code=$5 WHERE event_id=$1 AND state='sending'`,
          [
            reply.event_id,
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
