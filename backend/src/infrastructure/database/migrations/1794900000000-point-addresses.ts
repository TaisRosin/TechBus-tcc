import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PointAddresses1794900000000 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(`CREATE FUNCTION app.valid_point_address(value jsonb) RETURNS boolean
      LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
      DECLARE key text;
      BEGIN
        IF value IS NULL THEN RETURN true; END IF;
        IF jsonb_typeof(value)<>'object' THEN RETURN false; END IF;
        IF (SELECT count(*) FROM jsonb_object_keys(value))<>9 OR NOT(value ?& ARRAY['street','number','noNumber','neighborhood','city','state','country','postalCode','complement']) THEN RETURN false; END IF;
        FOREACH key IN ARRAY ARRAY['street','number','neighborhood','city','state','country','postalCode','complement'] LOOP
          IF jsonb_typeof(value->key)<>'string' OR value->>key<>btrim(value->>key) THEN RETURN false; END IF;
        END LOOP;
        IF jsonb_typeof(value->'noNumber')<>'boolean' THEN RETURN false; END IF;
        IF length(value->>'street') NOT BETWEEN 1 AND 200 OR length(value->>'city') NOT BETWEEN 1 AND 120
          OR length(value->>'number')>20 OR length(value->>'neighborhood')>120 OR length(value->>'complement')>200 THEN RETURN false; END IF;
        IF value->>'country'<>'BR' OR value->>'state' NOT IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO') THEN RETURN false; END IF;
        IF value->>'postalCode'<>'' AND value->>'postalCode' !~ '^[0-9]{8}$' THEN RETURN false; END IF;
        RETURN CASE WHEN (value->>'noNumber')::boolean THEN value->>'number'='' ELSE length(value->>'number')>0 END;
      END $$`);
    for (const table of ['boarding_points', 'return_locations']) {
      await r.query(`ALTER TABLE app.${table}
        ADD COLUMN address_details jsonb CHECK(app.valid_point_address(address_details)),
        ADD COLUMN stop_reference text NOT NULL DEFAULT '' CHECK(length(stop_reference)<=1000),
        ADD COLUMN legacy_address text CHECK(length(legacy_address)<=1000)`);
      await r.query(
        `UPDATE app.${table} SET legacy_address=address WHERE address IS NOT NULL`,
      );
    }
  }
  down(): Promise<void> {
    return Promise.reject(new Error('POINT_ADDRESSES_REQUIRE_PRESERVATION'));
  }
}
