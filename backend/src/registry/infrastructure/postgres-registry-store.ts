import { DataSource, type EntityManager, QueryFailedError } from 'typeorm';
import type { DatabaseConfig } from '../../config/environment';
import { AccessError } from '../../access/domain/access';
import { RegistryStore, type RegistryTransaction } from '../application/ports';
import type { Student, Contract, University } from '../domain/registry';
import type { Calendar, CalendarException } from '../domain/calendar';
import { locationQueries } from './location-queries';

const studentColumns =
  'id,name,phone,university_id AS "universityId",habitual_days AS "habitualDays",active,version';
const contractColumns =
  'id,student_id AS "studentId",start_date::text AS "startDate",end_date::text AS "endDate",version';
export class PostgresRegistryStore extends RegistryStore {
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
  async transaction<T>(
    work: (tx: RegistryTransaction) => Promise<T>,
  ): Promise<T> {
    try {
      if (this.closed) throw new AccessError('REGISTRY_UNAVAILABLE', 503);
      if (!this.source.isInitialized) {
        this.initializing ??= this.source
          .initialize()
          .catch((error: unknown) => {
            this.initializing = undefined;
            throw error;
          });
        await this.initializing;
      }
      return await this.source.transaction('READ COMMITTED', (manager) =>
        work(this.port(manager)),
      );
    } catch (error) {
      if (error instanceof AccessError) throw error;
      if (error instanceof QueryFailedError) {
        const driver = error.driverError as {
          code?: string;
          constraint?: string;
        };
        if (
          driver.code === '23505' &&
          driver.constraint === 'students_phone_key'
        )
          throw new AccessError('PHONE_IN_USE', 409);
      }
      throw new AccessError('REGISTRY_UNAVAILABLE', 503);
    }
  }
  private port(m: EntityManager): RegistryTransaction {
    return {
      places: locationQueries(m),
      calendar: async (id, lock) =>
        (
          await m.query<Calendar[]>(
            `SELECT university_id AS "universityId",days,version FROM app.university_calendars WHERE university_id=$1 FOR ${lock === 'write' ? 'UPDATE' : 'SHARE'}`,
            [id],
          )
        )[0] ?? null,
      saveCalendar: async (c) => {
        await m.query(
          'UPDATE app.university_calendars SET days=$2,version=$3 WHERE university_id=$1',
          [c.universityId, c.days, c.version],
        );
      },
      exceptions: (id, from, to) =>
        m.query<CalendarException[]>(
          'SELECT university_id AS "universityId",date::text,operates,reason FROM app.calendar_exceptions WHERE university_id=$1 AND date BETWEEN $2::date AND $3::date ORDER BY date',
          [id, from, to],
        ),
      saveException: async (e) => {
        await m.query(
          'INSERT INTO app.calendar_exceptions(university_id,date,operates,reason) VALUES($1,$2,$3,$4) ON CONFLICT(university_id,date) DO UPDATE SET operates=EXCLUDED.operates,reason=EXCLUDED.reason',
          [e.universityId, e.date, e.operates, e.reason],
        );
      },
      authorize: async (subject) => {
        const rows = await m.query<{ active: boolean; role: string }[]>(
          'SELECT active,role FROM app.team_users WHERE subject=$1 FOR SHARE',
          [subject],
        );
        if (!rows[0]?.active || !['admin', 'operator'].includes(rows[0].role))
          throw new AccessError('FORBIDDEN', 403);
      },
      universities: () =>
        m.query<University[]>(
          'SELECT id,name FROM app.universities ORDER BY id',
        ),
      students: (limit, offset) =>
        m.query<Student[]>(
          `SELECT ${studentColumns} FROM app.students ORDER BY id LIMIT $1 OFFSET $2`,
          [limit, offset],
        ),
      student: async (id, lock = false) =>
        (
          await m.query<Student[]>(
            `SELECT ${studentColumns} FROM app.students WHERE id=$1${lock ? ' FOR UPDATE' : ''}`,
            [id],
          )
        )[0] ?? null,
      byPhone: async (phone) =>
        (
          await m.query<Student[]>(
            `SELECT ${studentColumns} FROM app.students WHERE phone=$1`,
            [phone],
          )
        )[0] ?? null,
      saveStudent: async (s, insert) => {
        const params = [
          s.id,
          s.name,
          s.phone,
          s.universityId,
          s.habitualDays,
          s.active,
          s.version,
        ];
        await m.query(
          insert
            ? 'INSERT INTO app.students(id,name,phone,university_id,habitual_days,active,version) VALUES($1,$2,$3,$4,$5,$6,$7)'
            : 'UPDATE app.students SET name=$2,phone=$3,university_id=$4,habitual_days=$5,active=$6,version=$7 WHERE id=$1',
          params,
        );
      },
      contracts: (studentId) =>
        m.query<Contract[]>(
          `SELECT ${contractColumns} FROM app.contracts WHERE student_id=$1 ORDER BY start_date,id`,
          [studentId],
        ),
      contract: async (id) =>
        (
          await m.query<Contract[]>(
            `SELECT ${contractColumns} FROM app.contracts WHERE id=$1`,
            [id],
          )
        )[0] ?? null,
      overlaps: async (studentId, period, exceptId) =>
        (
          await m.query<{ id: string }[]>(
            'SELECT id FROM app.contracts WHERE student_id=$1 AND start_date <= $3::date AND end_date >= $2::date AND ($4::uuid IS NULL OR id <> $4) LIMIT 1',
            [studentId, period.startDate, period.endDate, exceptId ?? null],
          )
        ).length > 0,
      saveContract: async (c, insert) => {
        await m.query(
          insert
            ? 'INSERT INTO app.contracts(id,student_id,start_date,end_date,version) VALUES($1,$2,$3,$4,$5)'
            : 'UPDATE app.contracts SET start_date=$3,end_date=$4,version=$5 WHERE id=$1 AND student_id=$2',
          [c.id, c.studentId, c.startDate, c.endDate, c.version],
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
