import type { MigrationInterface, QueryRunner } from 'typeorm';
export class AcknowledgementDispatch1794500000000
  implements MigrationInterface
{
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(`ALTER TABLE app.journey_acknowledgements ADD COLUMN dispatch_started_at timestamptz,
   ADD COLUMN dispatch_finished_at timestamptz,ADD COLUMN provider_id text,ADD COLUMN delivery_code text`);
  }
  async down(r: QueryRunner): Promise<void> {
    const rows = (await r.query(
      'SELECT 1 FROM app.journey_acknowledgements WHERE dispatch_started_at IS NOT NULL OR delivery_code IS NOT NULL LIMIT 1',
    )) as unknown[];
    if (rows.length) throw new Error('DISPATCH_EVIDENCE_REQUIRES_PRESERVATION');
    await r.query(
      'ALTER TABLE app.journey_acknowledgements DROP COLUMN dispatch_started_at,DROP COLUMN dispatch_finished_at,DROP COLUMN provider_id,DROP COLUMN delivery_code',
    );
  }
}
