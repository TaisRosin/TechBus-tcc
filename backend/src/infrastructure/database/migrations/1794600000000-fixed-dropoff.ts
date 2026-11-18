import type { MigrationInterface, QueryRunner } from 'typeorm';
export class FixedDropoff1794600000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const rows = (await runner.query(
      'SELECT current_database() AS database',
    )) as { database: string }[];
    const db = rows[0]?.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await runner.query(`ALTER TABLE app.return_locations ALTER COLUMN region_id DROP NOT NULL,
      ADD COLUMN name text CHECK(length(btrim(name)) BETWEEN 1 AND 200),
      ADD COLUMN address text CHECK(length(btrim(address)) BETWEEN 1 AND 1000),
      ADD COLUMN group_id uuid,
      ADD COLUMN direction text NOT NULL DEFAULT 'dropoff' CHECK(direction='dropoff'),
      ADD COLUMN active boolean NOT NULL DEFAULT true,
      ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0),
      ADD CONSTRAINT return_group_fk FOREIGN KEY(group_id,direction) REFERENCES app.local_groups(id,direction),
      ADD CONSTRAINT return_kind_check CHECK(
        (region_id IS NOT NULL AND group_id IS NULL AND name IS NULL AND address IS NULL) OR
        (region_id IS NULL AND group_id IS NOT NULL AND name IS NOT NULL AND address IS NOT NULL))`);
    await runner.query(
      'CREATE INDEX return_locations_group_id_idx ON app.return_locations(group_id)',
    );
    await runner.query(`GRANT UPDATE ON app.return_locations TO "${db}_app"`);
  }
  down(): Promise<void> {
    return Promise.reject(new Error('FORWARD_ONLY_PRESERVE_FIXED_POINTS'));
  }
}
