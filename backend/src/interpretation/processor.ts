import type { Clock } from '../shared/time/clock';
import { operationalDate } from '../shared/time/operational-date';
import { WhatsAppStore } from '../whatsapp/store';
import { InterpretationService } from './service';
import { InterpretationApplication } from './application';

export class ConversationProcessor {
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private stopped = false;
  constructor(
    private readonly store: WhatsAppStore,
    private readonly clock: Clock,
    private readonly interpreter: InterpretationService,
    private readonly application: InterpretationApplication,
    private readonly instance: string,
    private readonly enabled = false,
  ) {}
  onModuleInit() {
    if (this.enabled)
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
    for (let n = 0; n < 10 && !this.stopped; n++) {
      const id = await this.store.transaction(async (m) => {
        await m.query('SELECT pg_advisory_xact_lock(82406,1)');
        const [event] = await m.query<{ id: string }[]>(
          `SELECT e.id FROM app.whatsapp_events e
     JOIN app.students s ON s.id=e.student_id AND s.active
     LEFT JOIN app.conversation_jobs j ON j.event_id=e.id
     WHERE e.instance=$1 AND e.kind='message' AND j.event_id IS NULL
       AND (e.received_at AT TIME ZONE 'America/Sao_Paulo')::date=$2::date
     ORDER BY (e.original_order->>'seconds')::numeric NULLS LAST,e.received_at,e.id LIMIT 1`,
          [this.instance, operationalDate(this.clock.now())],
        );
        if (!event) return null;
        await m.query(
          "INSERT INTO app.conversation_jobs(event_id,state,code,started_at) VALUES($1,'processing','PROCESSING',$2)",
          [event.id, this.clock.now()],
        );
        return event.id;
      });
      if (!id) return;
      let code = 'PROCESSING_FAILED';
      try {
        const interpretation = await this.interpreter.interpretReceived(id);
        code = interpretation.code;
        if (interpretation.state === 'completed' && interpretation.proposal) {
          const result = await this.application.applyReceived(id);
          code =
            result.code ??
            (result.status === 'applied' ? 'APPLIED' : 'PROCESSING_PENDING');
        }
      } catch {
        code = 'PROCESSING_FAILED';
        /* Do not persist secrets or retry an uncertain external call. */
      }
      await this.store.transaction(async (m) => {
        await m.query(
          "UPDATE app.conversation_jobs SET state='completed',code=$2,finished_at=$3 WHERE event_id=$1",
          [id, code, this.clock.now()],
        );
      });
    }
  }
}
