import type { EntityManager } from 'typeorm';
import type { MessageTransaction } from '../application/ports';
import type { OutgoingMessage } from '../domain/messages';
const columns =
  'id,student_id AS "studentId",date::text,slot,status,version,phone,text,code';
export function messageQueries(m: EntityManager): MessageTransaction {
  return {
    get: async (id, lock = false) =>
      (
        await m.query<OutgoingMessage[]>(
          `SELECT ${columns} FROM app.outgoing_messages WHERE id=$1${lock ? ' FOR UPDATE' : ''}`,
          [id],
        )
      )[0] ?? null,
    find: async (studentId, date, slot) =>
      (
        await m.query<OutgoingMessage[]>(
          `SELECT ${columns} FROM app.outgoing_messages WHERE student_id=$1 AND date=$2::date AND slot=$3`,
          [studentId, date, slot],
        )
      )[0] ?? null,
    list: (date, limit, offset) =>
      m.query<OutgoingMessage[]>(
        `SELECT ${columns} FROM app.outgoing_messages WHERE date=$1::date ORDER BY id LIMIT $2 OFFSET $3`,
        [date, limit, offset],
      ),
    save: async (a, insert = false) => {
      await m.query(
        insert
          ? 'INSERT INTO app.outgoing_messages(id,student_id,date,slot,status,version,phone,text,code) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)'
          : 'UPDATE app.outgoing_messages SET status=$5,version=$6,phone=$7,text=$8,code=$9 WHERE id=$1 AND student_id=$2 AND date=$3::date AND slot=$4',
        [
          a.id,
          a.studentId,
          a.date,
          a.slot,
          a.status,
          a.version,
          a.phone,
          a.text,
          a.code,
        ],
      );
    },
    skipEarlier: async (studentId, date, slot) => {
      await m.query(
        "UPDATE app.outgoing_messages SET status='skipped',code='SUPERSEDED',version=version+1 WHERE student_id=$1 AND date=$2::date AND slot<$3 AND status IN ('ready','failed')",
        [studentId, date, slot],
      );
    },
    start: async (a, now) => {
      await m.query(
        "INSERT INTO app.message_attempts(id,message_id,number,phone,text,status,started_at) SELECT $1,$2,COALESCE(MAX(number),0)+1,$3,$4,'sending',$5 FROM app.message_attempts WHERE message_id=$2",
        [a.attemptId, a.messageId, a.phone, a.text, now],
      );
    },
    finish: async (id, status, code, now) => {
      await m.query(
        "UPDATE app.message_attempts SET status=$2,code=$3,finished_at=$4 WHERE id=$1 AND status='sending'",
        [id, status, code, now],
      );
    },
  };
}
