import type { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';

describe('B08 additive migration and safe reversal', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
    await source.runMigrations();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });
  it('preserves B07 rows when upgrading and refuses to discard B08 cancellation data', async () => {
    const latest = await source.query<{ name: string }[]>(
      'SELECT name FROM app.typeorm_migrations ORDER BY id DESC LIMIT 1',
    );
    if (latest[0]?.name !== 'JourneyClosing1793200000000') {
      expect(await source.showMigrations()).toBe(false);
      return;
    }
    const id = randomUUID();
    // The down migration itself refuses to discard any B08 data, including receipts.
    await source.undoLastMigration();
    try {
      await source.query(
        "INSERT INTO app.students(id,name,phone,university_id,habitual_days,active,version) VALUES($1,'B08 fixture',$2,'unimater','{}',true,1)",
        [id, `+${Date.now()}`],
      );
      await source.query(
        "INSERT INTO app.daily_journeys(student_id,date,university_id,origin,version,last_sequence,pickup_state,pickup_origin,dropoff_state,dropoff_origin) VALUES($1,'2026-10-24','unimater','extra',1,1,'confirmado','aluno_explicito','confirmado','implicito_da_ida')",
        [id],
      );
      await source.runMigrations();
      expect(
        await source.query<
          { state: string; version: number; closed: number | null }[]
        >(
          'SELECT dropoff_state AS state,version,closed_sequence AS closed FROM app.daily_journeys WHERE student_id=$1',
          [id],
        ),
      ).toEqual([{ state: 'confirmado', version: 1, closed: null }]);
      await expect(
        source.query(
          "UPDATE app.daily_journeys SET dropoff_state='cancelado',dropoff_origin='aluno_explicito' WHERE student_id=$1",
          [id],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23514' } });
      await source.query(
        "UPDATE app.daily_journeys SET dropoff_state='cancelado',dropoff_origin='aluno_explicito',cancel_sequence=2,closed_sequence=1 WHERE student_id=$1",
        [id],
      );
      await expect(source.undoLastMigration()).rejects.toThrow(
        'B08_DATA_REQUIRES_PRESERVATION',
      );
      expect(await source.showMigrations()).toBe(false);
      const user = readEnvironment(loadLocalEnvironment('test')).database.user;
      expect(
        await source.query<{ remove: boolean; ddl: boolean }[]>(
          "SELECT has_table_privilege($1,'app.daily_journeys','DELETE') AS remove,has_schema_privilege($1,'app','CREATE') AS ddl",
          [user],
        ),
      ).toEqual([{ remove: false, ddl: false }]);
    } finally {
      // Migration may be temporarily down after a failing assertion; restore it before cleanup.
      await source.runMigrations();
      await source.query('DELETE FROM app.daily_journeys WHERE student_id=$1', [
        id,
      ]);
      await source.query('DELETE FROM app.students WHERE id=$1', [id]);
    }
    expect(await source.runMigrations()).toHaveLength(0);
  });
});
