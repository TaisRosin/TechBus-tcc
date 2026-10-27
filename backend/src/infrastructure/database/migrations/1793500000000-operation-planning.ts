import type { MigrationInterface, QueryRunner } from 'typeorm';
export class OperationPlanning1793500000000 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(`CREATE TABLE app.operation_plans(
      date date PRIMARY KEY,version integer NOT NULL CHECK(version>0),
      draft jsonb NOT NULL CHECK(jsonb_typeof(draft)='array' AND jsonb_array_length(draft)<=100),
      demand_token varchar(64) NOT NULL CHECK(demand_token ~ '^[a-f0-9]{64}$'),
      confirmed_version integer CHECK(confirmed_version>0 AND confirmed_version<=version),
      confirmed_trips jsonb CHECK(jsonb_typeof(confirmed_trips)='array' AND jsonb_array_length(confirmed_trips)<=100),
      confirmed_token varchar(64) CHECK(confirmed_token ~ '^[a-f0-9]{64}$'),
      confirmed_by uuid REFERENCES app.team_users(id),confirmed_at timestamptz,
      needs_adjustment boolean NOT NULL DEFAULT false,
      CHECK(num_nonnulls(confirmed_version,confirmed_trips,confirmed_token,confirmed_by,confirmed_at) IN (0,5)))`);
    await r.query(
      `CREATE INDEX operation_plans_actor_idx ON app.operation_plans(confirmed_by)`,
    );
    await r.query(`CREATE TABLE app.operation_occupancies(
      id uuid PRIMARY KEY,plan_date date NOT NULL REFERENCES app.operation_plans(date),plan_version integer NOT NULL CHECK(plan_version>0),
      vehicle_id uuid REFERENCES app.fleet_vehicles(id),driver_id uuid REFERENCES app.fleet_drivers(id),
      starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),active boolean NOT NULL,
      CHECK(num_nonnulls(vehicle_id,driver_id)=1))`);
    await r.query(
      `CREATE INDEX operation_occupancies_plan_idx ON app.operation_occupancies(plan_date)`,
    );
    await r.query(
      `CREATE INDEX operation_occupancies_vehicle_idx ON app.operation_occupancies(vehicle_id,starts_at,ends_at)`,
    );
    await r.query(
      `CREATE INDEX operation_occupancies_driver_idx ON app.operation_occupancies(driver_id,starts_at,ends_at)`,
    );
    await r.query(`CREATE FUNCTION app.invalidate_operation_plan() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
      BEGIN UPDATE app.operation_plans SET needs_adjustment=true WHERE date=NEW.date AND confirmed_version IS NOT NULL AND NOT needs_adjustment; RETURN NEW; END $$`);
    for (const table of ['daily_journeys', 'journey_receipts'])
      await r.query(
        `CREATE TRIGGER invalidate_operation_plan AFTER INSERT OR UPDATE ON app.${table} FOR EACH ROW EXECUTE FUNCTION app.invalidate_operation_plan()`,
      );
    await r.query(
      `GRANT SELECT,INSERT,UPDATE ON app.operation_plans,app.operation_occupancies TO "${db}_app"`,
    );
  }
  async down(r: QueryRunner): Promise<void> {
    const rows = (await r.query(
      'SELECT 1 FROM app.operation_plans LIMIT 1',
    )) as unknown[];
    if (rows.length) throw new Error('B12_DATA_REQUIRES_PRESERVATION');
    for (const table of ['daily_journeys', 'journey_receipts'])
      await r.query(`DROP TRIGGER invalidate_operation_plan ON app.${table}`);
    await r.query('DROP FUNCTION app.invalidate_operation_plan()');
    await r.query('DROP TABLE app.operation_occupancies,app.operation_plans');
  }
}
