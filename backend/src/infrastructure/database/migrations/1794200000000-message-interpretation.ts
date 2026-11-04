import type { MigrationInterface, QueryRunner } from 'typeorm';
export class MessageInterpretation1794200000000 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(`CREATE TABLE app.message_interpretations(
      event_id uuid PRIMARY KEY REFERENCES app.whatsapp_events(id),state text NOT NULL CHECK(state IN ('processing','completed')),
      source text NOT NULL CHECK(source IN ('rules','gemini','none')),parser_version text NOT NULL DEFAULT 'rule-v1',
      proposal jsonb CHECK(proposal IS NULL OR jsonb_typeof(proposal)='object'),code text NOT NULL,
      started_at timestamptz NOT NULL,finished_at timestamptz,
      CHECK((state='completed')=(finished_at IS NOT NULL)))`);
    await r.query(`REVOKE ALL ON app.message_interpretations FROM "${db}_app"`);
    await r.query(
      `GRANT SELECT,INSERT,UPDATE ON app.message_interpretations TO "${db}_app"`,
    );
  }
  async down(r: QueryRunner): Promise<void> {
    const rows = (await r.query(
      'SELECT 1 FROM app.message_interpretations LIMIT 1',
    )) as unknown[];
    if (rows.length) throw new Error('B18_3_DATA_REQUIRES_PRESERVATION');
    await r.query('DROP TABLE app.message_interpretations');
  }
}
