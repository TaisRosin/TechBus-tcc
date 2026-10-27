import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import type { Plan, OperationTransaction } from '../application/ports';
export function operationQueries(m: EntityManager): OperationTransaction {
  return {
    async plan(date) {
      const rows = await m.query<Plan[]>(
        `SELECT date::text,version,draft,demand_token AS "demandToken",confirmed_version AS "confirmedVersion",confirmed_trips AS "confirmedTrips",confirmed_token AS "confirmedToken",confirmed_by AS "confirmedBy",confirmed_at AS "confirmedAt",needs_adjustment AS "needsAdjustment" FROM app.operation_plans WHERE date=$1 FOR UPDATE`,
        [date],
      );
      return rows[0] ?? null;
    },
    async save(p) {
      await m.query(
        `INSERT INTO app.operation_plans(date,version,draft,demand_token,confirmed_version,confirmed_trips,confirmed_token,confirmed_by,confirmed_at,needs_adjustment) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(date) DO UPDATE SET version=EXCLUDED.version,draft=EXCLUDED.draft,demand_token=EXCLUDED.demand_token,confirmed_version=EXCLUDED.confirmed_version,confirmed_trips=EXCLUDED.confirmed_trips,confirmed_token=EXCLUDED.confirmed_token,confirmed_by=EXCLUDED.confirmed_by,confirmed_at=EXCLUDED.confirmed_at,needs_adjustment=EXCLUDED.needs_adjustment`,
        [
          p.date,
          p.version,
          JSON.stringify(p.draft),
          p.demandToken,
          p.confirmedVersion,
          p.confirmedTrips === null ? null : JSON.stringify(p.confirmedTrips),
          p.confirmedToken,
          p.confirmedBy,
          p.confirmedAt,
          p.needsAdjustment,
        ],
      );
    },
    async replaceOccupancies(date, version, values) {
      await m.query(
        'UPDATE app.operation_occupancies SET active=false WHERE plan_date=$1 AND active',
        [date],
      );
      for (const v of values)
        await m.query(
          'INSERT INTO app.operation_occupancies(id,plan_date,plan_version,vehicle_id,driver_id,starts_at,ends_at,active) VALUES($1,$2,$3,$4,$5,$6,$7,true)',
          [
            randomUUID(),
            date,
            version,
            v.vehicleId,
            v.driverId,
            v.start,
            v.end,
          ],
        );
    },
    async conflicts(date, v) {
      const rows = await m.query<unknown[]>(
        `SELECT 1 FROM app.operation_occupancies WHERE active AND plan_date<>$1 AND starts_at<$3 AND ends_at>$2 AND ${v.vehicleId ? 'vehicle_id' : 'driver_id'}=$4 LIMIT 1`,
        [date, v.start, v.end, v.vehicleId ?? v.driverId],
      );
      return rows.length > 0;
    },
    async actorId(subject) {
      const rows = await m.query<{ id: string }[]>(
        'SELECT id FROM app.team_users WHERE subject=$1',
        [subject],
      );
      return rows[0].id;
    },
  };
}
