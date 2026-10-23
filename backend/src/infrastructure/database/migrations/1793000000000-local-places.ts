import type { MigrationInterface, QueryRunner } from 'typeorm';
export class LocalPlaces1793000000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const rows = (await runner.query(
      'SELECT current_database() AS database',
    )) as { database: string }[];
    const db = rows[0]?.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await runner.query(
      `CREATE TABLE app.local_groups(id uuid PRIMARY KEY,name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 200),direction text NOT NULL CHECK(direction IN ('pickup','dropoff')),active boolean NOT NULL,version integer NOT NULL CHECK(version>0),UNIQUE(id,direction))`,
    );
    await runner.query(
      `CREATE TABLE app.service_regions(id uuid PRIMARY KEY,name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 200),group_id uuid NOT NULL,direction text NOT NULL DEFAULT 'dropoff' CHECK(direction='dropoff'),active boolean NOT NULL,version integer NOT NULL CHECK(version>0),FOREIGN KEY(group_id,direction) REFERENCES app.local_groups(id,direction))`,
    );
    await runner.query(
      `CREATE TABLE app.boarding_points(id uuid PRIMARY KEY,name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 200),address text NOT NULL CHECK(length(btrim(address)) BETWEEN 1 AND 1000),group_id uuid NOT NULL,direction text NOT NULL DEFAULT 'pickup' CHECK(direction='pickup'),active boolean NOT NULL,version integer NOT NULL CHECK(version>0),FOREIGN KEY(group_id,direction) REFERENCES app.local_groups(id,direction))`,
    );
    await runner.query(
      `CREATE TABLE app.return_locations(id uuid PRIMARY KEY,provider text NOT NULL CHECK(length(btrim(provider)) BETWEEN 1 AND 200),external_key text NOT NULL CHECK(length(btrim(external_key)) BETWEEN 1 AND 200),label text NOT NULL CHECK(length(btrim(label)) BETWEEN 1 AND 1000),region_id uuid NOT NULL REFERENCES app.service_regions(id),evidence text NOT NULL CHECK(length(btrim(evidence)) BETWEEN 1 AND 1000),UNIQUE(provider,external_key))`,
    );
    await runner.query(
      `CREATE TABLE app.student_place_defaults(student_id uuid NOT NULL REFERENCES app.students(id),direction text NOT NULL CHECK(direction IN ('pickup','dropoff')),boarding_point_id uuid REFERENCES app.boarding_points(id),return_location_id uuid REFERENCES app.return_locations(id),source text NOT NULL CHECK(source IN ('initial','request','consent')),evidence text NOT NULL CHECK(length(btrim(evidence)) BETWEEN 1 AND 1000),version integer NOT NULL CHECK(version>0),PRIMARY KEY(student_id,direction),CHECK((direction='pickup' AND boarding_point_id IS NOT NULL AND return_location_id IS NULL) OR (direction='dropoff' AND boarding_point_id IS NULL AND return_location_id IS NOT NULL)))`,
    );
    for (const [table, column] of [
      ['service_regions', 'group_id'],
      ['boarding_points', 'group_id'],
      ['return_locations', 'region_id'],
      ['student_place_defaults', 'boarding_point_id'],
      ['student_place_defaults', 'return_location_id'],
    ])
      await runner.query(
        `CREATE INDEX ${table}_${column}_idx ON app.${table}(${column})`,
      );
    await runner.query(
      `GRANT SELECT,INSERT,UPDATE ON app.local_groups,app.service_regions,app.boarding_points,app.student_place_defaults TO "${db}_app"`,
    );
    await runner.query(
      `GRANT SELECT,INSERT ON app.return_locations TO "${db}_app"`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    for (const table of [
      'student_place_defaults',
      'return_locations',
      'boarding_points',
      'service_regions',
      'local_groups',
    ])
      await runner.query(`DROP TABLE app.${table}`);
  }
}
