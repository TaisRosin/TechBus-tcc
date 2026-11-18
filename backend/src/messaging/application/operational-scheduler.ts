import type { MessageService } from './message.service';

// Business time, eligibility and durable reservations stay in MessageService.
export class OperationalScheduler {
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private stopped = false;
  constructor(
    private readonly messages: Pick<MessageService, 'tick' | 'dispatch'>,
    private readonly enabled = false,
    private readonly sendEnabled = false,
    private readonly allowedPhones: readonly string[] = [],
    private readonly report: (code: string) => void = (code) =>
      console.warn(code),
  ) {}
  onModuleInit(): void {
    if (!this.enabled || this.stopped || this.timer) return;
    void this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, 30000);
  }
  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }
  runOnce(): Promise<void> {
    if (!this.enabled || this.stopped) return Promise.resolve();
    return (this.running ??= this.cycle()
      .catch(() => {
        this.report('SCHEDULER_CYCLE_FAILED');
      })
      .finally(() => {
        this.running = undefined;
      }));
  }
  private async cycle(): Promise<void> {
    const result = await this.messages.tick();
    if (result.failures.length) this.report('SCHEDULER_PREPARATION_FAILED');
    if (!this.sendEnabled || !this.allowedPhones.length) return;
    for (const id of result.ids) {
      if (this.stopped) break;
      try {
        await this.messages.dispatch(id, this.allowedPhones);
      } catch {
        this.report('SCHEDULER_DISPATCH_FAILED');
      }
    }
  }
}
