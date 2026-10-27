import type { MigrationInterface, QueryRunner } from 'typeorm';
export class PlacePatterns1793300000000 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(`CREATE TABLE app.place_pattern_decisions(
 student_id uuid NOT NULL, receipt_id uuid NOT NULL,
 direction text NOT NULL CHECK(direction IN ('pickup','dropoff')),
 action text NOT NULL CHECK(action IN ('accept','refuse','request')),
 sequence integer NOT NULL CHECK(sequence>0), default_version integer NOT NULL CHECK(default_version>=0),
 suggestion_key varchar(64), point_id uuid REFERENCES app.boarding_points(id), location_id uuid REFERENCES app.return_locations(id),
 PRIMARY KEY(student_id,receipt_id), FOREIGN KEY(student_id,receipt_id) REFERENCES app.journey_receipts(student_id,id),
 CHECK((action='request' AND suggestion_key IS NULL) OR (action IN ('accept','refuse') AND suggestion_key IS NOT NULL AND suggestion_key ~ '^[a-f0-9]{64}$')),
 CHECK((direction='pickup' AND point_id IS NOT NULL AND location_id IS NULL) OR (direction='dropoff' AND location_id IS NOT NULL AND point_id IS NULL))
 )`);
    await r.query(
      'CREATE INDEX place_pattern_decisions_sequence_idx ON app.place_pattern_decisions(student_id,direction,sequence)',
    );
    await r.query(
      'CREATE INDEX place_pattern_decisions_suggestion_idx ON app.place_pattern_decisions(student_id,suggestion_key)',
    );
    for (const column of ['point_id', 'location_id'])
      await r.query(
        `CREATE INDEX place_pattern_decisions_${column}_idx ON app.place_pattern_decisions(${column})`,
      );
    await r.query(
      `GRANT SELECT,INSERT ON app.place_pattern_decisions TO "${db}_app"`,
    );
  }
  async down(r: QueryRunner): Promise<void> {
    const rows = (await r.query(
      'SELECT 1 FROM app.place_pattern_decisions LIMIT 1',
    )) as unknown[];
    if (rows.length) throw new Error('B10_DATA_REQUIRES_PRESERVATION');
    await r.query('DROP TABLE app.place_pattern_decisions');
  }
}
