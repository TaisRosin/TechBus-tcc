import { invalid, uuid } from '../../registry/domain/registry';
export function stopIds(input: unknown): string[] {
  if (!Array.isArray(input) || input.length > 1000) return invalid();
  const ids = input.map((id: unknown) => uuid(id as string));
  if (new Set(ids).size !== ids.length) return invalid();
  return ids;
}
export function filterOrder(order: string[], current: string[]) {
  const wanted = new Set(current),
    known = new Set(order);
  return {
    ordered: order.filter((id) => wanted.has(id)),
    pending: [...wanted].filter((id) => !known.has(id)),
  };
}
