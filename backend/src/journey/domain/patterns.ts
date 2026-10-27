import { exact, invalid, uuid } from '../../registry/domain/registry';
import { direction } from '../../registry/domain/locations';
export function parsePattern(input: unknown) {
  if (
    input &&
    typeof input === 'object' &&
    'kind' in input &&
    input.kind === 'request_default'
  ) {
    const v = exact(input, ['kind', 'direction', 'placeId', 'expectedVersion']);
    if (
      typeof v.placeId !== 'string' ||
      !Number.isSafeInteger(v.expectedVersion) ||
      (v.expectedVersion as number) < 0
    )
      return invalid();
    return {
      kind: 'request_default' as const,
      direction: direction(v.direction),
      placeId: uuid(v.placeId),
      expectedVersion: v.expectedVersion as number,
    };
  }
  const v = exact(input, [
    'kind',
    'direction',
    'suggestionKey',
    'decision',
    'expectedVersion',
  ]);
  if (
    v.kind !== 'decide_suggestion' ||
    !['accept', 'refuse'].includes(v.decision as string) ||
    typeof v.suggestionKey !== 'string' ||
    !/^[a-f0-9]{64}$/.test(v.suggestionKey) ||
    !Number.isSafeInteger(v.expectedVersion) ||
    (v.expectedVersion as number) < 0
  )
    return invalid();
  return {
    kind: 'decide_suggestion' as const,
    direction: direction(v.direction),
    suggestionKey: v.suggestionKey,
    decision: v.decision as 'accept' | 'refuse',
    expectedVersion: v.expectedVersion as number,
  };
}
export interface Contribution {
  date: string;
  placeId: string | null;
}
export function sequence(rows: Contribution[]) {
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));
  let placeId: string | null = null,
    startDate: string | null = null,
    count = 0;
  for (const row of sorted) {
    if (!row.placeId) return { placeId, startDate, count, suspended: true };
    if (placeId && row.placeId !== placeId) break;
    placeId = row.placeId;
    startDate = row.date;
    count++;
  }
  return { placeId, startDate, count, suspended: false };
}
