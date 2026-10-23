import { Client } from 'pg';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';

describe('Local PostgreSQL privileges', () => {
  it.each(['dev', 'test'] as const)(
    '%s app cannot create tables or administer the cluster',
    async (mode) => {
      const { database } = readEnvironment(loadLocalEnvironment(mode));
      const client = new Client({ ...database, connectionTimeoutMillis: 2000 });
      try {
        await client.connect();
        const result = await client.query<{
          superuser: boolean;
          createdb: boolean;
          createrole: boolean;
          create_schema: boolean;
        }>(
          "SELECT rolsuper AS superuser, rolcreatedb AS createdb, rolcreaterole AS createrole, has_schema_privilege(current_user, 'app', 'CREATE') AS create_schema FROM pg_roles WHERE rolname=current_user",
        );
        expect(result.rows).toEqual([
          {
            superuser: false,
            createdb: false,
            createrole: false,
            create_schema: false,
          },
        ]);
      } finally {
        await client.end();
      }
    },
  );
});
