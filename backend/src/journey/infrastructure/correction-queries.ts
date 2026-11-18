import type { EntityManager } from 'typeorm';
import type {
  CorrectionRecord,
  CorrectionTransaction,
} from '../application/correction-ports';
import type { Receipt } from '../domain/journey';
export function correctionQueries(m: EntityManager): CorrectionTransaction {
  return {
    pending: (id, date) =>
      m.query<Receipt[]>(
        `SELECT id,student_id AS "studentId",sequence,received_at AS "receivedAt",date::text,ordering,result FROM app.journey_receipts WHERE student_id=$1 AND date=$2 AND (result IS NULL OR result->>'status'='pending') ORDER BY sequence`,
        [id, date],
      ),
    async get(id, operationId) {
      return (
        (
          await m.query<CorrectionRecord[]>(
            `SELECT student_id AS "studentId",operation_id AS "operationId",date::text,actor_id AS "actorId",request_hash AS "requestHash",reason,created_at AS "createdAt",result FROM app.team_corrections WHERE student_id=$1 AND operation_id=$2`,
            [id, operationId],
          )
        )[0] ?? null
      );
    },
    async insert(v) {
      await m.query(
        `UPDATE app.conversation_clarifications c SET state='superseded',code='RESOLVED_BY_TEAM'
        WHERE c.student_id=$1 AND c.date=$2::date AND c.state IN ('prepared','sent','escalated')
        AND EXISTS(SELECT 1 FROM app.journey_receipts r WHERE r.id=c.event_id AND r.student_id=c.student_id AND r.result->>'code'='RESOLVED_BY_TEAM')`,
        [v.studentId, v.date],
      );
      await m.query(
        'INSERT INTO app.team_corrections(student_id,operation_id,date,actor_id,request_hash,reason,created_at,result) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          v.studentId,
          v.operationId,
          v.date,
          v.actorId,
          v.requestHash,
          v.reason,
          v.createdAt,
          JSON.stringify(v.result),
        ],
      );
    },
  };
}
