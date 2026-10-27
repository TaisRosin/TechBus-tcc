import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
describe('Message storage boundaries', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
    await source.runMigrations();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });
  it('permits application writes but not deletion of message evidence', async () => {
    const user = readEnvironment(loadLocalEnvironment('test')).database.user;
    for (const table of ['outgoing_messages', 'message_attempts']) {
      expect(
        await source.query(
          "SELECT has_table_privilege($1,$2,'INSERT') AS create,has_table_privilege($1,$2,'UPDATE') AS edit,has_table_privilege($1,$2,'DELETE') AS remove",
          [user, `app.${table}`],
        ),
      ).toEqual([{ create: true, edit: true, remove: false }]);
    }
  });
});
