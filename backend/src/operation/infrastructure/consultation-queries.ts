import type { EntityManager } from 'typeorm';
import type { TeamUser } from '../../access/domain/access';
import type {
  ConsultationTransaction,
  DriverLink,
} from '../application/consultation-ports';
import type { Member } from '../domain/consultation';
export function consultationQueries(m: EntityManager): ConsultationTransaction {
  const linkColumns = 'user_id AS "userId",driver_id AS "driverId",version';
  return {
    lockAccess: async () => {
      await m.query('SELECT pg_advisory_xact_lock(82403,1)');
    },
    actor: async (subject) =>
      (
        await m.query<TeamUser[]>(
          'SELECT id,subject,role,active,version FROM app.team_users WHERE subject=$1 FOR SHARE',
          [subject],
        )
      )[0] ?? null,
    user: async (id) =>
      (
        await m.query<TeamUser[]>(
          'SELECT id,subject,role,active,version FROM app.team_users WHERE id=$1 FOR SHARE',
          [id],
        )
      )[0] ?? null,
    link: async (id) =>
      (
        await m.query<DriverLink[]>(
          `SELECT ${linkColumns} FROM app.driver_access_links WHERE user_id=$1`,
          [id],
        )
      )[0] ?? null,
    owner: async (id) =>
      (
        await m.query<DriverLink[]>(
          `SELECT ${linkColumns} FROM app.driver_access_links WHERE driver_id=$1`,
          [id],
        )
      )[0] ?? null,
    saveLink: async (l) => {
      await m.query(
        'INSERT INTO app.driver_access_links(user_id,driver_id,version) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET driver_id=EXCLUDED.driver_id,version=EXCLUDED.version',
        [l.userId, l.driverId, l.version],
      );
    },
    manifest: async (date, version) =>
      (
        await m.query<{ members: Member[] }[]>(
          'SELECT members FROM app.operation_manifests WHERE date=$1::date AND version=$2',
          [date, version],
        )
      )[0]?.members ?? null,
    saveManifest: async (date, version, members) => {
      await m.query(
        'INSERT INTO app.operation_manifests(date,version,members) VALUES($1,$2,$3::jsonb)',
        [date, version, JSON.stringify(members)],
      );
    },
  };
}
