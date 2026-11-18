import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
describe('Fleet database boundaries', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = createTestDataSource(loadLocalEnvironment('test'));
    await source.initialize();
    await source.runMigrations();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });
  it('accepts only seven explicit daily booleans or unconfigured availability', async () => {
    expect(
      await source.query(`SELECT
      app.valid_daily_week('[false,true,true,true,true,true,false]'::jsonb) AS valid,
      app.valid_daily_week(NULL) AS unconfigured,
      app.valid_daily_week('[true,false]'::jsonb) AS incomplete,
      app.valid_daily_week('[true,true,true,true,true,true,1]'::jsonb) AS coerced,
      app.valid_daily_week('[[],[],[],[],[],[],[]]'::jsonb) AS legacy`),
    ).toEqual([
      {
        valid: true,
        unconfigured: true,
        incomplete: false,
        coerced: false,
        legacy: false,
      },
    ]);
  });
  it('validates availability structure in PostgreSQL and preserves restricted app privileges', async () => {
    expect(
      await source.query(
        'SELECT app.valid_fleet_windows($1::jsonb) AS valid,app.valid_fleet_windows($2::jsonb) AS invalid',
        [
          JSON.stringify([{ stage: 'collection', start: 10, end: 20 }]),
          JSON.stringify([{ stage: 'collection', start: 10, end: 10 }]),
        ],
      ),
    ).toEqual([{ valid: true, invalid: false }]);
    const user = readEnvironment(loadLocalEnvironment('test')).database.user;
    expect(
      await source.query(
        "SELECT has_table_privilege($1,'app.fleet_vehicles','UPDATE') AS edit,has_table_privilege($1,'app.fleet_vehicles','DELETE') AS remove,has_schema_privilege($1,'app','CREATE') AS ddl",
        [user],
      ),
    ).toEqual([{ edit: true, remove: false, ddl: false }]);
  });
  it.each(
    [
      null,
      [{ stage: 'collection', start: '10', end: 20 }],
      [
        { stage: 'collection', start: 10, end: 30 },
        { stage: 'collection', start: 20, end: 40 },
      ],
      [{ stage: 'collection', start: 0, end: 3000 }],
      [{ stage: 'distribution', start: 1470, end: 1530, flag: true }],
    ].map((value) => [value]),
  )('rejects invalid persisted windows %#', async (value) => {
    expect(
      await source.query('SELECT app.valid_fleet_windows($1::jsonb) AS valid', [
        JSON.stringify(value),
      ]),
    ).toEqual([{ valid: false }]);
  });
  it('supports explicit empty schedules, full weeks and post-midnight windows', async () => {
    expect(
      await source.query(
        'SELECT app.valid_fleet_windows($1::jsonb) AS overnight,app.valid_fleet_week($2::jsonb) AS week,app.valid_fleet_week($3::jsonb) AS incomplete',
        [
          JSON.stringify([{ stage: 'distribution', start: 1470, end: 1530 }]),
          JSON.stringify([[], [], [], [], [], [], []]),
          JSON.stringify([[]]),
        ],
      ),
    ).toEqual([{ overnight: true, week: true, incomplete: false }]);
  });
});
