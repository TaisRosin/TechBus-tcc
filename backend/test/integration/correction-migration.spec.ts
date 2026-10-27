import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
describe('Team correction storage boundaries', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
    await source.runMigrations();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });
  it('keeps correction records immutable to the application', async () => {
    const user = readEnvironment(loadLocalEnvironment('test')).database.user;
    expect(
      await source.query(
        "SELECT has_table_privilege($1,'app.team_corrections','INSERT') AS create,has_table_privilege($1,'app.team_corrections','UPDATE') AS edit,has_table_privilege($1,'app.team_corrections','DELETE') AS remove",
        [user],
      ),
    ).toEqual([{ create: true, edit: false, remove: false }]);
  });
});
