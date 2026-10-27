import type { MigrationInterface, QueryRunner } from 'typeorm';
export class Itineraries1793900000000 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(`CREATE FUNCTION app.valid_stop_ids(ids uuid[]) RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
      SELECT ids IS NOT NULL AND cardinality(ids)<=1000 AND COALESCE(array_ndims(ids),1)=1
        AND array_position(ids,NULL) IS NULL AND cardinality(ids)=(SELECT count(DISTINCT id) FROM unnest(ids) AS id)
    $$`);
    await r.query(
      'REVOKE ALL ON FUNCTION app.valid_stop_ids(uuid[]) FROM PUBLIC',
    );
    await r.query(
      `GRANT EXECUTE ON FUNCTION app.valid_stop_ids(uuid[]) TO "${db}_app"`,
    );
    await r.query(`CREATE TABLE app.group_stop_orders(
      group_id uuid PRIMARY KEY REFERENCES app.local_groups(id),version integer NOT NULL CHECK(version>0),
      stop_ids uuid[] NOT NULL CHECK(app.valid_stop_ids(stop_ids)))`);
    await r.query(`CREATE TABLE app.published_itineraries(
      date date NOT NULL REFERENCES app.operation_plans(date),group_id uuid NOT NULL REFERENCES app.local_groups(id),
      version integer NOT NULL CHECK(version>0),plan_version integer NOT NULL CHECK(plan_version>0),
      order_version integer NOT NULL CHECK(order_version>0),stop_ids uuid[] NOT NULL CHECK(app.valid_stop_ids(stop_ids)),
      source_token text NOT NULL CHECK(source_token ~ '^[a-f0-9]{64}$'),
      published_by uuid NOT NULL REFERENCES app.team_users(id),published_at timestamptz NOT NULL,
      PRIMARY KEY(date,group_id))`);
    await r.query(
      'CREATE INDEX published_itineraries_group ON app.published_itineraries(group_id)',
    );
    await r.query(
      'CREATE INDEX published_itineraries_actor ON app.published_itineraries(published_by)',
    );
    await r.query(
      `REVOKE ALL ON app.group_stop_orders,app.published_itineraries FROM "${db}_app"`,
    );
    await r.query(
      `GRANT SELECT,INSERT,UPDATE ON app.group_stop_orders,app.published_itineraries TO "${db}_app"`,
    );
  }
  async down(r: QueryRunner): Promise<void> {
    const rows = (await r.query(
      'SELECT 1 FROM app.group_stop_orders UNION ALL SELECT 1 FROM app.published_itineraries LIMIT 1',
    )) as unknown[];
    if (rows.length) throw new Error('B16_DATA_REQUIRES_PRESERVATION');
    await r.query('DROP TABLE app.published_itineraries');
    await r.query('DROP TABLE app.group_stop_orders');
    await r.query('DROP FUNCTION app.valid_stop_ids(uuid[])');
  }
}
