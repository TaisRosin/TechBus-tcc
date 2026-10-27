import type { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { OperationalQueries1793800000000 } from '../../src/infrastructure/database/migrations/1793800000000-operational-queries';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
describe('Operational consultation storage', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
    await source.runMigrations();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });
  it('preserves confirmed membership evidence and denies application deletion', async () => {
    const user = readEnvironment(loadLocalEnvironment('test')).database.user;
    expect(
      await source.query(
        "SELECT has_table_privilege($1,'app.operation_manifests','INSERT') AS create,has_table_privilege($1,'app.operation_manifests','UPDATE') AS edit,has_table_privilege($1,'app.driver_access_links','DELETE') AS remove",
        [user],
      ),
    ).toEqual([{ create: true, edit: false, remove: false }]);
  });
  it('refuses rollback when access evidence exists', async () => {
    const runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const id = randomUUID();
      await runner.query(
        "INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,'driver',true)",
        [id],
      );
      await runner.query(
        'INSERT INTO app.driver_access_links(user_id,driver_id,version) VALUES($1,NULL,1)',
        [id],
      );
      await expect(
        new OperationalQueries1793800000000().down(runner),
      ).rejects.toThrow('B15_DATA_REQUIRES_PRESERVATION');
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
