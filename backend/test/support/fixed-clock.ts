import type { Clock } from '../../src/shared/time/clock';
export class FixedClock implements Clock {
  constructor(private readonly instant: string) {}
  now(): Date {
    return new Date(this.instant);
  }
}
