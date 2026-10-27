import type { MigrationInterface, QueryRunner } from 'typeorm';

export class JourneyClosing1793200000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE app.daily_journeys
      DROP CONSTRAINT daily_journeys_dropoff_state_check,
      DROP CONSTRAINT daily_journeys_dropoff_origin_check,
      ADD CONSTRAINT daily_journeys_dropoff_state_check CHECK(dropoff_state IN ('sem_resposta','indeciso','confirmado','recusado','cancelado')),
      ADD CONSTRAINT daily_journeys_dropoff_origin_check CHECK(dropoff_origin IN ('none','aluno_explicito','implicito_da_ida','padrao_fechamento')),
      ADD COLUMN closed_sequence integer CHECK(closed_sequence>0),
      ADD COLUMN closure_issue text,
      ADD COLUMN closure_base_state text CHECK(closure_base_state IN ('sem_resposta','indeciso')),
      ADD COLUMN cancel_sequence integer CHECK(cancel_sequence>0),
      ADD CONSTRAINT daily_journeys_closing_origin_check CHECK(dropoff_origin<>'padrao_fechamento' OR (dropoff_state='confirmado' AND closure_base_state IS NOT NULL)),
      ADD CONSTRAINT daily_journeys_cancel_state_check CHECK((cancel_sequence IS NOT NULL)=(dropoff_state='cancelado'))`);
    await runner.query(
      'ALTER TABLE app.journey_receipts ADD COLUMN cancel_requested boolean NOT NULL DEFAULT false',
    );
    await runner.query(
      'CREATE INDEX daily_journeys_date_student_idx ON app.daily_journeys(date,student_id)',
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    const rows = (await runner.query(
      `SELECT 1 FROM app.daily_journeys WHERE closed_sequence IS NOT NULL OR cancel_sequence IS NOT NULL OR closure_issue IS NOT NULL OR closure_base_state IS NOT NULL OR dropoff_state='cancelado' OR dropoff_origin='padrao_fechamento' UNION ALL SELECT 1 FROM app.journey_receipts WHERE cancel_requested LIMIT 1`,
    )) as unknown[];
    if (rows.length) throw new Error('B08_DATA_REQUIRES_PRESERVATION');
    await runner.query('DROP INDEX app.daily_journeys_date_student_idx');
    await runner.query(
      'ALTER TABLE app.journey_receipts DROP COLUMN cancel_requested',
    );
    await runner.query(`ALTER TABLE app.daily_journeys
      DROP CONSTRAINT daily_journeys_closing_origin_check,
      DROP CONSTRAINT daily_journeys_cancel_state_check,
      DROP COLUMN closed_sequence,DROP COLUMN closure_issue,DROP COLUMN closure_base_state,DROP COLUMN cancel_sequence,
      DROP CONSTRAINT daily_journeys_dropoff_state_check,DROP CONSTRAINT daily_journeys_dropoff_origin_check,
      ADD CONSTRAINT daily_journeys_dropoff_state_check CHECK(dropoff_state IN ('sem_resposta','indeciso','confirmado','recusado')),
      ADD CONSTRAINT daily_journeys_dropoff_origin_check CHECK(dropoff_origin IN ('none','aluno_explicito','implicito_da_ida'))`);
  }
}
