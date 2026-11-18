import { OperationalScheduler } from '../../src/messaging/application/operational-scheduler';
import { readSchedulerEnabled } from '../../src/config/environment';

describe('Operational scheduler lifecycle', () => {
  const message = {
    id: 'message',
    studentId: 'student',
    date: '2026-11-06',
    slot: 5 as const,
    status: 'sent' as const,
    version: 1,
    phone: '+5549999999999',
    text: 'synthetic',
    code: null,
  };
  const fixture = () => ({
    tick: jest.fn(() => Promise.resolve({ ids: ['one', 'two'], failures: [] })),
    dispatch: jest.fn(() => Promise.resolve(message)),
  });
  it('requires a strict explicit opt-in', async () => {
    expect(readSchedulerEnabled({})).toBe(false);
    expect(
      readSchedulerEnabled({ OPERATIONS_SCHEDULER_ENABLED: 'false' }),
    ).toBe(false);
    expect(readSchedulerEnabled({ OPERATIONS_SCHEDULER_ENABLED: 'true' })).toBe(
      true,
    );
    expect(() =>
      readSchedulerEnabled({ OPERATIONS_SCHEDULER_ENABLED: 'yes' }),
    ).toThrow();
    const service = fixture(),
      runner = new OperationalScheduler(service);
    runner.onModuleInit();
    await runner.runOnce();
    await runner.onModuleDestroy();
    expect(service.tick).not.toHaveBeenCalled();
  });
  it('prepares and closes without reserving sends when delivery is disabled', async () => {
    const service = fixture();
    await new OperationalScheduler(service, true, false, [
      '+5549999999999',
    ]).runOnce();
    expect(service.tick).toHaveBeenCalledTimes(1);
    expect(service.dispatch).not.toHaveBeenCalled();
  });
  it('shares an in-flight cycle and passes the allowed contacts to dispatch', async () => {
    const service = fixture(),
      runner = new OperationalScheduler(service, true, true, [
        '+5549999999999',
      ]);
    await Promise.all([runner.runOnce(), runner.runOnce()]);
    expect(service.tick).toHaveBeenCalledTimes(1);
    expect(service.dispatch.mock.calls).toEqual([
      ['one', ['+5549999999999']],
      ['two', ['+5549999999999']],
    ]);
  });
  it('continues after one dispatch failure without leaking its message', async () => {
    const service = fixture(),
      report = jest.fn();
    service.dispatch.mockRejectedValueOnce(new Error('private failure'));
    await new OperationalScheduler(
      service,
      true,
      true,
      ['+5549999999999'],
      report,
    ).runOnce();
    expect(service.dispatch).toHaveBeenCalledTimes(2);
    expect(report.mock.calls).toEqual([['SCHEDULER_DISPATCH_FAILED']]);
  });
  it('retries a failed preparation cycle later and stops after destruction', async () => {
    const service = fixture(),
      report = jest.fn(),
      runner = new OperationalScheduler(service, true, false, [], report);
    service.tick.mockRejectedValueOnce(new Error('private'));
    await runner.runOnce();
    await runner.runOnce();
    expect(report).toHaveBeenCalledWith('SCHEDULER_CYCLE_FAILED');
    expect(service.tick).toHaveBeenCalledTimes(2);
    await runner.onModuleDestroy();
    await runner.runOnce();
    expect(service.tick).toHaveBeenCalledTimes(2);
  });
  it('polls immediately and every thirty seconds only while enabled', async () => {
    jest.useFakeTimers();
    const service = fixture(),
      runner = new OperationalScheduler(service, true);
    try {
      runner.onModuleInit();
      await jest.advanceTimersByTimeAsync(0);
      expect(service.tick).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(30000);
      expect(service.tick).toHaveBeenCalledTimes(2);
      await runner.onModuleDestroy();
      await jest.advanceTimersByTimeAsync(60000);
      expect(service.tick).toHaveBeenCalledTimes(2);
    } finally {
      await runner.onModuleDestroy();
      jest.useRealTimers();
    }
  });
  it('does not start another send after shutdown while preparation is in flight', async () => {
    const service = fixture();
    let release!: () => void;
    service.tick.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ ids: ['one'], failures: [] });
        }),
    );
    const runner = new OperationalScheduler(service, true, true, [
      '+5549999999999',
    ]);
    const cycle = runner.runOnce(),
      shutdown = runner.onModuleDestroy();
    release();
    await Promise.all([cycle, shutdown]);
    expect(service.dispatch).not.toHaveBeenCalled();
  });
});
