export interface ProviderOrder {
  source: 'wa-stanza-v1';
  seconds: number;
}
export function parseProviderOrder(input: unknown): ProviderOrder | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (
    value.source !== 'wa-stanza-v1' ||
    typeof value.seconds !== 'number' ||
    !Number.isSafeInteger(value.seconds) ||
    value.seconds <= 0
  )
    return null;
  return { source: 'wa-stanza-v1', seconds: value.seconds };
}
// Operational policy, not proof of causality. Never use this timestamp for deadlines.
export function compareProviderOrder(
  candidate: unknown,
  previous: unknown,
): 'older' | 'newer' | 'uncertain' {
  const a = parseProviderOrder(candidate),
    b = parseProviderOrder(previous);
  if (!a || !b || a.seconds === b.seconds) return 'uncertain';
  return a.seconds > b.seconds ? 'newer' : 'older';
}
