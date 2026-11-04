import { DataSource, type EntityManager } from 'typeorm';
import type { DatabaseConfig } from '../../config/environment';
import { AccessError } from '../domain/access';

export class PostgresAuthStore {
  private readonly source: DataSource;
  private initializing?: Promise<DataSource>;
  private closed = false;
  constructor(config: DatabaseConfig) {
    this.source = new DataSource({
      type: 'postgres',
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.user,
      password: config.password,
      schema: 'app',
      synchronize: false,
      migrationsRun: false,
      logging: false,
      entities: [],
      extra: { max: 2, connectionTimeoutMillis: 2000, statement_timeout: 2000 },
    });
  }
  async transaction<T>(work: (tx: EntityManager) => Promise<T>): Promise<T> {
    try {
      if (this.closed) throw new Error('closed');
      if (!this.source.isInitialized) {
        this.initializing ??= this.source
          .initialize()
          .catch((error: unknown) => {
            this.initializing = undefined;
            throw error;
          });
        await this.initializing;
      }
      return await this.source.transaction('READ COMMITTED', async (tx) => {
        await tx.query('SELECT pg_advisory_xact_lock(82403,1)');
        return work(tx);
      });
    } catch (error) {
      if (error instanceof AccessError) throw error;
      throw new AccessError('AUTH_UNAVAILABLE', 503);
    }
  }
  async close(): Promise<void> {
    this.closed = true;
    await this.initializing?.catch(() => undefined);
    if (this.source.isInitialized) await this.source.destroy();
  }
  onModuleDestroy(): Promise<void> {
    return this.close();
  }
}
