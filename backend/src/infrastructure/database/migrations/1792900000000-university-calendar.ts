import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UniversityCalendar1792900000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const rows = (await runner.query(
      'SELECT current_database() AS database',
    )) as { database: string }[];
    const database = rows[0]?.database;
    if (database !== 'techbus_dev' && database !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await runner.query(`CREATE TABLE app.university_calendars (
      university_id text PRIMARY KEY REFERENCES app.universities(id),
      days smallint[] CHECK (days <@ ARRAY[0,1,2,3,4,5,6]::smallint[] AND cardinality(days)<=7 AND array_position(days,NULL) IS NULL),
      version integer NOT NULL DEFAULT 1 CHECK(version>0)
    )`);
    await runner.query(
      'INSERT INTO app.university_calendars(university_id) SELECT id FROM app.universities',
    );
    await runner.query(`CREATE TABLE app.calendar_exceptions (
      university_id text NOT NULL REFERENCES app.university_calendars(university_id),
      date date NOT NULL CHECK(date BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'),
      operates boolean,
      reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 500),
      PRIMARY KEY(university_id,date)
    )`);
    await runner.query(
      `GRANT SELECT, UPDATE ON app.university_calendars TO "${database}_app"`,
    );
    await runner.query(
      `GRANT SELECT, INSERT, UPDATE ON app.calendar_exceptions TO "${database}_app"`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE app.calendar_exceptions');
    await runner.query('DROP TABLE app.university_calendars');
  }
}
