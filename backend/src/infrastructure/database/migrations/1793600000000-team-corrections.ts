import type { MigrationInterface, QueryRunner } from 'typeorm';
export class TeamCorrections1793600000000 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(`ALTER TABLE app.daily_journeys DROP CONSTRAINT daily_journeys_pickup_origin_check,DROP CONSTRAINT daily_journeys_dropoff_origin_check,
      ADD CONSTRAINT daily_journeys_pickup_origin_check CHECK(pickup_origin IN ('none','aluno_explicito','implicito_da_ida','equipe')),
      ADD CONSTRAINT daily_journeys_dropoff_origin_check CHECK(dropoff_origin IN ('none','aluno_explicito','implicito_da_ida','padrao_fechamento','equipe')),
      ADD CONSTRAINT daily_journeys_team_states_check CHECK((pickup_origin<>'equipe' OR pickup_state IN ('confirmado','recusado')) AND (dropoff_origin<>'equipe' OR dropoff_state IN ('confirmado','recusado')))`);
    await r.query(
      `CREATE TABLE app.team_corrections(student_id uuid NOT NULL,operation_id uuid NOT NULL,date date NOT NULL,actor_id uuid NOT NULL REFERENCES app.team_users(id),request_hash varchar(64) NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),reason varchar(1000) NOT NULL CHECK(length(btrim(reason))>0),created_at timestamptz NOT NULL,result jsonb NOT NULL CHECK(jsonb_typeof(result)='object'),PRIMARY KEY(student_id,operation_id),FOREIGN KEY(student_id,operation_id) REFERENCES app.journey_receipts(student_id,id))`,
    );
    await r.query(
      'CREATE INDEX team_corrections_actor_idx ON app.team_corrections(actor_id)',
    );
    await r.query(
      'CREATE INDEX team_corrections_student_date_idx ON app.team_corrections(student_id,date)',
    );
    await r.query(`REVOKE ALL ON app.team_corrections FROM "${db}_app"`);
    await r.query(`GRANT SELECT,INSERT ON app.team_corrections TO "${db}_app"`);
  }
  async down(r: QueryRunner): Promise<void> {
    const rows = (await r.query(
      `SELECT 1 FROM app.team_corrections UNION ALL SELECT 1 FROM app.daily_journeys WHERE pickup_origin='equipe' OR dropoff_origin='equipe' LIMIT 1`,
    )) as unknown[];
    if (rows.length) throw new Error('B13_DATA_REQUIRES_PRESERVATION');
    await r.query('DROP TABLE app.team_corrections');
    await r.query(`ALTER TABLE app.daily_journeys DROP CONSTRAINT daily_journeys_team_states_check,DROP CONSTRAINT daily_journeys_pickup_origin_check,DROP CONSTRAINT daily_journeys_dropoff_origin_check,
      ADD CONSTRAINT daily_journeys_pickup_origin_check CHECK(pickup_origin IN ('none','aluno_explicito','implicito_da_ida')),
      ADD CONSTRAINT daily_journeys_dropoff_origin_check CHECK(dropoff_origin IN ('none','aluno_explicito','implicito_da_ida','padrao_fechamento'))`);
  }
}
