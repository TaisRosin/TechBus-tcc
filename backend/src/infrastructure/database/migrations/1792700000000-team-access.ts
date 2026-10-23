import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TeamAccess1792700000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const rows = (await runner.query(
      'SELECT current_database() AS database',
    )) as { database: string }[];
    const database = rows[0]?.database;
    if (database !== 'techbus_dev' && database !== 'techbus_test')
      throw new Error('LOCAL_DATABASE_REQUIRED');
    await runner.query(`CREATE TABLE app.team_users (
      id uuid PRIMARY KEY,
      subject uuid NOT NULL UNIQUE,
      role text NOT NULL CHECK (role IN ('admin','operator','driver')),
      active boolean NOT NULL,
      version integer NOT NULL DEFAULT 1 CHECK (version > 0)
    )`);
    // Role identifier derives only from the two validated local database names.
    await runner.query(
      `GRANT SELECT, INSERT, UPDATE ON app.team_users TO "${database}_app"`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE app.team_users');
  }
}
