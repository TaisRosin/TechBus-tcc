import type { EntityManager } from 'typeorm';
import { AccessError } from '../access/domain/access';
import { exact, uuid } from '../registry/domain/registry';
import type { Clock } from '../shared/time/clock';
import { operationalDate } from '../shared/time/operational-date';
import { WhatsAppStore } from '../whatsapp/store';
import { directInterpretation, parseProposal, type Proposal } from './domain';
import type { InterpretationOutcome } from './gemini';
import { proposalCommand } from './command';

export interface InterpretationView {
  eventId: string;
  state: 'processing' | 'completed';
  source: 'rules' | 'gemini' | 'none';
  proposal: Proposal | null;
  code: string;
  startedAt: Date;
  finishedAt: Date | null;
}
const columns =
  'event_id AS "eventId",state,source,proposal,code,started_at AS "startedAt",finished_at AS "finishedAt"';
interface Event {
  id: string;
  kind: string;
  received_at: Date;
  text_body: string | null;
  student_id: string | null;
  receipt_id: string | null;
  conflict: boolean;
}
export class InterpretationService {
  constructor(
    private readonly store: WhatsAppStore,
    private readonly clock: Clock,
    private readonly provider: {
      interpret(text: string): Promise<InterpretationOutcome>;
    },
  ) {}
  private async authorized(
    m: EntityManager,
    actor: string | null,
  ): Promise<boolean> {
    if (actor === null) return true;
    const user = (
      await m.query<{ active: boolean; role: string }[]>(
        'SELECT active,role FROM app.team_users WHERE subject=$1 FOR SHARE',
        [actor],
      )
    )[0];
    return !!user?.active && ['admin', 'operator'].includes(user.role);
  }
  private async event(m: EntityManager, id: string): Promise<Event> {
    await m.query('SELECT pg_advisory_xact_lock(82406,1)');
    const event = (
      await m.query<Event[]>(
        'SELECT id,kind,received_at,text_body,student_id,receipt_id,conflict FROM app.whatsapp_events WHERE id=$1 FOR UPDATE',
        [id],
      )
    )[0];
    if (
      !event ||
      event.kind !== 'message' ||
      operationalDate(event.received_at) !== operationalDate(this.clock.now())
    )
      throw new AccessError('NOT_FOUND', 404);
    return event;
  }
  private async blocker(
    m: EntityManager,
    event: Event,
  ): Promise<string | null> {
    if (event.conflict) return 'EVENT_CONFLICT';
    if (!event.student_id || !event.receipt_id) return 'UNKNOWN_CONTACT';
    if (!event.text_body) return 'NEEDS_TEXT';
    const student = (
      await m.query<{ active: boolean }[]>(
        'SELECT active FROM app.students WHERE id=$1 FOR SHARE',
        [event.student_id],
      )
    )[0];
    if (!student?.active) return 'STUDENT_INACTIVE';
    return null;
  }
  interpret(
    actor: string,
    id: string,
    body: unknown,
  ): Promise<InterpretationView> {
    return this.run(actor, id, body);
  }
  // Internal worker only; never exposed as an HTTP actor choice.
  interpretReceived(id: string): Promise<InterpretationView> {
    return this.run(null, id, {});
  }
  private async run(
    actor: string | null,
    id: string,
    body: unknown,
  ): Promise<InterpretationView> {
    uuid(id);
    exact(body, []);
    const claim = await this.store.transaction(async (m) => {
      if (!(await this.authorized(m, actor)))
        throw new AccessError('FORBIDDEN', 403);
      const event = await this.event(m, id);
      const blocked = await this.blocker(m, event);
      const existing = (
        await m.query<InterpretationView[]>(
          `SELECT ${columns} FROM app.message_interpretations WHERE event_id=$1`,
          [id],
        )
      )[0];
      if (existing) {
        if (blocked) {
          await m.query(
            "UPDATE app.message_interpretations SET state='completed',proposal=NULL,code=$2,finished_at=$3 WHERE event_id=$1",
            [id, blocked, this.clock.now()],
          );
          return {
            view: {
              ...existing,
              state: 'completed' as const,
              proposal: null,
              code: blocked,
              finishedAt: this.clock.now(),
            },
            text: null,
          };
        }
        return { view: existing, text: null };
      }
      const now = this.clock.now();
      if (blocked) {
        const rows = await m.query<InterpretationView[]>(
          `INSERT INTO app.message_interpretations(event_id,state,source,code,started_at,finished_at) VALUES($1,'completed','none',$2,$3,$3) RETURNING ${columns}`,
          [id, blocked, now],
        );
        return { view: rows[0], text: null };
      }
      const rows = await m.query<InterpretationView[]>(
        `INSERT INTO app.message_interpretations(event_id,state,source,code,started_at) VALUES($1,'processing','none','INTERPRETATION_IN_PROGRESS',$2) RETURNING ${columns}`,
        [id, now],
      );
      return { view: rows[0], text: event.text_body };
    });
    if (claim.text === null) return claim.view;
    let proposal = directInterpretation(claim.text),
      code: string | null = null;
    const source = proposal ? 'rules' : 'gemini';
    if (!proposal) {
      try {
        const result = await this.provider.interpret(claim.text);
        proposal = result.proposal ? parseProposal(result.proposal) : null;
        code = result.code;
      } catch {
        code = 'PROVIDER_UNAVAILABLE';
      }
    }
    const finished = await this.store.transaction(async (m) => {
      const authorized = await this.authorized(m, actor);
      const event = await this.event(m, id);
      const blocked = await this.blocker(m, event);
      if (!authorized || blocked) {
        proposal = null;
        code = !authorized ? 'ACCESS_REVOKED' : blocked;
      } else if (proposal)
        code = proposalCommand(proposal).code ?? 'ORDER_UNCERTAIN';
      else code ??= 'INVALID_PROPOSAL';
      const rows = await m.query<[InterpretationView[], number]>(
        `UPDATE app.message_interpretations SET state='completed',source=$2,proposal=$3::jsonb,code=$4,finished_at=$5 WHERE event_id=$1 RETURNING ${columns}`,
        [
          id,
          source,
          proposal ? JSON.stringify(proposal) : null,
          code,
          this.clock.now(),
        ],
      );
      return { view: rows[0][0], authorized };
    });
    if (!finished.authorized) throw new AccessError('FORBIDDEN', 403);
    return finished.view;
  }
}
