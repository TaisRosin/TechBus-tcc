import type { MigrationInterface, QueryRunner } from 'typeorm';
export class ConversationContext1794700000000 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(
      'ALTER TABLE app.whatsapp_events ADD COLUMN reply_to text CHECK(length(reply_to) BETWEEN 1 AND 200)',
    );
    await r.query(`CREATE TABLE app.conversation_clarifications(
   event_id uuid PRIMARY KEY REFERENCES app.whatsapp_events(id) ON DELETE CASCADE,
   student_id uuid NOT NULL REFERENCES app.students(id), instance text NOT NULL, phone text NOT NULL,date date NOT NULL,
   purpose text NOT NULL CHECK(purpose IN ('trip','pickup','dropoff','pickup-place','dropoff-place')),
   proposal jsonb NOT NULL,snapshot_hash text NOT NULL,text text NOT NULL,
   state text NOT NULL CHECK(state IN ('prepared','sending','sent','unknown','superseded','answered','escalated')),
   provider_id text,created_at timestamptz NOT NULL,dispatch_started_at timestamptz,dispatch_finished_at timestamptz,
   answer_event_id uuid REFERENCES app.whatsapp_events(id),code text NOT NULL)`);
    await r.query(
      'CREATE UNIQUE INDEX clarification_provider ON app.conversation_clarifications(instance,provider_id) WHERE provider_id IS NOT NULL',
    );
    await r.query(
      "CREATE UNIQUE INDEX clarification_active ON app.conversation_clarifications(student_id,date) WHERE state IN ('prepared','sending','sent','unknown','escalated')",
    );
    await r.query(
      "CREATE INDEX clarification_queue ON app.conversation_clarifications(created_at,event_id) WHERE state='prepared'",
    );
    await r.query(
      'CREATE INDEX clarification_answer ON app.conversation_clarifications(answer_event_id) WHERE answer_event_id IS NOT NULL',
    );
    await r.query(
      'ALTER TABLE app.message_interpretations ADD COLUMN context_event_id uuid REFERENCES app.conversation_clarifications(event_id)',
    );
    await r.query(
      'CREATE INDEX interpretation_context ON app.message_interpretations(context_event_id) WHERE context_event_id IS NOT NULL',
    );
    await r.query(
      `GRANT SELECT,INSERT,UPDATE ON app.conversation_clarifications TO "${db}_app"`,
    );
  }
  async down(r: QueryRunner): Promise<void> {
    const rows = (await r.query(
      'SELECT 1 FROM app.conversation_clarifications UNION ALL SELECT 1 FROM app.whatsapp_events WHERE reply_to IS NOT NULL LIMIT 1',
    )) as unknown[];
    if (rows.length) throw new Error('CONTEXT_EVIDENCE_REQUIRES_PRESERVATION');
    await r.query(
      'ALTER TABLE app.message_interpretations DROP COLUMN context_event_id',
    );
    await r.query('DROP TABLE app.conversation_clarifications');
    await r.query('ALTER TABLE app.whatsapp_events DROP COLUMN reply_to');
  }
}
