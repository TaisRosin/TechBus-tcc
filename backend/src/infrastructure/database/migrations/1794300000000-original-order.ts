import type { MigrationInterface, QueryRunner } from 'typeorm';
export class OriginalOrder1794300000000 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const database = r.connection.options.database;
    if (database !== 'techbus_dev' && database !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(`ALTER TABLE app.whatsapp_events ADD COLUMN original_order jsonb
      CHECK(original_order IS NULL OR jsonb_typeof(original_order)='object')`);
    await r.query(
      'CREATE INDEX whatsapp_events_student_received_idx ON app.whatsapp_events(student_id,received_at) WHERE student_id IS NOT NULL',
    );
  }
  async down(r: QueryRunner): Promise<void> {
    const rows = (await r.query(
      'SELECT 1 FROM app.whatsapp_events WHERE original_order IS NOT NULL LIMIT 1',
    )) as unknown[];
    if (rows.length) throw new Error('ORDER_EVIDENCE_REQUIRES_PRESERVATION');
    await r.query('DROP INDEX app.whatsapp_events_student_received_idx');
    await r.query('ALTER TABLE app.whatsapp_events DROP COLUMN original_order');
  }
}
