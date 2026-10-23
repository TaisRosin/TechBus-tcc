import { CheckReadiness } from '../../src/health/application/check-readiness';
import { FixedClock } from '../support/fixed-clock';

describe('Readiness at a controlled instant', () => {
  it('returns the same time and state on repeated calls', async () => {
    const useCase = new CheckReadiness(
      new FixedClock('2026-10-22T20:00:00.000Z'),
      { check: () => Promise.resolve(true) },
    );
    expect(await useCase.execute()).toEqual({
      status: 'ok',
      checkedAt: '2026-10-22T20:00:00.000Z',
    });
    expect(await useCase.execute()).toEqual({
      status: 'ok',
      checkedAt: '2026-10-22T20:00:00.000Z',
    });
  });
  it('uses the injected clock also when persistence is unavailable', async () => {
    const useCase = new CheckReadiness(
      new FixedClock('2026-10-23T03:00:00.000Z'),
      { check: () => Promise.resolve(false) },
    );
    expect(await useCase.execute()).toEqual({
      status: 'unavailable',
      checkedAt: '2026-10-23T03:00:00.000Z',
    });
  });
  it('does not expose unexpected infrastructure errors', async () => {
    const useCase = new CheckReadiness(
      new FixedClock('2026-10-22T20:00:00.000Z'),
      { check: () => Promise.reject(new Error('secret-connection')) },
    );
    expect(await useCase.execute()).toEqual({
      status: 'unavailable',
      checkedAt: '2026-10-22T20:00:00.000Z',
    });
  });
});
