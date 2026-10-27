import type { MigrationInterface, QueryRunner } from 'typeorm';
export class Messages1793700000000 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(
      'ALTER TABLE app.daily_journeys ADD COLUMN student_initiated boolean NOT NULL DEFAULT false, ADD COLUMN student_initiated_at timestamptz',
    );
    await r.query(`CREATE TABLE app.outgoing_messages(
      id uuid PRIMARY KEY,student_id uuid NOT NULL REFERENCES app.students(id),date date NOT NULL,
      slot smallint NOT NULL CHECK(slot IN (5,11,13,16,17)),
      status varchar(12) NOT NULL CHECK(status IN ('ready','sending','sent','failed','unknown','skipped')),
      version integer NOT NULL CHECK(version>0),phone text NOT NULL,text text NOT NULL,code text,
      UNIQUE(student_id,date,slot))`);
    await r.query(
      'CREATE INDEX outgoing_messages_date_idx ON app.outgoing_messages(date,id)',
    );
    await r.query(`CREATE TABLE app.message_attempts(
      id uuid PRIMARY KEY,message_id uuid NOT NULL REFERENCES app.outgoing_messages(id),
      number integer NOT NULL CHECK(number>0),phone text NOT NULL,text text NOT NULL,
      status varchar(12) NOT NULL CHECK(status IN ('sending','sent','failed','unknown')),
      code text,started_at timestamptz NOT NULL,finished_at timestamptz,UNIQUE(message_id,number))`);
    for (const table of ['outgoing_messages', 'message_attempts']) {
      await r.query(`REVOKE ALL ON app.${table} FROM "${db}_app"`);
      await r.query(
        `GRANT SELECT,INSERT,UPDATE ON app.${table} TO "${db}_app"`,
      );
    }
  }
  async down(r: QueryRunner): Promise<void> {
    const rows = (await r.query(
      'SELECT 1 FROM app.outgoing_messages UNION ALL SELECT 1 FROM app.daily_journeys WHERE student_initiated LIMIT 1',
    )) as unknown[];
    if (rows.length) throw new Error('B14_DATA_REQUIRES_PRESERVATION');
    await r.query('DROP TABLE app.message_attempts');
    await r.query('DROP TABLE app.outgoing_messages');
    await r.query(
      'ALTER TABLE app.daily_journeys DROP COLUMN student_initiated, DROP COLUMN student_initiated_at',
    );
  }
}
