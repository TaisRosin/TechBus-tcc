import type { EntityManager } from 'typeorm';
import type { FleetTransaction, Vehicle, Driver } from '../application/ports';
export function fleetQueries(m: EntityManager): FleetTransaction {
  return {
    exceptions: (id, from, to) =>
      m.query(
        'SELECT date::text,windows FROM app.fleet_exceptions WHERE vehicle_id=$1 AND date BETWEEN $2::date AND $3::date AND windows IS NOT NULL ORDER BY date',
        [id, from, to],
      ),
    saveException: async (id, date, windows) => {
      await m.query(
        'INSERT INTO app.fleet_exceptions(vehicle_id,date,windows) VALUES($1,$2,$3::jsonb) ON CONFLICT(vehicle_id,date) DO UPDATE SET windows=EXCLUDED.windows',
        [id, date, windows === null ? null : JSON.stringify(windows)],
      );
    },
    vehicles: (limit, offset) =>
      m.query<Vehicle[]>(
        'SELECT * FROM app.fleet_vehicles ORDER BY id LIMIT $1 OFFSET $2',
        [limit, offset],
      ),
    drivers: (limit, offset) =>
      m.query<Driver[]>(
        'SELECT * FROM app.fleet_drivers ORDER BY id LIMIT $1 OFFSET $2',
        [limit, offset],
      ),
    vehicle: async (id) =>
      (
        await m.query<Vehicle[]>(
          'SELECT * FROM app.fleet_vehicles WHERE id=$1 FOR UPDATE',
          [id],
        )
      )[0] ?? null,
    driver: async (id) =>
      (
        await m.query<Driver[]>(
          'SELECT * FROM app.fleet_drivers WHERE id=$1 FOR UPDATE',
          [id],
        )
      )[0] ?? null,
    saveVehicle: async (v, insert) => {
      await m.query(
        insert
          ? 'INSERT INTO app.fleet_vehicles(id,identifier,plate,kind,seats,active,version,week) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)'
          : 'UPDATE app.fleet_vehicles SET identifier=$2,plate=$3,kind=$4,seats=$5,active=$6,version=$7,week=$8::jsonb WHERE id=$1',
        [
          v.id,
          v.identifier,
          v.plate,
          v.kind,
          v.seats,
          v.active,
          v.version,
          v.week === null ? null : JSON.stringify(v.week),
        ],
      );
    },
    saveDriver: async (v, insert) => {
      await m.query(
        insert
          ? 'INSERT INTO app.fleet_drivers(id,name,phone,active,version) VALUES($1,$2,$3,$4,$5)'
          : 'UPDATE app.fleet_drivers SET name=$2,phone=$3,active=$4,version=$5 WHERE id=$1',
        [v.id, v.name, v.phone, v.active, v.version],
      );
    },
  };
}
