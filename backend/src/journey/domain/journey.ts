import { exact, invalid, uuid } from '../../registry/domain/registry';

export type State =
  | 'sem_resposta'
  | 'indeciso'
  | 'confirmado'
  | 'recusado'
  | 'cancelado';
export type Origin =
  | 'equipe'
  | 'none'
  | 'aluno_explicito'
  | 'implicito_da_ida'
  | 'padrao_fechamento';
export interface Leg {
  state: State;
  origin: Origin;
}
export interface Legs {
  pickup: Leg;
  dropoff: Leg;
}
export function emptyLegs(): Legs {
  return {
    pickup: { state: 'sem_resposta', origin: 'none' },
    dropoff: { state: 'sem_resposta', origin: 'none' },
  };
}
export type Answer = 'yes' | 'no' | 'unsure';
export type Command =
  | {
      kind:
        | 'going'
        | 'only_pickup'
        | 'only_dropoff'
        | 'not_going'
        | 'cancel_return';
    }
  | { kind: 'answer'; pickup?: Answer; dropoff?: Answer }
  | { kind: 'places'; pointId?: string; locationId?: string }
  | { kind: 'unclear'; persistent: boolean };
export interface Journey extends Legs {
  studentInitiated?: boolean;
  studentInitiatedAt?: Date | null;
  studentId: string;
  date: string;
  universityId: string;
  origin: 'habitual' | 'extra';
  version: number;
  lastSequence: number;
  pointId: string | null;
  locationId: string | null;
  closedSequence: number | null;
  closureIssue: string | null;
  closureBaseState: 'sem_resposta' | 'indeciso' | null;
  cancelSequence: number | null;
}
export interface CommandResult {
  status: 'applied' | 'rejected' | 'pending';
  code?: string;
  version?: number;
}
export interface Receipt {
  id: string;
  studentId: string;
  sequence: number;
  receivedAt: Date;
  date: string;
  ordering: 'received' | 'uncertain';
  result: CommandResult | null;
}
export function parseCommand(input: unknown): Command {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return invalid();
  const v = input as Record<string, unknown>;
  switch (v.kind) {
    case 'going':
    case 'only_pickup':
    case 'only_dropoff':
    case 'not_going':
    case 'cancel_return':
      exact(v, ['kind']);
      return { kind: v.kind };
    case 'answer': {
      const sides = ['pickup', 'dropoff'].filter((k) => Object.hasOwn(v, k));
      exact(v, ['kind', ...sides]);
      if (
        !sides.length ||
        sides.some((k) => !['yes', 'no', 'unsure'].includes(v[k] as string))
      )
        return invalid();
      return {
        kind: 'answer',
        ...(Object.hasOwn(v, 'pickup') ? { pickup: v.pickup as Answer } : {}),
        ...(Object.hasOwn(v, 'dropoff')
          ? { dropoff: v.dropoff as Answer }
          : {}),
      };
    }
    case 'places': {
      const fields = ['pointId', 'locationId'].filter((k) =>
        Object.hasOwn(v, k),
      );
      exact(v, ['kind', ...fields]);
      if (!fields.length) return invalid();
      for (const key of fields) {
        if (typeof v[key] !== 'string') return invalid();
        uuid(v[key]);
      }
      return {
        kind: 'places',
        ...(Object.hasOwn(v, 'pointId')
          ? { pointId: v.pointId as string }
          : {}),
        ...(Object.hasOwn(v, 'locationId')
          ? { locationId: v.locationId as string }
          : {}),
      };
    }
    case 'unclear':
      exact(v, ['kind', 'persistent']);
      if (typeof v.persistent !== 'boolean') return invalid();
      return { kind: 'unclear', persistent: v.persistent };
    default:
      return invalid();
  }
}
const explicit = (answer: Answer): Leg => ({
  state:
    answer === 'yes' ? 'confirmado' : answer === 'no' ? 'recusado' : 'indeciso',
  origin: 'aluno_explicito',
});
export function transition(previous: Legs, command: Command): Legs {
  const next = {
    pickup: { ...previous.pickup },
    dropoff: { ...previous.dropoff },
  };
  if (command.kind === 'only_pickup')
    return { pickup: explicit('yes'), dropoff: explicit('no') };
  if (command.kind === 'only_dropoff')
    return { pickup: explicit('no'), dropoff: explicit('yes') };
  if (command.kind === 'not_going')
    return { pickup: explicit('no'), dropoff: explicit('no') };
  if (
    command.kind === 'going' ||
    (command.kind === 'answer' && command.pickup === 'yes')
  ) {
    next.pickup = explicit('yes');
    if (
      next.dropoff.origin !== 'aluno_explicito' &&
      next.dropoff.origin !== 'equipe'
    )
      next.dropoff = { state: 'confirmado', origin: 'implicito_da_ida' };
  }
  if (command.kind === 'answer') {
    if (command.pickup) next.pickup = explicit(command.pickup);
    if (command.dropoff) next.dropoff = explicit(command.dropoff);
    if (
      next.pickup.state !== 'confirmado' &&
      next.dropoff.origin === 'implicito_da_ida'
    )
      next.dropoff = { state: 'sem_resposta', origin: 'none' };
  }
  return next;
}
