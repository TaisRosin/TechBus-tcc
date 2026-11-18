import type { MigrationInterface, QueryRunner } from 'typeorm';
export class StageOccupancies1794800000001 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(`ALTER TABLE app.operation_occupancies
      ALTER COLUMN starts_at DROP NOT NULL, ALTER COLUMN ends_at DROP NOT NULL,
      ADD COLUMN stage text CHECK(stage IN ('collection','intermunicipal','distribution')),
      ADD COLUMN side text CHECK(side IN ('cycle','outbound','return')),
      ADD CONSTRAINT occupancy_representation CHECK(
        (stage IS NULL AND side IS NULL AND starts_at IS NOT NULL AND ends_at IS NOT NULL) OR
        (stage IS NOT NULL AND side IS NOT NULL AND starts_at IS NULL AND ends_at IS NULL
          AND ((vehicle_id IS NOT NULL AND side='cycle') OR (driver_id IS NOT NULL AND side IN ('outbound','return')))))`);
    await r.query(
      `CREATE UNIQUE INDEX occupancy_daily_vehicle ON app.operation_occupancies(plan_date,stage,vehicle_id) WHERE active AND stage IS NOT NULL AND vehicle_id IS NOT NULL`,
    );
    await r.query(
      `CREATE UNIQUE INDEX occupancy_daily_driver ON app.operation_occupancies(plan_date,stage,side,driver_id) WHERE active AND stage IS NOT NULL AND driver_id IS NOT NULL`,
    );
  }
  down(): Promise<void> {
    return Promise.reject(
      new Error('DAILY_OPERATION_DATA_REQUIRES_PRESERVATION'),
    );
  }
}
