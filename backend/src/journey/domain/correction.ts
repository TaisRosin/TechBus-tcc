import { exact, invalid, revision, uuid } from '../../registry/domain/registry';
import { textField } from '../../registry/domain/locations';
import type { Legs } from './journey';
export interface Changes {
  pickup?: 'confirmado' | 'recusado';
  dropoff?: 'confirmado' | 'recusado';
  pointId?: string;
  locationId?: string;
  universityId?: string;
}
export function parseCorrection(input: unknown) {
  const v = exact(input, [
    'operationId',
    'expectedVersion',
    'reason',
    'reviewedReceiptIds',
    'changes',
  ]);
  const operationId = uuid(textField(v.operationId, 36)),
    expectedVersion = v.expectedVersion === 0 ? 0 : revision(v.expectedVersion),
    reason = textField(v.reason, 1000);
  if (
    !Array.isArray(v.reviewedReceiptIds) ||
    v.reviewedReceiptIds.length > 1000
  )
    return invalid();
  const reviewedReceiptIds = v.reviewedReceiptIds
    .map((id: unknown) => uuid(textField(id, 36)))
    .sort();
  if (new Set(reviewedReceiptIds).size !== reviewedReceiptIds.length)
    return invalid();
  if (!v.changes || typeof v.changes !== 'object' || Array.isArray(v.changes))
    return invalid();
  const raw = v.changes as Record<string, unknown>,
    fields = Object.keys(raw);
  if (
    fields.some(
      (k) =>
        ![
          'pickup',
          'dropoff',
          'pointId',
          'locationId',
          'universityId',
        ].includes(k),
    ) ||
    (!fields.length && !reviewedReceiptIds.length)
  )
    return invalid();
  const changes: Changes = {};
  for (const side of ['pickup', 'dropoff'] as const)
    if (Object.hasOwn(raw, side)) {
      if (raw[side] !== 'confirmado' && raw[side] !== 'recusado')
        return invalid();
      changes[side] = raw[side];
    }
  for (const key of ['pointId', 'locationId'] as const)
    if (Object.hasOwn(raw, key)) changes[key] = uuid(textField(raw[key], 36));
  if (Object.hasOwn(raw, 'universityId')) {
    if (!['unimater', 'unidep'].includes(raw.universityId as string))
      return invalid();
    changes.universityId = raw.universityId as string;
  }
  return { operationId, expectedVersion, reason, reviewedReceiptIds, changes };
}
export function correctLegs(previous: Legs, changes: Changes): Legs {
  return {
    pickup: changes.pickup
      ? { state: changes.pickup, origin: 'equipe' }
      : { ...previous.pickup },
    dropoff: changes.dropoff
      ? { state: changes.dropoff, origin: 'equipe' }
      : { ...previous.dropoff },
  };
}
