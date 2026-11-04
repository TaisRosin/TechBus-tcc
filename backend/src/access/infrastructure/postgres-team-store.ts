import { DataSource, type EntityManager } from 'typeorm';
import type { DatabaseConfig } from '../../config/environment';
import { TeamStore, type TeamTransaction } from '../application/ports';
import { AccessError, type TeamUser } from '../domain/access';

const columns = 'id, subject, role, active, version';
export class PostgresTeamStore extends TeamStore {
  private readonly source: DataSource;
  private initializing?: Promise<DataSource>;
  private closed = false;
  constructor(config: DatabaseConfig) {
    super();
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
  private async use<T>(work: (source: DataSource) => Promise<T>): Promise<T> {
    try {
      if (this.closed) throw new AccessError('ACCESS_UNAVAILABLE', 503);
      if (!this.source.isInitialized) {
        this.initializing ??= this.source
          .initialize()
          .catch((error: unknown) => {
            this.initializing = undefined;
            throw error;
          });
        await this.initializing;
      }
      return await work(this.source);
    } catch (error) {
      if (error instanceof AccessError) throw error;
      throw new AccessError('ACCESS_UNAVAILABLE', 503);
    }
  }
  bySubject(subject: string): Promise<TeamUser | null> {
    return this.use(async (source) => {
      const rows = await source.query<TeamUser[]>(
        `SELECT ${columns} FROM app.team_users WHERE subject=$1`,
        [subject],
      );
      return rows[0] ?? null;
    });
  }
  transaction<T>(work: (tx: TeamTransaction) => Promise<T>): Promise<T> {
    return this.use((source) =>
      source.transaction('READ COMMITTED', async (manager) => {
        // Every application access mutation shares this transaction-scoped lock.
        // Reads below occur AFTER acquisition, so the actor/count reflect committed changes.
        await manager.query('SELECT pg_advisory_xact_lock(82403, 1)');
        return work(this.transactionPort(manager));
      }),
    );
  }
  private transactionPort(manager: EntityManager): TeamTransaction {
    return {
      bySubject: async (subject) => {
        const rows = await manager.query<TeamUser[]>(
          `SELECT ${columns} FROM app.team_users WHERE subject=$1`,
          [subject],
        );
        return rows[0] ?? null;
      },
      byId: async (id) => {
        const rows = await manager.query<TeamUser[]>(
          `SELECT ${columns} FROM app.team_users WHERE id=$1`,
          [id],
        );
        return rows[0] ?? null;
      },
      activeAdmins: async () => {
        const rows = await manager.query<{ count: string }[]>(
          "SELECT count(*) FROM app.team_users WHERE active AND role='admin'",
        );
        return Number(rows[0].count);
      },
      save: async (user) => {
        await manager.query(
          'UPDATE app.team_users SET role=$2, active=$3, version=$4 WHERE id=$1',
          [user.id, user.role, user.active, user.version],
        );
        if (!user.active)
          await manager.query(
            'UPDATE app.auth_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1',
            [user.id],
          );
      },
    };
  }
  async close(): Promise<void> {
    this.closed = true;
    if (this.initializing) await this.initializing.catch(() => undefined);
    if (this.source.isInitialized) await this.source.destroy();
  }
  onModuleDestroy(): Promise<void> {
    return this.close();
  }
}
