import { Pool, type PoolClient } from 'pg';
import type { DatabaseConfig } from '../../config/environment';
import type { DatabaseProbe } from '../../health/application/ports/database-probe';

export class PostgresProbe implements DatabaseProbe {
  private readonly pool: Pool;
  private closing?: Promise<void>;
  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      ...config,
      max: 2,
      connectionTimeoutMillis: 2000,
      query_timeout: 2000,
      statement_timeout: 2000,
      idleTimeoutMillis: 1000,
      allowExitOnIdle: true,
    });
    this.pool.on('error', () => {
      /* pg removes failed idle clients; do not expose connection details. */
    });
  }
  async check(): Promise<boolean> {
    if (this.closing) return false;
    let client: PoolClient | undefined;
    let expired = false;
    let timer: NodeJS.Timeout | undefined;
    const work = async (): Promise<boolean> => {
      try {
        const acquired = await this.pool.connect();
        if (expired) {
          acquired.release(true);
          return false;
        }
        client = acquired;
        await acquired.query('SELECT 1');
        return true;
      } catch {
        return false;
      } finally {
        if (client) {
          client.release(expired);
          client = undefined;
        }
      }
    };
    const deadline = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => {
        expired = true;
        if (client) {
          client.release(true);
          client = undefined;
        }
        resolve(false);
      }, 2000);
    });
    try {
      return await Promise.race([work(), deadline]);
    } finally {
      clearTimeout(timer);
    }
  }
  close(): Promise<void> {
    this.closing ??= this.pool.end();
    return this.closing;
  }
  onModuleDestroy(): Promise<void> {
    return this.close();
  }
}
