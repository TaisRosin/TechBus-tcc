import type { MigrationInterface, QueryRunner } from 'typeorm';
export class OperationalQueries1793800000000 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(
      'CREATE TABLE app.driver_access_links(user_id uuid PRIMARY KEY REFERENCES app.team_users(id),driver_id uuid UNIQUE REFERENCES app.fleet_drivers(id),version integer NOT NULL CHECK(version>0))',
    );
    await r.query(
      "CREATE TABLE app.operation_manifests(date date NOT NULL REFERENCES app.operation_plans(date),version integer NOT NULL CHECK(version>0),members jsonb NOT NULL CHECK(jsonb_typeof(members)='array'),PRIMARY KEY(date,version))",
    );
    await r.query(
      `REVOKE ALL ON app.driver_access_links,app.operation_manifests FROM "${db}_app"`,
    );
    await r.query(
      `GRANT SELECT,INSERT,UPDATE ON app.driver_access_links TO "${db}_app"`,
    );
    await r.query(
      `GRANT SELECT,INSERT ON app.operation_manifests TO "${db}_app"`,
    );
  }
  async down(r: QueryRunner): Promise<void> {
    const rows = (await r.query(
      'SELECT 1 FROM app.driver_access_links UNION ALL SELECT 1 FROM app.operation_manifests LIMIT 1',
    )) as unknown[];
    if (rows.length) throw new Error('B15_DATA_REQUIRES_PRESERVATION');
    await r.query('DROP TABLE app.operation_manifests');
    await r.query('DROP TABLE app.driver_access_links');
  }
}
