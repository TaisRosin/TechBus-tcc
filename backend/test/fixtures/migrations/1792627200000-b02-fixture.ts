import type { MigrationInterface, QueryRunner } from 'typeorm';

// Synthetic fixture: never included in application migration discovery.
export class B02Fixture1792627200000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      'CREATE TABLE app.b02_fixture (id integer PRIMARY KEY, marker text NOT NULL)',
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE app.b02_fixture');
  }
}
