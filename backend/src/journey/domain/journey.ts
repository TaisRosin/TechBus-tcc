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
      kind: 'request';
      trip: 'going' | 'only_pickup' | 'only_dropoff' | 'answer' | 'none';
      pickup?: Answer;
      dropoff?: Answer;
      pointId?: string;
      locationId?: string;
    }
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
    case 'request': {
      const fields = ['pickup', 'dropoff', 'pointId', 'locationId'].filter(
        (k) => Object.hasOwn(v, k),
      );
      exact(v, ['kind', 'trip', ...fields]);
      if (
        !['going', 'only_pickup', 'only_dropoff', 'answer', 'none'].includes(
          v.trip as string,
        )
      )
        return invalid();
      const places = parseCommand({
        kind: 'places',
        ...(Object.hasOwn(v, 'pointId') ? { pointId: v.pointId } : {}),
        ...(Object.hasOwn(v, 'locationId') ? { locationId: v.locationId } : {}),
      });
      if (places.kind !== 'places') return invalid();
      if (v.trip !== 'none')
        parseCommand({
          kind: v.trip,
          ...(Object.hasOwn(v, 'pickup') ? { pickup: v.pickup } : {}),
          ...(Object.hasOwn(v, 'dropoff') ? { dropoff: v.dropoff } : {}),
        });
      else if (Object.hasOwn(v, 'pickup') || Object.hasOwn(v, 'dropoff'))
        return invalid();
      return {
        kind: 'request',
        trip: v.trip as
          | 'going'
          | 'only_pickup'
          | 'only_dropoff'
          | 'answer'
          | 'none',
        ...(v.pickup ? { pickup: v.pickup as Answer } : {}),
        ...(v.dropoff ? { dropoff: v.dropoff as Answer } : {}),
        ...(places.pointId ? { pointId: places.pointId } : {}),
        ...(places.locationId ? { locationId: places.locationId } : {}),
      };
    }
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
  if (command.kind === 'request')
    return command.trip === 'none'
      ? transition(previous, {
          kind: 'places',
          pointId: command.pointId,
          locationId: command.locationId,
        })
      : transition(
          previous,
          parseCommand({
            kind: command.trip,
            ...(command.pickup ? { pickup: command.pickup } : {}),
            ...(command.dropoff ? { dropoff: command.dropoff } : {}),
          }),
        );
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
