import { createHash } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { PostgresRegistryStore } from '../registry/infrastructure/postgres-registry-store';
import { operationalDate } from '../shared/time/operational-date';
import { parseProviderOrder } from '../whatsapp/provider-order';
import type { Proposal } from './domain';
import { contextualAnswer, questionText, type Purpose } from './context';
import { resolveProposal } from './places';

export interface Clarification {
  event_id: string;
  student_id: string;
  instance: string;
  phone: string;
  date: string;
  purpose: Purpose;
  proposal: Proposal;
  snapshot_hash: string;
  text: string;
  state: string;
  provider_id: string | null;
  dispatch_finished_at: Date | null;
}
export const beforeDeadline = (time: Date) =>
  time.getTime() <
  new Date(operationalDate(time) + 'T17:00:00-03:00').getTime();
export async function contextSnapshot(
  m: EntityManager,
  studentId: string,
  date: string,
): Promise<string> {
  const tx = PostgresRegistryStore.transactionPort(m);
  await tx.places.lock();
  const student = await tx.student(studentId, true);
  const value = {
    student,
    defaults: await tx.places.defaults(studentId),
    journey: await tx.journeys.get(studentId, date),
    contracts: await tx.contracts(studentId),
    calendar: student ? await tx.calendar(student.universityId, 'read') : null,
    exceptions: student
      ? await tx.exceptions(student.universityId, date, date)
      : [],
  };
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
export async function fixedProposal(m: EntityManager, proposal: unknown) {
  const tx = PostgresRegistryStore.transactionPort(m);
  await tx.places.lock();
  return resolveProposal(proposal, async (kind) => {
    const all = [];
    for (let offset = 0; ; offset += 100) {
      const rows = await tx.places.list(kind, 100, offset);
      all.push(...rows);
      if (rows.length < 100) break;
    }
    return all;
  });
}
export async function validQuestion(
  m: EntityManager,
  q: Clarification,
  now: Date,
): Promise<boolean> {
  await PostgresRegistryStore.transactionPort(m).places.lock();
  const [root] = await m.query<
    { conflict: boolean; result: { status: string; code?: string } | null }[]
  >(
    `SELECT e.conflict,r.result FROM app.whatsapp_events e JOIN app.journey_receipts r ON r.id=e.receipt_id AND r.student_id=e.student_id WHERE e.id=$1`,
    [q.event_id],
  );
  const tx = PostgresRegistryStore.transactionPort(m);
  const student = await tx.student(q.student_id, true);
  return (
    !!root &&
    !root.conflict &&
    (!root.result || root.result.status === 'pending') &&
    !!student?.active &&
    student.phone === q.phone &&
    q.date === operationalDate(now) &&
    q.snapshot_hash === (await contextSnapshot(m, q.student_id, q.date))
  );
}
export async function quotedContext(
  m: EntityManager,
  id: string,
  now: Date,
): Promise<{ question: Clarification; proposal: Proposal | null } | null> {
  const [e] = await m.query<
    {
      student_id: string;
      instance: string;
      phone: string;
      reply_to: string;
      received_at: Date;
      text_body: string;
      conflict: boolean;
    }[]
  >(
    'SELECT student_id,instance,phone,reply_to,received_at,text_body,conflict FROM app.whatsapp_events WHERE id=$1',
    [id],
  );
  if (!e?.reply_to || e.conflict || !beforeDeadline(e.received_at)) return null;
  const [q] = await m.query<Clarification[]>(
    `SELECT *,date::text AS date FROM app.conversation_clarifications WHERE instance=$1 AND provider_id=$2 AND student_id=$3 AND phone=$4 AND state='sent'`,
    [e.instance, e.reply_to, e.student_id, e.phone],
  );
  if (
    !q ||
    !q.dispatch_finished_at ||
    q.dispatch_finished_at > e.received_at ||
    q.date !== operationalDate(e.received_at) ||
    !(await validQuestion(m, q, now))
  )
    return null;
  return {
    question: q,
    proposal: contextualAnswer(q.purpose, q.proposal, e.text_body),
  };
}
export async function prepareClarification(
  m: EntityManager,
  id: string,
  now: Date,
): Promise<void> {
  await m.query('SELECT pg_advisory_xact_lock(82406,1)');
  const context = await quotedContext(m, id, now);
  if (context) {
    await m.query(
      "UPDATE app.conversation_clarifications SET state='escalated',answer_event_id=$2,code='TEAM_REVIEW_REQUIRED' WHERE event_id=$1 AND state='sent'",
      [context.question.event_id, id],
    );
    return;
  }
  const [e] = await m.query<
    {
      student_id: string;
      instance: string;
      phone: string;
      received_at: Date;
      conflict: boolean;
      original_order: unknown;
      reply_to: string | null;
      proposal: Proposal;
      sequence: number;
    }[]
  >(
    `SELECT e.*,i.proposal,r.sequence FROM app.whatsapp_events e JOIN app.message_interpretations i ON i.event_id=e.id JOIN app.journey_receipts r ON r.id=e.receipt_id AND r.student_id=e.student_id WHERE e.id=$1 AND i.state='completed' AND i.proposal IS NOT NULL`,
    [id],
  );
  if (
    !e ||
    e.reply_to ||
    e.conflict ||
    !beforeDeadline(now) ||
    !beforeDeadline(e.received_at) ||
    operationalDate(e.received_at) !== operationalDate(now)
  )
    return;
  const evidence = parseProviderOrder(e.original_order);
  if (
    !evidence ||
    evidence.seconds * 1000 > e.received_at.getTime() ||
    operationalDate(new Date(evidence.seconds * 1000)) !==
      operationalDate(e.received_at)
  )
    return;
  const translated = await fixedProposal(m, e.proposal);
  if (!translated.purpose) return;
  const tx = PostgresRegistryStore.transactionPort(m);
  const student = await tx.student(e.student_id, true);
  if (!student?.active || student.phone !== e.phone) return;
  const [blocked] = await m.query<{ exists: boolean }[]>(
    `SELECT EXISTS(SELECT 1 FROM app.journey_receipts WHERE student_id=$1 AND date=$2::date AND id<>$3 AND (sequence>$4 OR result IS NULL OR result->>'status'='pending')) OR EXISTS(SELECT 1 FROM app.conversation_clarifications WHERE student_id=$1 AND date=$2::date AND state IN ('prepared','sending','sent','unknown','escalated')) AS exists`,
    [e.student_id, operationalDate(now), id, e.sequence],
  );
  if (blocked.exists) return;
  await m.query(
    `INSERT INTO app.conversation_clarifications(event_id,student_id,instance,phone,date,purpose,proposal,snapshot_hash,text,state,created_at,code) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,'prepared',$10,'CLARIFICATION_PREPARED') ON CONFLICT DO NOTHING`,
    [
      id,
      e.student_id,
      e.instance,
      e.phone,
      operationalDate(now),
      translated.purpose,
      JSON.stringify(e.proposal),
      await contextSnapshot(m, e.student_id, operationalDate(now)),
      questionText(translated.purpose),
      now,
    ],
  );
}
