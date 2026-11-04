import { parseCommand, type Command } from '../journey/domain/journey';
import { parseProposal } from './domain';

// Translation only: never establishes identity, ordering, eligibility or receipt time.
export function proposalCommand(input: unknown): {
  command: Command | null;
  code: 'AMBIGUOUS' | 'LOCATION_RESOLUTION_REQUIRED' | null;
} {
  const proposal = parseProposal(input);
  if (proposal.ambiguous) return { command: null, code: 'AMBIGUOUS' };
  if (proposal.pickupPlace || proposal.dropoffPlace)
    return { command: null, code: 'LOCATION_RESOLUTION_REQUIRED' };
  const command = parseCommand(
    proposal.trip === 'answer'
      ? {
          kind: 'answer',
          ...(proposal.pickup ? { pickup: proposal.pickup } : {}),
          ...(proposal.dropoff ? { dropoff: proposal.dropoff } : {}),
        }
      : { kind: proposal.trip },
  );
  return { command, code: null };
}
