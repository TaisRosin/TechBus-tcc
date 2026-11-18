import type { CatalogKind, CatalogRecord } from '../registry/domain/locations';
import { parseCommand, type Command } from '../journey/domain/journey';
import { parseProposal } from './domain';
import { proposalCommand } from './command';
import { normalizedName, type Purpose } from './context';
export async function resolveProposal(
  input: unknown,
  list: (kind: CatalogKind) => Promise<CatalogRecord[]>,
): Promise<{
  command: Command | null;
  code: string | null;
  purpose?: Purpose;
}> {
  const p = parseProposal(input);
  if (
    p.ambiguous &&
    p.trip === 'answer' &&
    !p.pickupPlace &&
    !p.dropoffPlace &&
    !p.savePickup &&
    !p.saveDropoff
  ) {
    if (p.pickup === 'unsure' && p.dropoff !== 'unsure')
      return { command: null, code: 'AMBIGUOUS', purpose: 'pickup' };
    if (p.dropoff === 'unsure' && p.pickup !== 'unsure')
      return { command: null, code: 'AMBIGUOUS', purpose: 'dropoff' };
  }
  if (p.ambiguous)
    return {
      command: null,
      code: 'AMBIGUOUS',
      ...(p.trip === 'none' &&
      !p.pickupPlace &&
      !p.dropoffPlace &&
      !p.savePickup &&
      !p.saveDropoff
        ? { purpose: 'trip' as const }
        : {}),
    };
  if (p.savePickup || p.saveDropoff)
    return { command: null, code: 'DEFAULT_CHANGE_REVIEW_REQUIRED' };
  if (!p.pickupPlace && !p.dropoffPlace) return proposalCommand(p);
  if (p.trip === 'cancel_return' || p.trip === 'not_going')
    return { command: null, code: 'COMPOUND_REVIEW_REQUIRED' };
  const ids: Record<string, string> = {};
  for (const side of ['pickup', 'dropoff'] as const) {
    const name = side === 'pickup' ? p.pickupPlace : p.dropoffPlace;
    if (!name) continue;
    const matches = (
      await list(side === 'pickup' ? 'point' : 'dropoff')
    ).filter(
      (row) => row.active && normalizedName(row.name) === normalizedName(name),
    );
    if (matches.length !== 1)
      return {
        command: null,
        code: matches.length ? 'LOCATION_AMBIGUOUS' : 'LOCATION_NOT_FOUND',
        purpose: `${side}-place`,
      };
    ids[side === 'pickup' ? 'pointId' : 'locationId'] = matches[0].id;
  }
  return {
    command: parseCommand({
      kind: 'request',
      trip: p.trip,
      ...(p.pickup ? { pickup: p.pickup } : {}),
      ...(p.dropoff ? { dropoff: p.dropoff } : {}),
      ...ids,
    }),
    code: null,
  };
}
