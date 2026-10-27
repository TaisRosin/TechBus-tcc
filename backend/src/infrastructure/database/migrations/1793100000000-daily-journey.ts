import type { MigrationInterface, QueryRunner } from 'typeorm';
export class DailyJourney1793100000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const rows = (await runner.query(
      'SELECT current_database() AS database',
    )) as { database: string }[];
    const db = rows[0]?.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await runner.query(`CREATE TABLE app.daily_journeys(
      student_id uuid NOT NULL REFERENCES app.students(id),date date NOT NULL,
      university_id text NOT NULL REFERENCES app.universities(id),origin text NOT NULL CHECK(origin IN ('habitual','extra')),
      version integer NOT NULL CHECK(version>0),last_sequence integer NOT NULL CHECK(last_sequence>0),
      point_id uuid REFERENCES app.boarding_points(id),location_id uuid REFERENCES app.return_locations(id),
      pickup_state text NOT NULL CHECK(pickup_state IN ('sem_resposta','indeciso','confirmado','recusado')),
      dropoff_state text NOT NULL CHECK(dropoff_state IN ('sem_resposta','indeciso','confirmado','recusado')),
      pickup_origin text NOT NULL CHECK(pickup_origin IN ('none','aluno_explicito','implicito_da_ida')),
      dropoff_origin text NOT NULL CHECK(dropoff_origin IN ('none','aluno_explicito','implicito_da_ida')),
      PRIMARY KEY(student_id,date),
      CHECK((pickup_state='sem_resposta')=(pickup_origin='none')),
      CHECK((dropoff_state='sem_resposta')=(dropoff_origin='none')),
      CHECK(pickup_origin<>'implicito_da_ida'),
      CHECK(dropoff_origin<>'implicito_da_ida' OR dropoff_state='confirmado')
    )`);
    await runner.query(`CREATE TABLE app.journey_receipts(
      student_id uuid NOT NULL REFERENCES app.students(id),id uuid NOT NULL,
      sequence integer NOT NULL CHECK(sequence>0),received_at timestamptz NOT NULL,date date NOT NULL,
      ordering text NOT NULL CHECK(ordering IN ('received','uncertain')),result jsonb,
      PRIMARY KEY(student_id,id),UNIQUE(student_id,sequence),
      CHECK(result IS NULL OR (jsonb_typeof(result)='object' AND result->>'status' IN ('applied','rejected','pending')))
    )`);
    for (const column of ['university_id', 'point_id', 'location_id'])
      await runner.query(
        `CREATE INDEX daily_journeys_${column}_idx ON app.daily_journeys(${column})`,
      );
    await runner.query(
      'CREATE INDEX journey_receipts_student_date_idx ON app.journey_receipts(student_id,date,sequence)',
    );
    await runner.query(
      `GRANT SELECT,INSERT,UPDATE ON app.daily_journeys,app.journey_receipts TO "${db}_app"`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE app.journey_receipts');
    await runner.query('DROP TABLE app.daily_journeys');
  }
}
