import type { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';

describe('Places migration and database invariants in test only', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
    await source.runMigrations();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });
  it('reverses only empty latest B06 tables and preserves prior data structures', async () => {
    const latest = await source.query<{ name: string }[]>(
      'SELECT name FROM app.typeorm_migrations ORDER BY id DESC LIMIT 1',
    );
    if (latest[0]?.name !== 'LocalPlaces1793000000000') {
      expect(await source.showMigrations()).toBe(false);
      return;
    }
    for (const table of [
      'local_groups',
      'service_regions',
      'boarding_points',
      'return_locations',
      'student_place_defaults',
    ]) {
      const rows = await source.query<{ count: string }[]>(
        `SELECT count(*) FROM app.${table}`,
      );
      if (rows[0].count !== '0')
        throw new Error(
          'Existing places preserved; reversal requires empty test tables',
        );
    }
    await source.undoLastMigration();
    try {
      expect(
        await source.query('SELECT id FROM app.universities'),
      ).toHaveLength(2);
    } finally {
      await source.runMigrations();
    }
    expect(await source.runMigrations()).toHaveLength(0);
  });
  it('enforces direction FK and prevents delete/DDL with application role', async () => {
    const id = randomUUID(),
      point = randomUUID(),
      user = readEnvironment(loadLocalEnvironment('test')).database.user;
    await source.query(
      "INSERT INTO app.local_groups(id,name,direction,active,version) VALUES($1,'Fixture','dropoff',true,1)",
      [id],
    );
    try {
      await expect(
        source.query(
          "INSERT INTO app.boarding_points(id,name,address,group_id,active,version) VALUES($1,'Point','Reference',$2,true,1)",
          [point, id],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23503' } });
    } finally {
      await source.query('DELETE FROM app.boarding_points WHERE id=$1', [
        point,
      ]);
      await source.query('DELETE FROM app.local_groups WHERE id=$1', [id]);
    }
    const permissions = await source.query<
      { remove: boolean; ddl: boolean; rewrite: boolean; write: boolean }[]
    >(
      "SELECT has_table_privilege($1,'app.local_groups','DELETE') AS remove,has_schema_privilege($1,'app','CREATE') AS ddl,has_table_privilege($1,'app.return_locations','UPDATE') AS rewrite,has_table_privilege($1,'app.student_place_defaults','INSERT') AS write",
      [user],
    );
    expect(permissions).toEqual([
      { remove: false, ddl: false, rewrite: false, write: true },
    ]);
  });
});
