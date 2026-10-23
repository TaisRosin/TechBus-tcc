import { ConfigurationError } from '../../src/config/environment';
import { createMigrationDataSource } from '../../src/infrastructure/database/data-source';

export function createTestDataSource(raw: NodeJS.ProcessEnv) {
  if (raw.APP_ENV !== 'test') throw new ConfigurationError('APP_ENV');
  return createMigrationDataSource(raw);
}
