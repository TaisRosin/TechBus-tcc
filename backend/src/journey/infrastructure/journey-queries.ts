import type { EntityManager } from 'typeorm';
import type { JourneyTransaction } from '../application/ports';
import type { Journey, Receipt } from '../domain/journey';
export function journeyQueries(m: EntityManager): JourneyTransaction {
  return {
    markCancellation: async (studentId, id) => {
      await m.query(
        'UPDATE app.journey_receipts SET cancel_requested=true WHERE student_id=$1 AND id=$2',
        [studentId, id],
      );
    },
    waitingBefore: async (studentId, date, before, after) =>
      (
        await m.query<{ waiting: boolean }[]>(
          `SELECT EXISTS(SELECT 1 FROM app.journey_receipts WHERE student_id=$1 AND date=$2::date AND sequence<$3 AND sequence>$4 AND (received_at AT TIME ZONE 'America/Sao_Paulo')::time<'17:00:00'::time AND (result IS NULL OR result->>'code'='ORDER_UNCERTAIN')) AS waiting`,
          [studentId, date, before, after],
        )
      )[0].waiting,
    pendingCancellations: (studentId, date) =>
      m.query<Receipt[]>(
        `SELECT id,student_id AS "studentId",sequence,received_at AS "receivedAt",date::text,ordering,result FROM app.journey_receipts WHERE student_id=$1 AND date=$2::date AND cancel_requested AND result->>'code'='AWAITING_TIMELY_COMMAND' ORDER BY sequence`,
        [studentId, date],
      ),
    page: async (date, after, limit) =>
      (
        await m.query<{ studentId: string }[]>(
          `SELECT student_id AS "studentId" FROM (SELECT student_id FROM app.daily_journeys WHERE date=$1::date UNION SELECT student_id FROM app.journey_receipts WHERE date=$1::date) AS students WHERE ($2::uuid IS NULL OR student_id>$2::uuid) ORDER BY student_id LIMIT $3`,
          [date, after, limit],
        )
      ).map((r) => r.studentId),
    pending: async (studentId, date, after) =>
      (
        await m.query<{ code: string }[]>(
          `SELECT DISTINCT COALESCE(result->>'code','INTERPRETATION_PENDING') AS code FROM app.journey_receipts WHERE student_id=$1 AND date=$2::date AND sequence>$3 AND (result IS NULL OR result->>'status'='pending') ORDER BY code`,
          [studentId, date, after],
        )
      ).map((r) => r.code),
    receipt: async (studentId, id) =>
      (
        await m.query<Receipt[]>(
          `SELECT id,student_id AS "studentId",sequence,received_at AS "receivedAt",date::text,ordering,result FROM app.journey_receipts WHERE student_id=$1 AND id=$2`,
          [studentId, id],
        )
      )[0] ?? null,
    nextSequence: async (studentId) =>
      (
        await m.query<{ value: number }[]>(
          'SELECT COALESCE(MAX(sequence),0)+1 AS value FROM app.journey_receipts WHERE student_id=$1',
          [studentId],
        )
      )[0].value,
    receive: async (r) => {
      await m.query(
        'INSERT INTO app.journey_receipts(student_id,id,sequence,received_at,date,ordering) VALUES($1,$2,$3,$4,$5,$6)',
        [r.studentId, r.id, r.sequence, r.receivedAt, r.date, r.ordering],
      );
    },
    finish: async (studentId, id, result) => {
      await m.query(
        'UPDATE app.journey_receipts SET result=$3::jsonb WHERE student_id=$1 AND id=$2',
        [studentId, id, JSON.stringify(result)],
      );
    },
    get: async (studentId, date) =>
      (
        await m.query<Journey[]>(
          `SELECT student_id AS "studentId",date::text,university_id AS "universityId",student_initiated AS "studentInitiated",student_initiated_at AS "studentInitiatedAt",origin,version,last_sequence AS "lastSequence",point_id AS "pointId",location_id AS "locationId",closed_sequence AS "closedSequence",closure_issue AS "closureIssue",closure_base_state AS "closureBaseState",cancel_sequence AS "cancelSequence",json_build_object('state',pickup_state,'origin',pickup_origin) AS pickup,json_build_object('state',dropoff_state,'origin',dropoff_origin) AS dropoff FROM app.daily_journeys WHERE student_id=$1 AND date=$2::date`,
          [studentId, date],
        )
      )[0] ?? null,
    save: async (j) => {
      await m.query(
        `INSERT INTO app.daily_journeys(student_id,date,university_id,origin,version,last_sequence,point_id,location_id,pickup_state,pickup_origin,dropoff_state,dropoff_origin,closed_sequence,closure_issue,closure_base_state,cancel_sequence,student_initiated,student_initiated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT(student_id,date) DO UPDATE SET student_initiated=EXCLUDED.student_initiated,student_initiated_at=EXCLUDED.student_initiated_at,university_id=EXCLUDED.university_id,version=EXCLUDED.version,last_sequence=EXCLUDED.last_sequence,point_id=EXCLUDED.point_id,location_id=EXCLUDED.location_id,pickup_state=EXCLUDED.pickup_state,pickup_origin=EXCLUDED.pickup_origin,dropoff_state=EXCLUDED.dropoff_state,dropoff_origin=EXCLUDED.dropoff_origin,closed_sequence=EXCLUDED.closed_sequence,closure_issue=EXCLUDED.closure_issue,closure_base_state=EXCLUDED.closure_base_state,cancel_sequence=EXCLUDED.cancel_sequence`,
        [
          j.studentId,
          j.date,
          j.universityId,
          j.origin,
          j.version,
          j.lastSequence,
          j.pointId,
          j.locationId,
          j.pickup.state,
          j.pickup.origin,
          j.dropoff.state,
          j.dropoff.origin,
          j.closedSequence,
          j.closureIssue,
          j.closureBaseState,
          j.cancelSequence,
          j.studentInitiated ?? false,
          j.studentInitiatedAt ?? null,
        ],
      );
    },
  };
}
