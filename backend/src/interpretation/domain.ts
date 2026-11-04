import { AccessError } from '../access/domain/access';

export const trips = [
  'none',
  'going',
  'not_going',
  'only_pickup',
  'only_dropoff',
  'cancel_return',
  'answer',
] as const;
export interface Proposal {
  trip: (typeof trips)[number];
  pickup: 'yes' | 'no' | 'unsure' | null;
  dropoff: 'yes' | 'no' | 'unsure' | null;
  pickupPlace: string | null;
  dropoffPlace: string | null;
  savePickup: boolean;
  saveDropoff: boolean;
  ambiguous: boolean;
}
const keys = [
  'trip',
  'pickup',
  'dropoff',
  'pickupPlace',
  'dropoffPlace',
  'savePickup',
  'saveDropoff',
  'ambiguous',
];
export function parseProposal(input: unknown): Proposal {
  const fail = (): never => {
    throw new AccessError('INVALID_PROPOSAL', 422);
  };
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return fail();
  const value = input as Record<string, unknown>;
  if (Object.keys(value).sort().join() !== [...keys].sort().join())
    return fail();
  if (!trips.includes(value.trip as Proposal['trip'])) return fail();
  for (const key of ['pickup', 'dropoff'])
    if (![null, 'yes', 'no', 'unsure'].includes(value[key] as string | null))
      return fail();
  for (const key of ['pickupPlace', 'dropoffPlace'])
    if (
      value[key] !== null &&
      (typeof value[key] !== 'string' ||
        !value[key].trim() ||
        value[key].length > 500)
    )
      return fail();
  for (const key of ['savePickup', 'saveDropoff', 'ambiguous'])
    if (typeof value[key] !== 'boolean') return fail();
  if (
    value.trip === 'answer'
      ? value.pickup === null && value.dropoff === null
      : value.pickup !== null || value.dropoff !== null
  )
    return fail();
  if (
    (value.savePickup && !value.pickupPlace) ||
    (value.saveDropoff && !value.dropoffPlace)
  )
    return fail();
  if (
    value.trip === 'none' &&
    !value.pickupPlace &&
    !value.dropoffPlace &&
    value.ambiguous === false
  )
    return fail();
  return { ...value } as unknown as Proposal;
}
export function directInterpretation(text: string): Proposal | null {
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.!]$/, '');
  const commands: Record<string, Proposal['trip']> = {
    vou: 'going',
    'nao vou': 'not_going',
    'so ida': 'only_pickup',
    'so volta': 'only_dropoff',
    'cancelar volta': 'cancel_return',
    'cancelo a volta': 'cancel_return',
  };

  const directAnswers: Record<string, ['yes' | 'no', 'yes' | 'no']> = {
    'vou e volto': ['yes', 'yes'],
    'vou na ida e na volta': ['yes', 'yes'],
    'vou mas nao volto': ['yes', 'no'],
    'nao vou nem volto': ['no', 'no'],
    'so vou na ida': ['yes', 'no'],
    'so vou na volta': ['no', 'yes'],
  };

  const answer = directAnswers[normalized];

  if (answer) {
    return {
      trip: 'answer',
      pickup: answer[0],
      dropoff: answer[1],
      pickupPlace: null,
      dropoffPlace: null,
      savePickup: false,
      saveDropoff: false,
      ambiguous: false,
    };
  }

  const trip = commands[normalized];
  if (!trip && !['sim', 'nao'].includes(normalized)) return null;
  return {
    trip: trip ?? 'none',
    pickup: null,
    dropoff: null,
    pickupPlace: null,
    dropoffPlace: null,
    savePickup: false,
    saveDropoff: false,
    ambiguous: !trip,
  };
}
