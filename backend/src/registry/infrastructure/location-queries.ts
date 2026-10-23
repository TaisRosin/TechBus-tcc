import type { EntityManager } from 'typeorm';
import type { LocationTransaction } from '../application/location-ports';
import type {
  CatalogKind,
  CatalogRecord,
  PlaceDefault,
  ReturnLocation,
} from '../domain/locations';
const tables: Record<CatalogKind, string> = {
  group: 'local_groups',
  region: 'service_regions',
  point: 'boarding_points',
};
const columns = (kind: CatalogKind) =>
  `id,name,active,version${kind === 'group' ? ',direction' : ',group_id AS "groupId"'}${kind === 'point' ? ',address' : ''}`;
const locationColumns =
  'id,provider,external_key AS "externalKey",label,region_id AS "regionId",evidence';
export function locationQueries(m: EntityManager): LocationTransaction {
  return {
    lock: async () => {
      await m.query('SELECT pg_advisory_xact_lock(82406,1)');
    },
    get: async (kind, id) =>
      (
        await m.query<CatalogRecord[]>(
          `SELECT ${columns(kind)} FROM app.${tables[kind]} WHERE id=$1`,
          [id],
        )
      )[0] ?? null,
    list: (kind, limit, offset) =>
      m.query<CatalogRecord[]>(
        `SELECT ${columns(kind)} FROM app.${tables[kind]} ORDER BY id LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
    save: async (kind, r, insert) => {
      const names = [
        'id',
        'name',
        'active',
        'version',
        kind === 'group' ? 'direction' : 'group_id',
        ...(kind === 'point' ? ['address'] : []),
      ];
      const values = [
        r.id,
        r.name,
        r.active,
        r.version,
        kind === 'group' ? r.direction : r.groupId,
        ...(kind === 'point' ? [r.address] : []),
      ];
      const sql = insert
        ? `INSERT INTO app.${tables[kind]}(${names.join(',')}) VALUES(${names.map((_, i) => `$${i + 1}`).join(',')})`
        : `UPDATE app.${tables[kind]} SET ${names
            .slice(1)
            .map((n, i) => `${n}=$${i + 2}`)
            .join(',')} WHERE id=$1`;
      await m.query(sql, values);
    },
    location: async (id) =>
      (
        await m.query<ReturnLocation[]>(
          `SELECT ${locationColumns} FROM app.return_locations WHERE id=$1`,
          [id],
        )
      )[0] ?? null,
    byIdentity: async (provider, key) =>
      (
        await m.query<ReturnLocation[]>(
          `SELECT ${locationColumns} FROM app.return_locations WHERE provider=$1 AND external_key=$2`,
          [provider, key],
        )
      )[0] ?? null,
    insertLocation: async (r) => {
      await m.query(
        'INSERT INTO app.return_locations(id,provider,external_key,label,region_id,evidence) VALUES($1,$2,$3,$4,$5,$6)',
        [r.id, r.provider, r.externalKey, r.label, r.regionId, r.evidence],
      );
    },
    defaults: (id) =>
      m.query<PlaceDefault[]>(
        'SELECT student_id AS "studentId",direction,boarding_point_id AS "pointId",return_location_id AS "locationId",source,evidence,version FROM app.student_place_defaults WHERE student_id=$1 ORDER BY direction',
        [id],
      ),
    saveDefault: async (r) => {
      await m.query(
        'INSERT INTO app.student_place_defaults(student_id,direction,boarding_point_id,return_location_id,source,evidence,version) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(student_id,direction) DO UPDATE SET boarding_point_id=EXCLUDED.boarding_point_id,return_location_id=EXCLUDED.return_location_id,source=EXCLUDED.source,evidence=EXCLUDED.evidence,version=EXCLUDED.version',
        [
          r.studentId,
          r.direction,
          r.pointId,
          r.locationId,
          r.source,
          r.evidence,
          r.version,
        ],
      );
    },
  };
}
