import { createTestDataSource } from '../support/test-database';
import { syntheticEnvironment } from '../support/environment';

describe('Test database boundary', () => {
  it.each([
    { APP_ENV: 'development' },
    { DB_HOST: 'external.invalid' },
    { DB_PORT: '55432' },
    { DB_NAME: 'techbus_dev' },
    { DB_USER: 'techbus_dev_app' },
    { DATABASE_URL: 'postgres://remote.invalid/prod' },
  ])(
    'refuses unsafe configuration before constructing a connection: %j',
    (override) => {
      expect(() =>
        createTestDataSource({
          ...syntheticEnvironment,
          DB_MIGRATION_USER: 'techbus_test_migrator',
          DB_MIGRATION_PASSWORD: 'synthetic-migration',
          ...override,
        }),
      ).toThrow('CONFIG_INVALID');
    },
  );
});
