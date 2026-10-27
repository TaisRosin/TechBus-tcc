import type { EntityManager } from 'typeorm';
import type { PatternTransaction } from '../application/pattern-ports';
import type { Contribution } from '../domain/patterns';
export function patternQueries(m: EntityManager): PatternTransaction {
  return {
    lastSequence: async (studentId, side) =>
      (
        await m.query<{ value: number }[]>(
          'SELECT COALESCE(MAX(sequence),0) AS value FROM app.place_pattern_decisions WHERE student_id=$1 AND direction=$2',
          [studentId, side],
        )
      )[0].value,
    refused: async (studentId, key) =>
      (
        await m.query<unknown[]>(
          "SELECT 1 FROM app.place_pattern_decisions WHERE student_id=$1 AND suggestion_key=$2 AND action='refuse' LIMIT 1",
          [studentId, key],
        )
      ).length > 0,
    record: async (v) => {
      await m.query(
        'INSERT INTO app.place_pattern_decisions(student_id,receipt_id,direction,action,sequence,default_version,suggestion_key,point_id,location_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [
          v.studentId,
          v.receiptId,
          v.direction,
          v.action,
          v.sequence,
          v.defaultVersion,
          v.suggestionKey,
          v.direction === 'pickup' ? v.placeId : null,
          v.direction === 'dropoff' ? v.placeId : null,
        ],
      );
    },
    contributions: (studentId, side, date) => {
      const column = side === 'pickup' ? 'point_id' : 'location_id';
      const state = side === 'pickup' ? 'pickup_state' : 'dropoff_state';
      return m.query<Contribution[]>(
        `SELECT date::text,${column} AS "placeId" FROM app.daily_journeys WHERE student_id=$1 AND date<=$2::date AND ${state}='confirmado' ORDER BY date DESC`,
        [studentId, date],
      );
    },
  };
}
