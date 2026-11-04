import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OwnAuth1794000000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const rows = (await runner.query(
      'SELECT current_database() AS database',
    )) as { database: string }[];
    const database = rows[0].database;
    if (!['techbus_dev', 'techbus_test'].includes(database))
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await runner.query(`CREATE TABLE app.auth_credentials (
      user_id uuid PRIMARY KEY REFERENCES app.team_users(id),
      email text NOT NULL UNIQUE CHECK(length(email) BETWEEN 3 AND 254 AND email=lower(btrim(email))),
      password_hash text NOT NULL,
      must_change boolean NOT NULL,
      temporary_expires_at timestamptz,
      version integer NOT NULL CHECK(version > 0),
      updated_at timestamptz NOT NULL,
      CHECK(must_change = (temporary_expires_at IS NOT NULL))
    )`);
    await runner.query(`CREATE TABLE app.auth_sessions (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES app.team_users(id),
      token_hash text NOT NULL UNIQUE, scope text NOT NULL CHECK(scope IN ('operation','password-change')),
      credential_version integer NOT NULL CHECK(credential_version > 0),
      created_at timestamptz NOT NULL, last_activity_at timestamptz NOT NULL,
      expires_at timestamptz NOT NULL, revoked_at timestamptz,
      CHECK(last_activity_at >= created_at), CHECK(expires_at > created_at)
    )`);
    await runner.query(
      'CREATE INDEX auth_sessions_user_idx ON app.auth_sessions(user_id)',
    );
    await runner.query(`CREATE TABLE app.auth_events (
      id uuid PRIMARY KEY, actor_id uuid REFERENCES app.team_users(id),
      target_id uuid NOT NULL REFERENCES app.team_users(id),
      kind text NOT NULL CHECK(kind IN ('bootstrap','create','provision','change','reset','logout','technical-reset')),
      occurred_at timestamptz NOT NULL,
      CHECK(actor_id IS NOT NULL OR kind IN ('bootstrap','technical-reset'))
    )`);
    await runner.query(
      'CREATE INDEX auth_events_target_idx ON app.auth_events(target_id)',
    );
    await runner.query(`CREATE TABLE app.auth_attempt_windows (
      key_hash text NOT NULL, window_start timestamptz NOT NULL,
      count integer NOT NULL CHECK(count >= 0), kind text NOT NULL CHECK(kind IN ('account','origin')),
      PRIMARY KEY(key_hash,window_start,kind)
    )`);
    for (const table of [
      'auth_credentials',
      'auth_sessions',
      'auth_attempt_windows',
    ])
      await runner.query(
        `GRANT SELECT,INSERT,UPDATE ON app.${table} TO "${database}_app"`,
      );
    await runner.query(
      `GRANT SELECT,INSERT ON app.auth_events TO "${database}_app"`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    // Lock before inspecting; a concurrent writer must not slip past the safety gate.
    await runner.query(
      'LOCK TABLE app.auth_credentials,app.auth_sessions,app.auth_events,app.auth_attempt_windows IN ACCESS EXCLUSIVE MODE',
    );
    const rows = (await runner.query(`SELECT
      (SELECT count(*) FROM app.auth_credentials)+(SELECT count(*) FROM app.auth_sessions)+
      (SELECT count(*) FROM app.auth_events)+(SELECT count(*) FROM app.auth_attempt_windows) AS count`)) as {
      count: string;
    }[];
    if (rows[0].count !== '0') throw new Error('AUTH_DATA_PRESENT');
    await runner.query(
      'DROP TABLE app.auth_attempt_windows,app.auth_events,app.auth_sessions,app.auth_credentials',
    );
  }
}
