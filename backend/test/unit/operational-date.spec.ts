import { operationalDate } from '../../src/shared/time/operational-date';

describe('Operational date in Sao Paulo', () => {
  it.each([
    ['2026-10-22T02:59:59Z', '2026-10-21'],
    ['2026-10-22T03:00:00Z', '2026-10-22'],
  ])('maps %s to %s independently of host timezone', (instant, expected) => {
    expect(operationalDate(new Date(instant))).toBe(expected);
  });
});
