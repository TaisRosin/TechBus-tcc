import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { PostgresTeamStore } from '../../src/access/infrastructure/postgres-team-store';
import { AccessService } from '../../src/access/application/access.service';
import { randomUUID } from 'node:crypto';

describe('Team access migration in test only', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });
  it('creates the versioned team table', async () => {
    await source.runMigrations();
    const runner = source.createQueryRunner();
    try {
      expect(await runner.hasTable('app.team_users')).toBe(true);
    } finally {
      await runner.release();
    }
  });
  it('reverts and reapplies only an empty test table', async () => {
    const rows = await source.query<{ count: string }[]>(
      'SELECT count(*) FROM app.team_users',
    );
    if (rows[0].count !== '0')
      throw new Error('Test migration refuses to remove existing members');
    await source.undoLastMigration();
    expect(await source.showMigrations()).toBe(true);
    expect(await source.runMigrations()).toHaveLength(1);
    expect(await source.runMigrations()).toHaveLength(0);
  });
});

describe('Team access persisted with restricted application credentials', () => {
  let source: DataSource;
  let store: PostgresTeamStore;
  let secondStore: PostgresTeamStore;
  let service: AccessService;
  let secondService: AccessService;
  let ids: string[] = [];
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
    await source.runMigrations();
    const rows = await source.query<{ count: string }[]>(
      'SELECT count(*) FROM app.team_users',
    );
    if (rows[0].count !== '0')
      throw new Error(
        'Use an empty isolated test team table; existing members preserved',
      );
    const config = readEnvironment(loadLocalEnvironment('test')).database;
    store = new PostgresTeamStore(config);
    secondStore = new PostgresTeamStore(config);
    service = new AccessService(store, {
      isAssigned: () => Promise.resolve(false),
    });
    secondService = new AccessService(secondStore, {
      isAssigned: () => Promise.resolve(false),
    });
  });
  beforeEach(async () => {
    ids = [randomUUID(), randomUUID(), randomUUID()];
    for (let i = 0; i < ids.length; i++)
      await source.query(
        'INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,$2,true)',
        [ids[i], i < 2 ? 'admin' : 'operator'],
      );
  });
  afterEach(async () => {
    if (source?.isInitialized && ids.length)
      await source.query(
        'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
        [ids],
      );
    ids = [];
  });
  afterAll(async () => {
    await store?.close();
    await secondStore?.close();
    if (source?.isInitialized) await source.destroy();
  });
  it('persists a change across independent connections and rejects the old revision', async () => {
    await service.changeAccess(ids[0], ids[2], {
      role: 'driver',
      active: true,
      expectedVersion: 1,
    });
    await expect(
      secondService.authorize(ids[2], 'session'),
    ).resolves.toMatchObject({ role: 'driver', version: 2 });
    await expect(
      secondService.changeAccess(ids[0], ids[2], {
        role: 'admin',
        active: true,
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });
  it.each(['demote', 'deactivate'])(
    'keeps one active admin when both try to %s themselves concurrently',
    async (action) => {
      const command = {
        role: action === 'demote' ? 'operator' : 'admin',
        active: action !== 'deactivate',
        expectedVersion: 1,
      };
      const results = await Promise.allSettled([
        service.changeAccess(ids[0], ids[0], command),
        secondService.changeAccess(ids[1], ids[1], command),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const failure = results.find((r) => r.status === 'rejected');
      expect(failure?.reason as unknown).toMatchObject({ code: 'LAST_ADMIN' });
      const rows = await source.query<{ count: string }[]>(
        "SELECT count(*) FROM app.team_users WHERE active AND role='admin'",
      );
      expect(rows[0].count).toBe('1');
    },
  );
  it('revalidates a racing administrator after their privileges have been removed', async () => {
    const command = { role: 'operator', active: true, expectedVersion: 1 };
    const results = await Promise.allSettled([
      service.changeAccess(ids[0], ids[1], command),
      secondService.changeAccess(ids[1], ids[0], command),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find((r) => r.status === 'rejected');
    expect(failure?.reason as unknown).toMatchObject({ code: 'FORBIDDEN' });
  });
  it('rolls back a failed transaction without exposing database details', async () => {
    await expect(
      store.transaction(async (tx) => {
        const user = await tx.byId(ids[2]);
        await tx.save({ ...user!, role: 'driver', version: 2 });
        throw new Error('private database detail');
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_UNAVAILABLE' });
    await expect(service.authorize(ids[2], 'session')).resolves.toMatchObject({
      role: 'operator',
      version: 1,
    });
  });
  it('enforces one valid role, unique identity and restricted table privileges', async () => {
    await expect(
      source.query(
        "INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$2,'admin',true)",
        [randomUUID(), ids[0]],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      source.query("UPDATE app.team_users SET role='custom' WHERE id=$1", [
        ids[2],
      ]),
    ).rejects.toMatchObject({ code: '23514' });
    const rows = await source.query<
      { can_delete: boolean; can_update: boolean }[]
    >(
      "SELECT has_table_privilege('techbus_test_app','app.team_users','DELETE') AS can_delete, has_table_privilege('techbus_test_app','app.team_users','UPDATE') AS can_update",
    );
    expect(rows).toEqual([{ can_delete: false, can_update: true }]);
  });
});
