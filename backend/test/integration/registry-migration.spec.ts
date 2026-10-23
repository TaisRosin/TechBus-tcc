import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';

describe('Registry migration safety in test only', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
    await source.runMigrations();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });
  it('reverts only its empty tables and preserves the team schema', async () => {
    const latest = await source.query<{ name: string }[]>(
      'SELECT name FROM app.typeorm_migrations ORDER BY id DESC LIMIT 1',
    );
    const rows = await source.query<{ count: string }[]>(
      'SELECT (SELECT count(*) FROM app.students)+(SELECT count(*) FROM app.contracts) AS count',
    );
    if (rows[0].count !== '0')
      throw new Error(
        'Existing registry data preserved; reversal test requires empty registry',
      );
    if (latest[0]?.name !== 'StudentRegistry1792800000000') {
      // A future increment must never be reverted by this historical test.
      expect(await source.showMigrations()).toBe(false);
      return;
    }
    await source.undoLastMigration();
    const runner = source.createQueryRunner();
    try {
      expect(await runner.hasTable('app.team_users')).toBe(true);
      expect(await runner.hasTable('app.students')).toBe(false);
    } finally {
      await runner.release();
      await source.runMigrations();
    }
    expect(await source.runMigrations()).toHaveLength(0);
  });
  it('restricts application role to intended reads and writes', async () => {
    const c = readEnvironment(loadLocalEnvironment('test')).database;
    const app = new DataSource({
      type: 'postgres',
      host: c.host,
      port: c.port,
      database: c.database,
      username: c.user,
      password: c.password,
      synchronize: false,
      logging: false,
    });
    await app.initialize();
    try {
      const permissions = await app.query<
        {
          can_delete: boolean;
          can_create: boolean;
          can_update_catalog: boolean;
          can_insert: boolean;
        }[]
      >(`SELECT
        has_table_privilege(current_user,'app.students','DELETE') AS can_delete,
        has_schema_privilege(current_user,'app','CREATE') AS can_create,
        has_table_privilege(current_user,'app.universities','UPDATE') AS can_update_catalog,
        has_table_privilege(current_user,'app.contracts','INSERT') AS can_insert`);
      expect(permissions).toEqual([
        {
          can_delete: false,
          can_create: false,
          can_update_catalog: false,
          can_insert: true,
        },
      ]);
    } finally {
      await app.destroy();
    }
  });
});
