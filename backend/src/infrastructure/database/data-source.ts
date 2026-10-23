import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { ConfigurationError, readEnvironment } from '../../config/environment';

export function createMigrationDataSource(raw: NodeJS.ProcessEnv): DataSource {
  const { database } = readEnvironment(raw);
  const expectedUser = `${database.database}_migrator`;
  if (raw.DB_MIGRATION_USER !== expectedUser)
    throw new ConfigurationError('DB_MIGRATION_USER');
  if (!raw.DB_MIGRATION_PASSWORD?.trim())
    throw new ConfigurationError('DB_MIGRATION_PASSWORD');
  return new DataSource({
    type: 'postgres',
    host: database.host,
    port: database.port,
    database: database.database,
    username: expectedUser,
    password: raw.DB_MIGRATION_PASSWORD,
    schema: 'app',
    synchronize: false,
    migrationsRun: false,
    logging: false,
    entities: [],
    migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
    migrationsTableName: 'typeorm_migrations',
    migrationsTransactionMode: 'all',
    extra: { max: 2, connectionTimeoutMillis: 2000, statement_timeout: 2000 },
  });
}
