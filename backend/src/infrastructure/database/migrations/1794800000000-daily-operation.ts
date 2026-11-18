import type { MigrationInterface, QueryRunner } from 'typeorm';
export class DailyOperation1794800000000 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    // Old time windows remain intact. A partial window is not evidence of
    // availability for the whole operation; the team explicitly configures it.
    await r.query(`CREATE FUNCTION app.valid_daily_week(value jsonb) RETURNS boolean
      LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
      BEGIN
        IF value IS NULL THEN RETURN true; END IF;
        IF jsonb_typeof(value)<>'array' THEN RETURN false; END IF;
        IF jsonb_array_length(value)<>7 THEN RETURN false; END IF;
        RETURN NOT EXISTS(SELECT 1 FROM jsonb_array_elements(value) day WHERE jsonb_typeof(day)<>'boolean');
      END $$`);
    await r.query(
      'ALTER TABLE app.fleet_vehicles ADD COLUMN day_week jsonb CHECK(app.valid_daily_week(day_week))',
    );
    await r.query(
      'ALTER TABLE app.fleet_exceptions ADD COLUMN available boolean',
    );
    await r.query(
      'UPDATE app.operation_plans SET needs_adjustment=true WHERE confirmed_version IS NOT NULL',
    );
  }
  down(): Promise<void> {
    return Promise.reject(
      new Error('DAILY_OPERATION_DATA_REQUIRES_PRESERVATION'),
    );
  }
}
