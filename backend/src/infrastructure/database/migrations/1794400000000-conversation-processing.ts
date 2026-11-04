import type { MigrationInterface, QueryRunner } from 'typeorm';
export class ConversationProcessing1794400000000 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(`CREATE TABLE app.journey_acknowledgements(
    event_id uuid PRIMARY KEY REFERENCES app.whatsapp_events(id),student_id uuid NOT NULL REFERENCES app.students(id),
    date date NOT NULL,journey_version integer NOT NULL CHECK(journey_version>0),phone text NOT NULL,text text NOT NULL,
    state text NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','sending','sent','unknown','superseded')),
    created_at timestamptz NOT NULL)`);
    await r.query(`CREATE TABLE app.conversation_jobs(event_id uuid PRIMARY KEY REFERENCES app.whatsapp_events(id),
    state text NOT NULL CHECK(state IN ('processing','completed')),code text NOT NULL,started_at timestamptz NOT NULL,finished_at timestamptz)`);
    for (const table of ['journey_acknowledgements', 'conversation_jobs'])
      await r.query(
        `GRANT SELECT,INSERT,UPDATE ON app.${table} TO "${db}_app"`,
      );
  }
  async down(r: QueryRunner): Promise<void> {
    const rows = (await r.query(
      'SELECT 1 FROM app.journey_acknowledgements UNION ALL SELECT 1 FROM app.conversation_jobs LIMIT 1',
    )) as unknown[];
    if (rows.length) throw new Error('CONVERSATION_DATA_REQUIRES_PRESERVATION');
    await r.query('DROP TABLE app.conversation_jobs');
    await r.query('DROP TABLE app.journey_acknowledgements');
  }
}
