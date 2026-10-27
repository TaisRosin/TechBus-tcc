import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import {
  RegistryStore,
  type RegistryTransaction,
} from '../../src/registry/application/ports';
import { RegistryService } from '../../src/registry/application/registry.service';
import { JourneyService } from '../../src/journey/application/journey.service';

// Faults decorate a public persistence port inside the real PostgreSQL transaction.
// They do not replace the database or inspect private service state.
class FaultStore extends RegistryStore {
  constructor(
    private readonly actual: RegistryStore,
    private readonly decorate: (tx: RegistryTransaction) => RegistryTransaction,
  ) {
    super();
  }
  transaction<T>(work: (tx: RegistryTransaction) => Promise<T>): Promise<T> {
    return this.actual.transaction((tx) => work(this.decorate(tx)));
  }
}
describe('Journey durability and recovery in isolated PostgreSQL', () => {
  let source: DataSource,
    store: PostgresRegistryStore,
    otherStore: PostgresRegistryStore;
  let service: JourneyService,
    other: JourneyService,
    ownsCalendar = false;
  let instant = '2026-10-24T19:59:59.000Z';
  const clock = { now: () => new Date(instant) },
    actor = randomUUID(),
    ids: string[] = [];
  const student = async () => {
    const created = await new RegistryService(store).createStudent(actor, {
      name: 'Resiliência sintética',
      phone: `+55469${randomInt(10000000, 99999999)}`,
      universityId: 'unimater',
      habitualDays: [],
      contract: { startDate: '2026-10-01', endDate: '2026-12-31' },
    });
    ids.push(created.student.id);
    return created.student.id;
  };
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    const config = await source.query<
      { days: number[] | null; version: number }[]
    >(
      "SELECT days,version FROM app.university_calendars WHERE university_id='unimater'",
    );
    const exceptions = await source.query<unknown[]>(
      "SELECT 1 FROM app.calendar_exceptions WHERE university_id='unimater'",
    );
    if (config[0].days !== null || config[0].version !== 1 || exceptions.length)
      throw new Error('Existing calendar preserved');
    ownsCalendar = true;
    await source.query(
      "UPDATE app.university_calendars SET days=ARRAY[0,1,2,3,4,5,6]::smallint[] WHERE university_id='unimater'",
    );
    await source.query(
      "INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,'operator',true)",
      [actor],
    );
    store = new PostgresRegistryStore(readEnvironment(env).database);
    otherStore = new PostgresRegistryStore(readEnvironment(env).database);
    service = new JourneyService(store, clock);
    other = new JourneyService(otherStore, clock);
  });
  beforeEach(() => {
    instant = '2026-10-24T19:59:59.000Z';
  });
  afterAll(async () => {
    await store?.close();
    await otherStore?.close();
    if (source?.isInitialized) {
      for (const table of ['journey_receipts', 'daily_journeys', 'contracts'])
        await source.query(
          `DELETE FROM app.${table} WHERE student_id=ANY($1::uuid[])`,
          [ids],
        );
      await source.query('DELETE FROM app.students WHERE id=ANY($1::uuid[])', [
        ids,
      ]);
      await source.query('DELETE FROM app.team_users WHERE id=$1', [actor]);
      if (ownsCalendar)
        await source.query(
          "UPDATE app.university_calendars SET days=NULL,version=1 WHERE university_id='unimater'",
        );
      await source.destroy();
    }
  });
  it('does not preserve an arrival time or consume identity when receipt persistence rolls back', async () => {
    const id = await student(),
      event = randomUUID();
    const broken = new JourneyService(
      new FaultStore(store, (tx) => ({
        ...tx,
        journeys: {
          ...tx.journeys,
          receive: async (r) => {
            await tx.journeys.receive(r);
            throw new Error('Simulated interruption before commit');
          },
        },
      })),
      clock,
    );
    await expect(broken.receive(id, event)).rejects.toMatchObject({
      code: 'REGISTRY_UNAVAILABLE',
      message: 'REGISTRY_UNAVAILABLE',
    });
    instant = '2026-10-24T20:00:00Z';
    const retried = await other.receive(id, event);
    expect(retried.sequence).toBe(1);
    expect(retried.receivedAt.toISOString()).toBe('2026-10-24T20:00:00.000Z');
    expect(await other.apply(id, event, { kind: 'going' })).toMatchObject({
      status: 'rejected',
      code: 'DEADLINE_PASSED',
    });
    expect((await service.today(actor, id)).journey).toBeNull();
  });
  it('routes an unordered arrival to a visible pending state without overwriting valid demand', async () => {
    const id = await student(),
      initial = await service.receive(id, randomUUID());
    await service.apply(id, initial.id, { kind: 'going' });
    const pending = await service.receiveUnordered(id, randomUUID());
    expect(pending.ordering).toBe('uncertain');
    expect(await other.apply(id, pending.id, { kind: 'not_going' })).toEqual({
      status: 'pending',
      code: 'ORDER_UNCERTAIN',
    });
    expect((await other.receive(id, pending.id, 'received')).ordering).toBe(
      'uncertain',
    );
    const view = await service.today(actor, id);
    expect(view.counts).toEqual({ pickup: 1, dropoff: 1 });
    expect(view.pending).toContain('ORDER_UNCERTAIN');
  });
  it('rolls back both state and result when failure occurs after saving them, then retries exactly once', async () => {
    const id = await student(),
      receipt = await service.receive(id, randomUUID());
    const broken = new JourneyService(
      new FaultStore(store, (tx) => ({
        ...tx,
        journeys: {
          ...tx.journeys,
          finish: async (studentId, event, result) => {
            await tx.journeys.finish(studentId, event, result);
            throw new Error('Simulated result failure');
          },
        },
      })),
      clock,
    );
    await expect(
      broken.apply(id, receipt.id, { kind: 'going' }),
    ).rejects.toMatchObject({ code: 'REGISTRY_UNAVAILABLE' });
    expect((await other.today(actor, id)).journey).toBeNull();
    expect((await other.receive(id, receipt.id)).result).toBeNull();
    expect(await other.apply(id, receipt.id, { kind: 'going' })).toEqual({
      status: 'applied',
      version: 1,
    });
    expect(await service.apply(id, receipt.id, { kind: 'not_going' })).toEqual({
      status: 'applied',
      version: 1,
    });
    expect((await service.today(actor, id)).counts).toEqual({
      pickup: 1,
      dropoff: 1,
    });
  });
  it('atomically rolls back an ordinary response and the pending cancellation it settles', async () => {
    const id = await student(),
      initial = await service.receive(id, randomUUID());
    instant = '2026-10-24T20:05:00Z';
    const cancel = await service.receive(id, randomUUID());
    expect(
      await service.apply(id, cancel.id, { kind: 'cancel_return' }),
    ).toMatchObject({ status: 'pending', code: 'AWAITING_TIMELY_COMMAND' });
    const broken = new JourneyService(
      new FaultStore(store, (tx) => ({
        ...tx,
        journeys: {
          ...tx.journeys,
          finish: async (studentId, event, result) => {
            await tx.journeys.finish(studentId, event, result);
            if (event === cancel.id)
              throw new Error('Simulated reconciliation failure');
          },
        },
      })),
      clock,
    );
    await expect(
      broken.apply(id, initial.id, { kind: 'going' }),
    ).rejects.toMatchObject({ code: 'REGISTRY_UNAVAILABLE' });
    expect((await other.today(actor, id)).journey).toBeNull();
    expect((await other.receive(id, cancel.id)).result).toMatchObject({
      status: 'pending',
      code: 'AWAITING_TIMELY_COMMAND',
    });
    expect((await other.receive(id, initial.id)).result).toBeNull();
    await other.apply(id, initial.id, { kind: 'going' });
    const completed = await service.today(actor, id);
    expect(completed.counts).toEqual({ pickup: 1, dropoff: 0 });
    expect(completed.journey?.dropoff.state).toBe('cancelado');
    await service.apply(id, initial.id, { kind: 'going' });
    await service.apply(id, cancel.id, { kind: 'cancel_return' });
    expect((await service.today(actor, id)).journey?.version).toBe(
      completed.journey?.version,
    );
  });
  it('keeps the first durable time across retries after 17h and 22h', async () => {
    const id = await student(),
      key = randomUUID();
    const initial = await service.receive(id, key);
    instant = '2026-10-24T20:00:00Z';
    const retry = await other.receive(id, key);
    expect(retry.receivedAt).toEqual(initial.receivedAt);
    expect(retry.sequence).toBe(initial.sequence);
    await other.apply(id, key, { kind: 'going' });
    instant = '2026-10-25T00:59:59.999Z';
    const cancel = await service.receive(id, randomUUID());
    instant = '2026-10-25T01:00:00Z';
    expect((await other.receive(id, cancel.id)).receivedAt).toEqual(
      cancel.receivedAt,
    );
    const result = await other.apply(id, cancel.id, { kind: 'cancel_return' });
    expect(result.status).toBe('applied');
    expect(
      await service.apply(id, cancel.id, { kind: 'cancel_return' }),
    ).toEqual(result);
    expect((await service.today(actor, id)).counts).toEqual({
      pickup: 1,
      dropoff: 0,
    });
  });
  it('deduplicates simultaneous receive/apply across independent connections', async () => {
    const id = await student(),
      key = randomUUID();
    const receipts = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        (i % 2 ? service : other).receive(id, key),
      ),
    );
    expect(new Set(receipts.map((r) => r.sequence)).size).toBe(1);
    const outcomes = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        (i % 2 ? service : other).apply(id, key, { kind: 'going' }),
      ),
    );
    for (const result of outcomes)
      expect(result).toEqual({ status: 'applied', version: 1 });
    expect((await service.today(actor, id)).counts).toEqual({
      pickup: 1,
      dropoff: 1,
    });
  });
  it('rejects an older receipt after a newer revision and repeats closing/cancellation without resurrection', async () => {
    const id = await student(),
      old = await service.receive(id, randomUUID()),
      latest = await other.receive(id, randomUUID());
    expect(latest.sequence).toBeGreaterThan(old.sequence);
    await other.apply(id, latest.id, {
      kind: 'answer',
      pickup: 'yes',
      dropoff: 'unsure',
    });
    expect(
      await service.apply(id, old.id, { kind: 'not_going' }),
    ).toMatchObject({ status: 'rejected', code: 'STALE_COMMAND' });
    instant = '2026-10-24T20:00:00Z';
    const cancel = await other.receive(id, randomUUID());
    await Promise.all([
      service.close(id, '2026-10-24'),
      other.apply(id, cancel.id, { kind: 'cancel_return' }),
    ]);
    const version = (await service.today(actor, id)).journey?.version;
    await Promise.all([
      other.close(id, '2026-10-24'),
      service.close(id, '2026-10-24'),
      other.apply(id, cancel.id, { kind: 'cancel_return' }),
    ]);
    expect((await service.today(actor, id)).journey?.version).toBe(version);
    expect((await other.today(actor, id)).counts).toEqual({
      pickup: 1,
      dropoff: 0,
    });
  });
  it('reports partial batch failure and pending work, then safely resumes the failed journey', async () => {
    const failed = await student(),
      completed = await student(),
      pending = await student();
    for (const id of [failed, completed]) {
      const receipt = await service.receive(id, randomUUID());
      await service.apply(id, receipt.id, {
        kind: 'answer',
        pickup: 'yes',
        dropoff: 'unsure',
      });
    }
    await service.receive(pending, randomUUID());
    instant = '2026-10-24T20:00:00Z';
    const broken = new JourneyService(
      new FaultStore(store, (tx) => ({
        ...tx,
        journeys: {
          ...tx.journeys,
          save: async (journey) => {
            await tx.journeys.save(journey);
            if (journey.studentId === failed)
              throw new Error('Private simulated infrastructure detail');
          },
        },
      })),
      clock,
    );
    const result = await broken.closeDay('2026-10-24');
    expect(result.results.find((r) => r.studentId === failed)).toEqual({
      studentId: failed,
      status: 'failed',
      code: 'REGISTRY_UNAVAILABLE',
    });
    expect(result.results.find((r) => r.studentId === pending)).toMatchObject({
      status: 'processed',
      needsAdjustment: true,
      pending: ['INTERPRETATION_PENDING'],
    });
    expect(result.results.find((r) => r.studentId === completed)).toMatchObject(
      { status: 'processed', needsAdjustment: true, pending: [] },
    );
    expect((await service.today(actor, failed)).journey?.dropoff.state).toBe(
      'indeciso',
    );
    const completedVersion = (await other.today(actor, completed)).journey
      ?.version;
    const retry = await other.closeDay('2026-10-24');
    expect(retry.results.find((r) => r.studentId === failed)?.status).toBe(
      'processed',
    );
    expect((await service.today(actor, failed)).journey?.dropoff.state).toBe(
      'confirmado',
    );
    expect((await service.today(actor, completed)).journey?.version).toBe(
      completedVersion,
    );
  });
});
