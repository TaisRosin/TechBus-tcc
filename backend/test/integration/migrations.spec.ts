import { B02Fixture1792627200000 } from '../fixtures/migrations/1792627200000-b02-fixture';
import { DataSource } from 'typeorm';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { createMigrationDataSource } from '../../src/infrastructure/database/data-source';
import { createTestDataSource } from '../support/test-database';

describe('Versioned migrations in the isolated test cluster', () => {
  let testSource: DataSource;
  let devSource: DataSource;
  beforeAll(async () => {
    testSource = createTestDataSource(loadLocalEnvironment('test'));
    testSource.setOptions({
      migrations: [B02Fixture1792627200000],
      migrationsTableName: 'b02_fixture_migrations',
    });
    devSource = createMigrationDataSource(loadLocalEnvironment('dev'));
    await devSource.initialize();
    await testSource.initialize();
  });
  afterAll(async () => {
    if (testSource?.isInitialized) await testSource.destroy();
    if (devSource?.isInitialized) await devSource.destroy();
  });
  it('applies once, reverts and reapplies without changing development', async () => {
    const tablesBefore: unknown = await devSource.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='app' ORDER BY tablename",
    );
    expect((await testSource.runMigrations()).length).toBe(1);
    expect(await testSource.showMigrations()).toBe(false);
    expect(await testSource.runMigrations()).toHaveLength(0);
    const runner = testSource.createQueryRunner();
    try {
      expect(await runner.hasTable('app.b02_fixture')).toBe(true);
      await testSource.undoLastMigration();
      expect(await runner.hasTable('app.b02_fixture')).toBe(false);
      expect(await testSource.showMigrations()).toBe(true);
      expect(await testSource.runMigrations()).toHaveLength(1);
      expect(await runner.hasTable('app.b02_fixture')).toBe(true);
      await testSource.undoLastMigration();
    } finally {
      await runner.release();
    }
    const tablesAfter: unknown = await devSource.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='app' ORDER BY tablename",
    );
    expect(tablesAfter).toEqual(tablesBefore);
  });
});
