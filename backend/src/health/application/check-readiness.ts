import type { Clock } from '../../shared/time/clock';
import type { DatabaseProbe } from './ports/database-probe';
export interface ReadinessResult {
  status: 'ok' | 'unavailable';
  checkedAt: string;
}
export class CheckReadiness {
  constructor(
    private readonly clock: Clock,
    private readonly database: DatabaseProbe,
  ) {}
  async execute(): Promise<ReadinessResult> {
    let available = false;
    try {
      available = await this.database.check();
    } catch {
      /* Infrastructure details stay private. */
    }
    return {
      status: available ? 'ok' : 'unavailable',
      checkedAt: this.clock.now().toISOString(),
    };
  }
}
