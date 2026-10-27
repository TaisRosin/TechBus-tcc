import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
describe('B10 decision storage permissions', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
    await source.runMigrations();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });
  it('allows appending decisions but prevents rewriting or deleting evidence', async () => {
    const user = readEnvironment(loadLocalEnvironment('test')).database.user;
    expect(
      await source.query(
        "SELECT has_table_privilege($1,'app.place_pattern_decisions','SELECT') AS read,has_table_privilege($1,'app.place_pattern_decisions','INSERT') AS append,has_table_privilege($1,'app.place_pattern_decisions','UPDATE') AS edit,has_table_privilege($1,'app.place_pattern_decisions','DELETE') AS remove",
        [user],
      ),
    ).toEqual([{ read: true, append: true, edit: false, remove: false }]);
  });
});
