import type { MigrationInterface, QueryRunner } from 'typeorm';
export class Fleet1793400000000 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(`CREATE FUNCTION app.valid_fleet_windows(value jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
 DECLARE item jsonb; other jsonb; a integer; b integer;
 BEGIN
 IF value IS NULL OR jsonb_typeof(value)<>'array' THEN RETURN false; END IF;
 IF jsonb_array_length(value)>30 THEN RETURN false; END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(value) LOOP
 IF jsonb_typeof(item)<>'object' THEN RETURN false; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(item))<>3 OR NOT(item ?& ARRAY['stage','start','end']) THEN RETURN false; END IF;
 IF item->>'stage' NOT IN ('collection','intermunicipal','distribution') OR jsonb_typeof(item->'stage')<>'string' OR jsonb_typeof(item->'start')<>'number' OR jsonb_typeof(item->'end')<>'number' THEN RETURN false; END IF;
 IF (item->>'start')::numeric<>trunc((item->>'start')::numeric) OR (item->>'end')::numeric<>trunc((item->>'end')::numeric) THEN RETURN false; END IF;
 a:=(item->>'start')::integer;b:=(item->>'end')::integer;
 IF a<0 OR a>=2880 OR b<=a OR b>2880 THEN RETURN false; END IF;
 END LOOP;
 FOR a IN 0..jsonb_array_length(value)-1 LOOP
 FOR b IN a+1..jsonb_array_length(value)-1 LOOP
 item:=value->a;other:=value->b;
 IF item->>'stage'=other->>'stage' AND (item->>'start')::integer<(other->>'end')::integer AND (other->>'start')::integer<(item->>'end')::integer THEN RETURN false; END IF;
 END LOOP; END LOOP;
 RETURN true;
 EXCEPTION WHEN OTHERS THEN RETURN false;
 END $$`);
    await r.query(`CREATE FUNCTION app.valid_fleet_week(value jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
 DECLARE day jsonb;
 BEGIN
 IF value IS NULL THEN RETURN true; END IF;
 IF jsonb_typeof(value)<>'array' THEN RETURN false; END IF;
 IF jsonb_array_length(value)<>7 THEN RETURN false; END IF;
 FOR day IN SELECT * FROM jsonb_array_elements(value) LOOP IF NOT app.valid_fleet_windows(day) THEN RETURN false; END IF; END LOOP;
 RETURN true;
 END $$`);
    await r.query(`CREATE TABLE app.fleet_vehicles(
 id uuid PRIMARY KEY,identifier varchar(100) NOT NULL UNIQUE CHECK(length(identifier)>0 AND identifier=upper(btrim(identifier))),
 plate varchar(20) NOT NULL UNIQUE CHECK(plate ~ '^[A-Z0-9]+$'),kind text NOT NULL CHECK(kind IN ('van','micro','bus')),
 seats integer NOT NULL CHECK(seats>0),active boolean NOT NULL,version integer NOT NULL CHECK(version>0),week jsonb CHECK(app.valid_fleet_week(week)))`);
    await r.query(
      `CREATE TABLE app.fleet_drivers(id uuid PRIMARY KEY,name varchar(200) NOT NULL CHECK(length(btrim(name))>0),phone varchar(16) NOT NULL CHECK(phone ~ '^[+][1-9][0-9]{7,14}$'),active boolean NOT NULL,version integer NOT NULL CHECK(version>0))`,
    );
    await r.query(
      `CREATE TABLE app.fleet_exceptions(vehicle_id uuid NOT NULL REFERENCES app.fleet_vehicles(id),date date NOT NULL,windows jsonb CHECK(windows IS NULL OR app.valid_fleet_windows(windows)),PRIMARY KEY(vehicle_id,date))`,
    );
    await r.query(
      `GRANT SELECT,INSERT,UPDATE ON app.fleet_vehicles,app.fleet_drivers,app.fleet_exceptions TO "${db}_app"`,
    );
  }
  async down(r: QueryRunner): Promise<void> {
    const data = (await r.query(
      'SELECT 1 FROM app.fleet_vehicles UNION ALL SELECT 1 FROM app.fleet_drivers LIMIT 1',
    )) as unknown[];
    if (data.length) throw new Error('B11_DATA_REQUIRES_PRESERVATION');
    await r.query(
      'DROP TABLE app.fleet_exceptions,app.fleet_drivers,app.fleet_vehicles',
    );
    await r.query(
      'DROP FUNCTION app.valid_fleet_week(jsonb),app.valid_fleet_windows(jsonb)',
    );
  }
}
