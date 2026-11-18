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
  dropoff: 'return_locations',
};
const columns = (kind: CatalogKind) =>
  `id,name,active,version${kind === 'group' ? ',direction' : ',group_id AS "groupId"'}${kind === 'point' || kind === 'dropoff' ? ',address,address_details AS "addressDetails",stop_reference AS "stopReference",legacy_address AS "legacyAddress"' : ''}`;
const locationColumns =
  'id,provider,external_key AS "externalKey",label,region_id AS "regionId",evidence,group_id AS "groupId",name,address,active,version,address_details AS "addressDetails",stop_reference AS "stopReference",legacy_address AS "legacyAddress"';
export function locationQueries(m: EntityManager): LocationTransaction {
  return {
    lock: async () => {
      await m.query('SELECT pg_advisory_xact_lock(82406,1)');
    },
    get: async (kind, id) =>
      (
        await m.query<CatalogRecord[]>(
          `SELECT ${columns(kind)} FROM app.${tables[kind]} WHERE id=$1${kind === 'dropoff' ? ' AND group_id IS NOT NULL' : ''}`,
          [id],
        )
      )[0] ?? null,
    list: (kind, limit, offset) =>
      m.query<CatalogRecord[]>(
        `SELECT ${columns(kind)} FROM app.${tables[kind]} ${kind === 'dropoff' ? 'WHERE group_id IS NOT NULL' : ''} ORDER BY id LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
    save: async (kind, r, insert) => {
      if (kind === 'dropoff') {
        if (insert)
          await m.query(
            "INSERT INTO app.return_locations(id,provider,external_key,label,evidence,name,address,group_id,active,version,address_details,stop_reference,legacy_address) VALUES($1::uuid,'company-fixed',$1::text,$2,'Company catalog',$3,$4,$5,$6,$7,$8::jsonb,$9,$10)",
            [
              r.id,
              r.name + ' — ' + r.address,
              r.name,
              r.address,
              r.groupId,
              r.active,
              r.version,
              r.addressDetails ? JSON.stringify(r.addressDetails) : null,
              r.stopReference ?? '',
              r.legacyAddress ?? null,
            ],
          );
        else
          await m.query(
            'UPDATE app.return_locations SET name=$2,address=$3,group_id=$4,active=$5,version=$6,label=$7,address_details=$8::jsonb,stop_reference=$9 WHERE id=$1 AND group_id IS NOT NULL',
            [
              r.id,
              r.name,
              r.address,
              r.groupId,
              r.active,
              r.version,
              r.name + ' — ' + r.address,
              r.addressDetails ? JSON.stringify(r.addressDetails) : null,
              r.stopReference ?? '',
            ],
          );
        return;
      }
      const names = [
        'id',
        'name',
        'active',
        'version',
        kind === 'group' ? 'direction' : 'group_id',
        ...(kind === 'point'
          ? [
              'address',
              'address_details',
              'stop_reference',
              ...(insert ? ['legacy_address'] : []),
            ]
          : []),
      ];
      const values = [
        r.id,
        r.name,
        r.active,
        r.version,
        kind === 'group' ? r.direction : r.groupId,
        ...(kind === 'point'
          ? [
              r.address,
              r.addressDetails ? JSON.stringify(r.addressDetails) : null,
              r.stopReference ?? '',
              ...(insert ? [r.legacyAddress ?? null] : []),
            ]
          : []),
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
