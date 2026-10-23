import type { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentRegistry1792800000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const rows = (await runner.query(
      'SELECT current_database() AS database',
    )) as { database: string }[];
    const database = rows[0]?.database;
    if (database !== 'techbus_dev' && database !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await runner.query(`CREATE TABLE app.universities (
      id text PRIMARY KEY CHECK (id IN ('unimater','unidep')), name text NOT NULL
    )`);
    await runner.query(
      "INSERT INTO app.universities(id,name) VALUES ('unimater','Unimater'),('unidep','Unidep')",
    );
    await runner.query(`CREATE TABLE app.students (
      id uuid PRIMARY KEY,
      name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
      phone text NOT NULL CONSTRAINT students_phone_key UNIQUE CHECK (phone ~ '^\\+[1-9][0-9]{7,14}$'),
      university_id text NOT NULL REFERENCES app.universities(id),
      habitual_days smallint[] NOT NULL CHECK (habitual_days <@ ARRAY[0,1,2,3,4,5,6]::smallint[] AND cardinality(habitual_days)<=7 AND array_position(habitual_days,NULL) IS NULL),
      active boolean NOT NULL DEFAULT true,
      version integer NOT NULL DEFAULT 1 CHECK (version > 0)
    )`);
    await runner.query(`CREATE TABLE app.contracts (
      id uuid PRIMARY KEY,
      student_id uuid NOT NULL REFERENCES app.students(id) ON DELETE RESTRICT,
      start_date date NOT NULL, end_date date NOT NULL,
      version integer NOT NULL DEFAULT 1 CHECK (version > 0),
      CHECK (start_date <= end_date AND start_date >= DATE '0001-01-01' AND end_date <= DATE '9999-12-31')
    )`);
    await runner.query(
      'CREATE INDEX contracts_student_period_idx ON app.contracts(student_id,start_date,end_date)',
    );
    await runner.query(`GRANT SELECT ON app.universities TO "${database}_app"`);
    await runner.query(
      `GRANT SELECT, INSERT, UPDATE ON app.students, app.contracts TO "${database}_app"`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE app.contracts');
    await runner.query('DROP TABLE app.students');
    await runner.query('DROP TABLE app.universities');
  }
}
