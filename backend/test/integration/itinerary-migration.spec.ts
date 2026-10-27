import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { Itineraries1793900000000 } from '../../src/infrastructure/database/migrations/1793900000000-itineraries';
describe('Itinerary storage boundaries', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
    await source.runMigrations();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });
  it('permits explicit updates but no deletion', async () => {
    const user = readEnvironment(loadLocalEnvironment('test')).database.user;
    expect(
      await source.query(
        "SELECT has_table_privilege($1,'app.group_stop_orders','UPDATE') AS edit,has_table_privilege($1,'app.published_itineraries','DELETE') AS remove",
        [user],
      ),
    ).toEqual([{ edit: true, remove: false }]);
  });
  it('rejects duplicate stops in a stored order', async () => {
    const runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const group = randomUUID(),
        stop = randomUUID();
      await runner.query(
        "INSERT INTO app.local_groups(id,name,direction,active,version) VALUES($1,'B16','pickup',true,1)",
        [group],
      );
      await expect(
        runner.query(
          'INSERT INTO app.group_stop_orders(group_id,version,stop_ids) VALUES($1,1,$2)',
          [group, [stop, stop]],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23514' } });
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
  it('refuses reversal when an explicit order would be lost', async () => {
    const runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const group = randomUUID();
      await runner.query(
        "INSERT INTO app.local_groups(id,name,direction,active,version) VALUES($1,'B16 rollback','pickup',true,1)",
        [group],
      );
      await runner.query(
        "INSERT INTO app.group_stop_orders(group_id,version,stop_ids) VALUES($1,1,'{}')",
        [group],
      );
      await expect(new Itineraries1793900000000().down(runner)).rejects.toThrow(
        'B16_DATA_REQUIRES_PRESERVATION',
      );
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
