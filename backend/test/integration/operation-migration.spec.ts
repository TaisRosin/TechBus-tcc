import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
describe('Operation database boundaries', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
    await source.runMigrations();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });
  it('allows app changes but neither deletion nor DDL', async () => {
    const user = readEnvironment(loadLocalEnvironment('test')).database.user;
    expect(
      await source.query(
        "SELECT has_table_privilege($1,'app.operation_plans','UPDATE') AS edit,has_table_privilege($1,'app.operation_occupancies','DELETE') AS remove,has_schema_privilege($1,'app','CREATE') AS ddl",
        [user],
      ),
    ).toEqual([{ edit: true, remove: false, ddl: false }]);
  });
  it('rejects invalid draft structures and partial confirmation metadata', async () => {
    await expect(
      source.query(
        "INSERT INTO app.operation_plans(date,version,draft,demand_token) VALUES('2098-01-01',1,'{}',$1)",
        ['a'.repeat(64)],
      ),
    ).rejects.toMatchObject({ driverError: { code: '23514' } });
    await expect(
      source.query(
        "INSERT INTO app.operation_plans(date,version,draft,demand_token,confirmed_version) VALUES('2098-01-01',1,'[]',$1,1)",
        ['a'.repeat(64)],
      ),
    ).rejects.toMatchObject({ driverError: { code: '23514' } });
  });
});
