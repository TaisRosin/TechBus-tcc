import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import { RegistryService } from '../../src/registry/application/registry.service';
import { JourneyService } from '../../src/journey/application/journey.service';
import { MessageService } from '../../src/messaging/application/message.service';
import type {
  SendOutcome,
  SendRequest,
} from '../../src/messaging/application/ports';
import { DisabledMessageSender } from '../../src/messaging/application/ports';
import {
  RegistryStore,
  type RegistryTransaction,
} from '../../src/registry/application/ports';
import { CorrectionService } from '../../src/journey/application/correction.service';
import { Messages1793700000000 } from '../../src/infrastructure/database/migrations/1793700000000-messages';

describe('Persistent messages on isolated PostgreSQL', () => {
  let source: DataSource,
    store: PostgresRegistryStore,
    service: MessageService,
    journeys: JourneyService;
  let ownsCalendar = false;
  const actor = randomUUID(),
    students: string[] = [],
    sent: SendRequest[] = [];
  let instant = '2026-10-26T11:00:00-03:00',
    outcome: SendOutcome = { status: 'sent' };
  const clock = { now: () => new Date(instant) };
  const sender = {
    send: (request: SendRequest) => {
      sent.push(request);
      return Promise.resolve(outcome);
    },
  };
  const student = async (habitualDays = [0, 1, 2, 3, 4, 5, 6]) => {
    const { student: s } = await new RegistryService(store).createStudent(
      actor,
      {
        name: 'B14 sintético',
        phone: `+55469${randomInt(10000000, 99999999)}`,
        universityId: 'unimater',
        habitualDays,
        contract: { startDate: '2026-01-01', endDate: '2026-12-31' },
      },
    );
    students.push(s.id);
    return s;
  };
  const command = async (id: string, input: unknown) => {
    const r = await journeys.receive(id, randomUUID());
    return journeys.apply(id, r.id, input);
  };
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    const rows = await source.query<
      { days: number[] | null; version: number }[]
    >(
      "SELECT days,version FROM app.university_calendars WHERE university_id='unimater'",
    );
    if (rows[0].days !== null || rows[0].version !== 1)
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
    journeys = new JourneyService(store, clock);
    service = new MessageService(store, clock, sender, journeys);
  });
  beforeEach(() => {
    instant = '2026-10-26T11:00:00-03:00';
    outcome = { status: 'sent' };
    sent.length = 0;
  });
  afterAll(async () => {
    await store?.close();
    if (source?.isInitialized) {
      await source.query(
        'DELETE FROM app.message_attempts WHERE message_id IN (SELECT id FROM app.outgoing_messages WHERE student_id=ANY($1::uuid[]))',
        [students],
      );
      for (const table of [
        'outgoing_messages',
        'team_corrections',
        'daily_journeys',
        'journey_receipts',
        'contracts',
      ])
        await source.query(
          `DELETE FROM app.${table} WHERE student_id=ANY($1::uuid[])`,
          [students],
        );
      await source.query('DELETE FROM app.students WHERE id=ANY($1::uuid[])', [
        students,
      ]);
      await source.query('DELETE FROM app.team_users WHERE id=$1', [actor]);
      if (ownsCalendar)
        await source.query(
          "UPDATE app.university_calendars SET days=NULL,version=1 WHERE university_id='unimater'",
        );
      await source.destroy();
    }
  });
  it('prepares the current slot once, suppresses old slots and sends once concurrently', async () => {
    const s = await student();
    instant = '2026-10-26T05:00:00-03:00';
    const old = await service.prepare(s.id);
    instant = '2026-10-26T13:20:00-03:00';
    const [a, b] = await Promise.all([
      service.prepare(s.id),
      service.prepare(s.id),
    ]);
    expect(a?.id).toBe(b?.id);
    expect(a?.slot).toBe(13);
    expect((await service.dispatch(old!.id)).status).toBe('skipped');
    await Promise.all([service.dispatch(a!.id), service.dispatch(a!.id)]);
    expect(sent).toHaveLength(1);
    expect(
      await source.query(
        'SELECT count(*)::int AS n FROM app.message_attempts WHERE message_id=$1',
        [a!.id],
      ),
    ).toEqual([{ n: 1 }]);
  });
  it('requires student initiation for extras and never starts a nonhabitual consultation', async () => {
    const s = await student([]);
    expect(await service.prepare(s.id)).toBeNull();
    await command(s.id, { kind: 'answer', pickup: 'unsure' });
    expect((await service.prepare(s.id))?.slot).toBe(11);
    instant = '2026-10-26T05:00:00-03:00';
    expect(await service.prepare(s.id)).toBeNull();
  });
  it('revalidates response before retry without changing the journey', async () => {
    const s = await student();
    const message = await service.prepare(s.id);
    outcome = { status: 'failed' };
    const failed = await service.dispatch(message!.id);
    await command(s.id, { kind: 'going' });
    const before = await store.transaction((tx) =>
      tx.journeys.get(s.id, '2026-10-26'),
    );
    expect(
      (
        await service.retry(actor, message!.id, {
          expectedVersion: failed.version,
        })
      ).status,
    ).toBe('skipped');
    expect(sent).toHaveLength(1);
    expect(
      await store.transaction((tx) => tx.journeys.get(s.id, '2026-10-26')),
    ).toEqual(before);
  });
  it('uses current contact and pending leg at dispatch', async () => {
    const s = await student();
    const message = await service.prepare(s.id);
    await command(s.id, { kind: 'answer', pickup: 'yes', dropoff: 'unsure' });
    await source.query('UPDATE app.students SET phone=$2 WHERE id=$1', [
      s.id,
      `+55468${randomInt(10000000, 99999999)}`,
    ]);
    await service.dispatch(message!.id);
    expect(sent[0].phone).not.toBe(s.phone);
    expect(sent[0].text).toContain('sua volta');
    expect(sent[0].text).toContain('às 17h');
  });
  it('blocks deadlines and deactivated recipients at claim', async () => {
    const s = await student();
    const message = await service.prepare(s.id);
    instant = '2026-10-26T17:00:00-03:00';
    expect((await service.dispatch(message!.id)).status).toBe('skipped');
    instant = '2026-10-26T11:00:00-03:00';
    const other = await student();
    const next = await service.prepare(other.id);
    await source.query('UPDATE app.students SET active=false WHERE id=$1', [
      other.id,
    ]);
    expect((await service.dispatch(next!.id)).status).toBe('skipped');
    expect(sent).toHaveLength(0);
  });
  it('retries failures with version checks and preserves uncertain results', async () => {
    const s = await student(),
      message = (await service.prepare(s.id))!;
    outcome = { status: 'failed' };
    const failed = await service.dispatch(message.id);
    const results = await Promise.allSettled([
      service.retry(actor, message.id, { expectedVersion: failed.version }),
      service.retry(actor, message.id, { expectedVersion: failed.version }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(sent).toHaveLength(2);
    const current = await store.transaction((tx) =>
      tx.messages.get(message.id),
    );
    outcome = { status: 'unknown' };
    const unknown = await service.retry(actor, message.id, {
      expectedVersion: current!.version,
    });
    await expect(
      service.retry(actor, message.id, { expectedVersion: unknown.version }),
    ).rejects.toMatchObject({ code: 'RETRY_NOT_ALLOWED' });
    await service.dispatch(message.id);
    expect(sent).toHaveLength(3);
    const throwing = new MessageService(
      store,
      clock,
      { send: () => Promise.reject(new Error('provider secret')) },
      journeys,
    );
    const other = (await service.prepare((await student()).id))!;
    expect(await throwing.dispatch(other.id)).toMatchObject({
      status: 'unknown',
      code: 'DELIVERY_UNKNOWN',
    });
  });
  it('does not send after failed reservation and never blindly retries failed finalization', async () => {
    const s = await student(),
      message = (await service.prepare(s.id))!;
    const broken = (method: 'start' | 'finish') =>
      new (class extends RegistryStore {
        transaction<T>(
          work: (tx: RegistryTransaction) => Promise<T>,
        ): Promise<T> {
          return store.transaction((tx) =>
            work({
              ...tx,
              messages: {
                ...tx.messages,
                [method]: () =>
                  Promise.reject(new Error('simulated database failure')),
              },
            }),
          );
        }
      })();
    const reserve = new MessageService(
      broken('start'),
      clock,
      sender,
      journeys,
    );
    await expect(reserve.dispatch(message.id)).rejects.toMatchObject({
      code: 'REGISTRY_UNAVAILABLE',
    });
    expect(sent).toHaveLength(0);
    expect(
      await store.transaction((tx) => tx.messages.get(message.id)),
    ).toMatchObject({ status: 'ready' });
    const finish = new MessageService(
      broken('finish'),
      clock,
      sender,
      journeys,
    );
    await expect(finish.dispatch(message.id)).rejects.toMatchObject({
      code: 'REGISTRY_UNAVAILABLE',
    });
    const current = (await store.transaction((tx) =>
      tx.messages.get(message.id),
    ))!;
    expect(current.status).toBe('sending');
    await service.dispatch(message.id);
    await expect(
      service.retry(actor, message.id, { expectedVersion: current.version }),
    ).rejects.toMatchObject({ code: 'RETRY_NOT_ALLOWED' });
    expect(sent).toHaveLength(1);
  });
  it('integrates repeated closing, reflects 22h and suppresses notice after cancellation', async () => {
    const s = await student();
    await command(s.id, { kind: 'answer', pickup: 'yes', dropoff: 'unsure' });
    instant = '2026-10-26T17:00:00-03:00';
    await service.tick();
    const notice = (await service.prepare(s.id))!;
    expect(notice.slot).toBe(17);
    expect(notice.text).toContain('antes das 22h');
    await service.tick();
    expect((await service.prepare(s.id))?.id).toBe(notice.id);
    instant = '2026-10-26T22:00:00-03:00';
    await service.dispatch(notice.id);
    expect(sent[0].text).toContain('prazo de cancelamento pelo aluno terminou');
    instant = '2026-10-26T11:00:00-03:00';
    const other = await student();
    await command(other.id, {
      kind: 'answer',
      pickup: 'yes',
      dropoff: 'unsure',
    });
    instant = '2026-10-26T17:00:00-03:00';
    await journeys.close(other.id, '2026-10-26');
    const cancelled = (await service.prepare(other.id))!;
    instant = '2026-10-26T21:00:00-03:00';
    await command(other.id, { kind: 'cancel_return' });
    expect((await service.dispatch(cancelled.id)).status).toBe('skipped');
    expect(sent).toHaveLength(1);
  });
  it('manual extras do not trigger messages; later valid student requests enable future reminders', async () => {
    const s = await student([]),
      correction = new CorrectionService(store, clock);
    await correction.correct(actor, s.id, {
      operationId: randomUUID(),
      expectedVersion: 0,
      reason: 'Contato sintético',
      reviewedReceiptIds: [],
      changes: { pickup: 'recusado' },
    });
    expect(await service.prepare(s.id)).toBeNull();
    instant = '2026-10-26T11:20:00-03:00';
    await command(s.id, { kind: 'answer', dropoff: 'unsure' });
    expect(await service.prepare(s.id)).toBeNull();
    instant = '2026-10-26T13:00:00-03:00';
    expect((await service.prepare(s.id))?.slot).toBe(13);
  });
  it('revalidates calendar and contract, and refuses destructive reversal with evidence', async () => {
    const s = await student(),
      message = (await service.prepare(s.id))!;
    await source.query(
      'UPDATE app.contracts SET end_date=$2 WHERE student_id=$1',
      [s.id, '2026-10-25'],
    );
    expect((await service.dispatch(message.id)).status).toBe('skipped');
    const other = await student(),
      prepared = (await service.prepare(other.id))!;
    await source.query(
      "UPDATE app.university_calendars SET days=NULL WHERE university_id='unimater'",
    );
    try {
      expect((await service.dispatch(prepared.id)).status).toBe('skipped');
    } finally {
      await source.query(
        "UPDATE app.university_calendars SET days=ARRAY[0,1,2,3,4,5,6]::smallint[] WHERE university_id='unimater'",
      );
    }
    const runner = source.createQueryRunner();
    await runner.connect();
    try {
      await expect(new Messages1793700000000().down(runner)).rejects.toThrow(
        'B14_DATA_REQUIRES_PRESERVATION',
      );
    } finally {
      await runner.release();
    }
    expect(sent).toHaveLength(0);
  });
  it('keeps the adapter outside the transaction and defaults to disabled sending', async () => {
    const s = await student(),
      message = (await service.prepare(s.id))!;
    const disabled = new MessageService(
      store,
      clock,
      new DisabledMessageSender(),
      journeys,
    );
    const failed = await disabled.dispatch(message.id);
    expect(failed).toMatchObject({
      status: 'failed',
      code: 'SENDER_NOT_CONFIGURED',
    });
    const responding = new MessageService(
      store,
      clock,
      {
        send: async () => {
          await command(s.id, { kind: 'not_going' });
          return { status: 'sent' };
        },
      },
      journeys,
    );
    expect(
      (
        await responding.retry(actor, message.id, {
          expectedVersion: failed.version,
        })
      ).status,
    ).toBe('sent');
    expect(
      await store.transaction((tx) => tx.journeys.get(s.id, '2026-10-26')),
    ).toMatchObject({
      pickup: { state: 'recusado' },
      dropoff: { state: 'recusado' },
    });
  });
  it('does not turn an ineligible extra into an eligible initiation retrospectively', async () => {
    const s = await student([]);
    await source.query(
      "UPDATE app.university_calendars SET days=NULL WHERE university_id='unimater'",
    );
    try {
      await command(s.id, { kind: 'answer', pickup: 'unsure' });
    } finally {
      await source.query(
        "UPDATE app.university_calendars SET days=ARRAY[0,1,2,3,4,5,6]::smallint[] WHERE university_id='unimater'",
      );
    }
    instant = '2026-10-26T13:00:00-03:00';
    expect(await service.prepare(s.id)).toBeNull();
    await command(s.id, { kind: 'answer', pickup: 'unsure' });
    instant = '2026-10-26T16:00:00-03:00';
    expect((await service.prepare(s.id))?.slot).toBe(16);
  });
});
