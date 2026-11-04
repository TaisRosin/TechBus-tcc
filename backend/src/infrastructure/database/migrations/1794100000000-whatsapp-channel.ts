import type { MigrationInterface, QueryRunner } from 'typeorm';
export class WhatsAppChannel1794100000000 implements MigrationInterface {
  async up(r: QueryRunner): Promise<void> {
    const db = r.connection.options.database;
    if (db !== 'techbus_dev' && db !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await r.query(`CREATE TABLE app.whatsapp_events (
      id uuid PRIMARY KEY, instance text NOT NULL, kind text NOT NULL CHECK(kind IN ('message','status','connection')),
      external_id text NOT NULL CHECK(length(external_id) BETWEEN 1 AND 200), fingerprint text NOT NULL,
      received_at timestamptz NOT NULL, phone text, text_body text CHECK(length(text_body)<=4096), provider_status text,
      student_id uuid REFERENCES app.students(id), receipt_id uuid,
      disposition text NOT NULL CHECK(disposition IN ('pending','identity_pending','needs_text','evidence','unknown_contact')),
      conflict boolean NOT NULL DEFAULT false, UNIQUE(instance,kind,external_id),
      CHECK((student_id IS NULL)=(receipt_id IS NULL)),
      FOREIGN KEY(student_id,receipt_id) REFERENCES app.journey_receipts(student_id,id))`);
    await r.query(
      'CREATE INDEX whatsapp_events_receipt_idx ON app.whatsapp_events(student_id,receipt_id)',
    );
    await r.query(
      'CREATE INDEX whatsapp_events_received_idx ON app.whatsapp_events(received_at,id)',
    );
    await r.query(`CREATE TABLE app.whatsapp_attempts (
      attempt_id uuid PRIMARY KEY REFERENCES app.message_attempts(id), message_id uuid NOT NULL REFERENCES app.outgoing_messages(id),
      instance text NOT NULL,phone text NOT NULL,state text NOT NULL CHECK(state IN ('dispatching','sent','unknown','failed')),
      provider_id text CHECK(length(provider_id) BETWEEN 1 AND 180),created_at timestamptz NOT NULL,
      UNIQUE(instance,provider_id))`);
    await r.query(
      'CREATE INDEX whatsapp_attempts_message_idx ON app.whatsapp_attempts(message_id)',
    );
    for (const table of ['whatsapp_events', 'whatsapp_attempts']) {
      await r.query(`REVOKE ALL ON app.${table} FROM "${db}_app"`);
      await r.query(
        `GRANT SELECT,INSERT,UPDATE ON app.${table} TO "${db}_app"`,
      );
    }
  }
  async down(r: QueryRunner): Promise<void> {
    const rows = (await r.query(
      'SELECT 1 FROM app.whatsapp_events UNION ALL SELECT 1 FROM app.whatsapp_attempts LIMIT 1',
    )) as unknown[];
    if (rows.length) throw new Error('B18_DATA_REQUIRES_PRESERVATION');
    await r.query('DROP TABLE app.whatsapp_attempts');
    await r.query('DROP TABLE app.whatsapp_events');
  }
}
