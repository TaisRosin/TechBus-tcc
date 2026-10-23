import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import { CalendarService } from '../../src/registry/application/calendar.service';
import { RegistryService } from '../../src/registry/application/registry.service';
import { EligibilityService } from '../../src/registry/application/eligibility.service';
import { FixedClock } from '../support/fixed-clock';

describe('Persisted calendars', () => {
  let source: DataSource;
  let store: PostgresRegistryStore;
  let other: PostgresRegistryStore;
  let calendar: CalendarService;
  let second: CalendarService;
  const actor = randomUUID();
  const phones: string[] = [];
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    const existing = await source.query<{ count: string }[]>(
      'SELECT count(*) FROM app.university_calendars WHERE days IS NOT NULL OR version<>1',
    );
    const exceptions = await source.query<{ count: string }[]>(
      'SELECT count(*) FROM app.calendar_exceptions',
    );
    if (existing[0].count !== '0' || exceptions[0].count !== '0')
      throw new Error(
        'Test requires unconfigured calendars; existing configuration preserved',
      );
    await source.query(
      "INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,'operator',true)",
      [actor],
    );
    store = new PostgresRegistryStore(readEnvironment(env).database);
    other = new PostgresRegistryStore(readEnvironment(env).database);
    calendar = new CalendarService(store);
    second = new CalendarService(other);
  });
  afterEach(async () => {
    if (store) {
      await source.query(
        "DELETE FROM app.calendar_exceptions WHERE university_id IN ('unimater','unidep')",
      );
      await source.query(
        'UPDATE app.university_calendars SET days=NULL,version=1',
      );
    }
  });
  afterAll(async () => {
    await store?.close();
    await other?.close();
    if (source?.isInitialized) {
      await source.query(
        'DELETE FROM app.contracts WHERE student_id IN (SELECT id FROM app.students WHERE phone=ANY($1::text[]))',
        [phones],
      );
      await source.query(
        'DELETE FROM app.students WHERE phone=ANY($1::text[])',
        [phones],
      );
      await source.query('DELETE FROM app.team_users WHERE id=$1', [actor]);
      await source.destroy();
    }
  });
  it('persists week and exception revisions across connections and restores inheritance', async () => {
    expect(await calendar.get(actor, 'unimater')).toEqual({
      universityId: 'unimater',
      days: null,
      version: 1,
    });
    await calendar.week(actor, 'unimater', { days: [5], expectedVersion: 1 });
    const change = await second.exception(actor, 'unimater', '2026-10-23', {
      operates: false,
      reason: 'Recesso',
      expectedVersion: 2,
    });
    expect(change.calendarVersion).toBe(3);
    expect(
      (
        await calendar.exceptions(actor, 'unimater', {
          from: '2026-10-01',
          to: '2026-10-31',
        })
      ).exceptions,
    ).toEqual([
      {
        universityId: 'unimater',
        date: '2026-10-23',
        operates: false,
        reason: 'Recesso',
      },
    ]);
    await expect(
      calendar.week(actor, 'unimater', { days: [], expectedVersion: 2 }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await calendar.exception(actor, 'unimater', '2026-10-23', {
      operates: null,
      reason: 'Restaurar semana',
      expectedVersion: 3,
    });
    expect(
      (
        await second.exceptions(actor, 'unimater', {
          from: '2026-10-23',
          to: '2026-10-23',
        })
      ).exceptions[0].operates,
    ).toBeNull();
    expect((await calendar.get(actor, 'unidep')).days).toBeNull();
  });
  it('evaluates persisted students and uses received time despite delayed interpretation', async () => {
    const phone = `+55469${randomInt(10000000, 99999999)}`;
    phones.push(phone);
    const registry = new RegistryService(store);
    const created = await registry.createStudent(actor, {
      name: 'Aluno B05 sintético',
      phone,
      universityId: 'unimater',
      habitualDays: [],
      contract: { startDate: '2026-10-23', endDate: '2026-10-23' },
    });
    const eligibility = new EligibilityService(
      other,
      new FixedClock('2026-10-24T12:00:00Z'),
    );
    await calendar.week(actor, 'unimater', { days: [5], expectedVersion: 1 });
    expect(
      await eligibility.request(phone, new Date('2026-10-23T19:59:59.999Z')),
    ).toMatchObject({ eligible: true, date: '2026-10-23', calendarVersion: 2 });
    expect(await eligibility.consultation(phone)).toMatchObject({
      reason: 'NO_VALID_CONTRACT',
    });
    await calendar.exception(actor, 'unimater', '2026-10-23', {
      operates: false,
      reason: 'Suspensão sintética',
      expectedVersion: 2,
    });
    expect(
      await eligibility.request(phone, new Date('2026-10-23T12:00:00Z')),
    ).toMatchObject({
      eligible: false,
      reason: 'NO_OPERATION',
      calendarVersion: 3,
    });
    expect(await registry.student(actor, created.student.id)).toEqual(
      created.student,
    );
    expect(await registry.contracts(actor, created.student.id)).toEqual([
      created.contract,
    ]);
    await calendar.exception(actor, 'unimater', '2026-10-23', {
      operates: null,
      reason: 'Retomar semana',
      expectedVersion: 3,
    });
    expect(
      await eligibility.request(phone, new Date('2026-10-23T20:00:00Z')),
    ).toMatchObject({ reason: 'DEADLINE_PASSED' });
    const today = new EligibilityService(
      other,
      new FixedClock('2026-10-23T08:00:00Z'),
    );
    expect(await today.consultation(phone)).toMatchObject({
      reason: 'NOT_HABITUAL',
    });
  });
  it('serializes competing week/exception corrections without lost updates', async () => {
    const results = await Promise.allSettled([
      calendar.week(actor, 'unimater', { days: [5], expectedVersion: 1 }),
      second.exception(actor, 'unimater', '2026-10-23', {
        operates: false,
        reason: 'Concorrente',
        expectedVersion: 1,
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'VERSION_CONFLICT' },
    });
    expect((await calendar.get(actor, 'unimater')).version).toBe(2);
  });
  it('revalidates the actor in the transaction and leaves calendar unchanged', async () => {
    await source.query('UPDATE app.team_users SET active=false WHERE id=$1', [
      actor,
    ]);
    try {
      await expect(
        calendar.week(actor, 'unimater', { days: [5], expectedVersion: 1 }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    } finally {
      await source.query('UPDATE app.team_users SET active=true WHERE id=$1', [
        actor,
      ]);
    }
    expect(await second.get(actor, 'unimater')).toEqual({
      universityId: 'unimater',
      days: null,
      version: 1,
    });
  });
});

describe('Calendar migration in test only', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
    await source.runMigrations();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });
  it('reverses only an unconfigured latest calendar migration and reapplies once', async () => {
    const latest = await source.query<{ name: string }[]>(
      'SELECT name FROM app.typeorm_migrations ORDER BY id DESC LIMIT 1',
    );
    if (latest[0]?.name !== 'UniversityCalendar1792900000000') {
      expect(await source.showMigrations()).toBe(false);
      return;
    }
    const data = await source.query<{ count: string }[]>(
      'SELECT (SELECT count(*) FROM app.university_calendars WHERE days IS NOT NULL OR version<>1)+(SELECT count(*) FROM app.calendar_exceptions) AS count',
    );
    if (data[0].count !== '0')
      throw new Error(
        'Existing calendar preserved; reversal requires unconfigured test data',
      );
    await source.undoLastMigration();
    try {
      const rows = await source.query<{ present: boolean }[]>(
        "SELECT to_regclass('app.students') IS NOT NULL AS present",
      );
      expect(rows[0].present).toBe(true);
    } finally {
      await source.runMigrations();
    }
    expect(await source.runMigrations()).toHaveLength(0);
  });
  it('grants no calendar delete or schema administration to the application', async () => {
    const user = readEnvironment(loadLocalEnvironment('test')).database.user;
    const rows = await source.query<
      { remove: boolean; ddl: boolean; write: boolean }[]
    >(
      "SELECT has_table_privilege($1,'app.calendar_exceptions','DELETE') AS remove,has_schema_privilege($1,'app','CREATE') AS ddl,has_table_privilege($1,'app.calendar_exceptions','INSERT') AS write",
      [user],
    );
    expect(rows).toEqual([{ remove: false, ddl: false, write: true }]);
  });
});
