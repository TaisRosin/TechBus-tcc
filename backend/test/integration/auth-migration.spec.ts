import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { randomUUID } from 'node:crypto';
import { OwnAuth1794000000000 } from '../../src/infrastructure/database/migrations/1794000000000-own-auth';

describe('Authentication additive migration', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
    await source.runMigrations();
  });
  afterAll(async () => {
    await source?.destroy();
  });
  it('adds credentials and sessions without replacing team identities', async () => {
    const runner = source.createQueryRunner();
    try {
      expect(await runner.hasTable('app.auth_credentials')).toBe(true);
      expect(await runner.hasTable('app.auth_sessions')).toBe(true);
      expect(await runner.hasTable('app.team_users')).toBe(true);
    } finally {
      await runner.release();
    }
  });
  it.each([
    ['unnormalized email', 'person@EXAMPLE.test', true, new Date(), 1],
    ['empty email', '', true, new Date(), 1],
    ['missing expiry', 'person@example.test', true, null, 1],
    ['unexpected expiry', 'person@example.test', false, new Date(), 1],
    ['zero revision', 'person@example.test', false, null, 0],
  ])(
    'enforces %s in PostgreSQL',
    async (_name, email, mustChange, expiry, version) => {
      const runner = source.createQueryRunner();
      await runner.startTransaction();
      try {
        const id = randomUUID();
        await runner.query(
          "INSERT INTO app.team_users VALUES($1,$1,'admin',true,1)",
          [id],
        );
        await expect(
          runner.query(
            "INSERT INTO app.auth_credentials VALUES($1,$2,'hash',$3,$4,$5,now())",
            [id, email, mustChange, expiry, version],
          ),
        ).rejects.toMatchObject({ driverError: { code: '23514' } });
      } finally {
        await runner.rollbackTransaction();
        await runner.release();
      }
    },
  );
  it('refuses duplicate email and missing team foreign key', async () => {
    const runner = source.createQueryRunner();
    await runner.startTransaction();
    try {
      await expect(
        runner.query(
          "INSERT INTO app.auth_credentials VALUES($1,'missing@example.test','hash',false,NULL,1,now())",
          [randomUUID()],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23503' } });
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
  it('refuses destructive rollback with retained authentication evidence', async () => {
    const runner = source.createQueryRunner();
    await runner.startTransaction();
    try {
      const id = randomUUID();
      await runner.query(
        "INSERT INTO app.team_users VALUES($1,$1,'admin',true,1)",
        [id],
      );
      await runner.query(
        "INSERT INTO app.auth_credentials VALUES($1,'rollback@example.test','hash',false,NULL,1,now())",
        [id],
      );
      await expect(new OwnAuth1794000000000().down(runner)).rejects.toThrow(
        'AUTH_DATA_PRESENT',
      );
      expect(await runner.hasTable('app.team_users')).toBe(true);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
  it('grants no deletion, DDL or event rewrite to application role', async () => {
    const result = await source.query<
      { can_delete: boolean; can_ddl: boolean; can_rewrite: boolean }[]
    >(`SELECT
      has_table_privilege('techbus_test_app','app.auth_credentials','DELETE') AS can_delete,
      has_schema_privilege('techbus_test_app','app','CREATE') AS can_ddl,
      has_table_privilege('techbus_test_app','app.auth_events','UPDATE') AS can_rewrite`);
    expect(result).toEqual([
      { can_delete: false, can_ddl: false, can_rewrite: false },
    ]);
  });
});
