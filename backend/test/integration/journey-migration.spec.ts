import type { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';

describe('Journey migration constraints', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
    await source.runMigrations();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });
  it('reverses only empty latest B07 tables and reapplies idempotently', async () => {
    const latest = await source.query<{ name: string }[]>(
      'SELECT name FROM app.typeorm_migrations ORDER BY id DESC LIMIT 1',
    );
    if (latest[0]?.name !== 'DailyJourney1793100000000') {
      expect(await source.showMigrations()).toBe(false);
      return;
    }
    const rows = await source.query<{ count: string }[]>(
      'SELECT (SELECT count(*) FROM app.daily_journeys)+(SELECT count(*) FROM app.journey_receipts) AS count',
    );
    if (rows[0].count !== '0')
      throw new Error(
        'Existing journeys preserved; reversal requires empty test tables',
      );
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
  it('rejects duplicate daily rows, invalid state/origin and unknown locations; app has no DELETE or DDL', async () => {
    const id = randomUUID();
    await source.query(
      "INSERT INTO app.students(id,name,phone,university_id,habitual_days,active,version) VALUES($1,'Migration fixture',$2,'unimater','{}',true,1)",
      [id, `+${Date.now()}`],
    );
    try {
      const insert = `INSERT INTO app.daily_journeys(student_id,date,university_id,origin,version,last_sequence,pickup_state,pickup_origin,dropoff_state,dropoff_origin) VALUES($1,'2026-10-23','unimater','extra',1,1,'confirmado','aluno_explicito','confirmado','implicito_da_ida')`;
      await source.query(insert, [id]);
      await expect(source.query(insert, [id])).rejects.toMatchObject({
        driverError: { code: '23505' },
      });
      await expect(
        source.query(
          "UPDATE app.daily_journeys SET pickup_state='maybe' WHERE student_id=$1",
          [id],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23514' } });
      await expect(
        source.query(
          "UPDATE app.daily_journeys SET dropoff_origin='none' WHERE student_id=$1",
          [id],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23514' } });
      await expect(
        source.query(
          'UPDATE app.daily_journeys SET point_id=$2 WHERE student_id=$1',
          [id, randomUUID()],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23503' } });
      const user = readEnvironment(loadLocalEnvironment('test')).database.user;
      for (const table of ['daily_journeys', 'journey_receipts']) {
        expect(
          await source.query<
            { remove: boolean; ddl: boolean; write: boolean }[]
          >(
            "SELECT has_table_privilege($1,$2,'DELETE') AS remove,has_schema_privilege($1,'app','CREATE') AS ddl,has_table_privilege($1,$2,'INSERT') AS write",
            [user, `app.${table}`],
          ),
        ).toEqual([{ remove: false, ddl: false, write: true }]);
      }
    } finally {
      await source.query('DELETE FROM app.daily_journeys WHERE student_id=$1', [
        id,
      ]);
      await source.query('DELETE FROM app.students WHERE id=$1', [id]);
    }
  });
});
