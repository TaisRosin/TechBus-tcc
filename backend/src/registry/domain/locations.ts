import { AccessError } from '../../access/domain/access';
import { exact, invalid, revision, uuid } from './registry';

export type Direction = 'pickup' | 'dropoff';
export type CatalogKind = 'group' | 'region' | 'point';
export interface CatalogRecord {
  id: string;
  name: string;
  active: boolean;
  version: number;
  direction?: Direction;
  groupId?: string;
  address?: string;
}
export interface ReturnLocation {
  id: string;
  provider: string;
  externalKey: string;
  label: string;
  regionId: string;
  evidence: string;
}
export interface PlaceDefault {
  studentId: string;
  direction: Direction;
  pointId: string | null;
  locationId: string | null;
  source: 'initial' | 'request' | 'consent';
  evidence: string;
  version: number;
}
export function textField(value: unknown, max = 1000): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    return invalid();
  return value.trim();
}
export function direction(value: unknown): Direction {
  if (value !== 'pickup' && value !== 'dropoff') return invalid();
  return value;
}
export function parseCatalog(kind: CatalogKind, input: unknown, edit: boolean) {
  const keys = [
    'name',
    ...(kind === 'group' ? (edit ? [] : ['direction']) : ['groupId']),
    ...(kind === 'point' ? ['address'] : []),
    ...(edit ? ['active', 'expectedVersion'] : []),
  ];
  const v = exact(input, keys);
  const result: {
    name: string;
    direction?: Direction;
    groupId?: string;
    address?: string;
    active?: boolean;
    expectedVersion?: number;
  } = { name: textField(v.name, 200) };
  if (kind === 'group' && !edit) result.direction = direction(v.direction);
  if (kind !== 'group') result.groupId = uuid(textField(v.groupId, 36));
  if (kind === 'point') result.address = textField(v.address);
  if (edit) {
    if (typeof v.active !== 'boolean') return invalid();
    result.active = v.active;
    result.expectedVersion = revision(v.expectedVersion);
  }
  return result;
}
export function parseDefault(side: Direction, input: unknown) {
  const v = exact(input, [
    side === 'pickup' ? 'pointId' : 'address',
    'source',
    'evidence',
    'expectedVersion',
  ]);
  if (!['initial', 'request', 'consent'].includes(v.source as string))
    return invalid();
  const expectedVersion =
    v.expectedVersion === 0 ? 0 : revision(v.expectedVersion);
  return {
    pointId: side === 'pickup' ? uuid(textField(v.pointId, 36)) : null,
    address: side === 'dropoff' ? textField(v.address) : null,
    source: v.source as PlaceDefault['source'],
    evidence: textField(v.evidence),
    expectedVersion,
  };
}
export function validatedAddress(input: unknown): Omit<ReturnLocation, 'id'> {
  if (!input || typeof input !== 'object')
    throw new AccessError('ADDRESS_VALIDATION_UNAVAILABLE', 503);
  const v = input as Record<string, unknown>;
  if (v.status === 'outside')
    throw new AccessError('OUTSIDE_SERVICE_AREA', 422);
  if (v.status === 'indeterminate')
    throw new AccessError('GROUP_UNRESOLVED', 409);
  if (v.status !== 'inside')
    throw new AccessError('ADDRESS_VALIDATION_UNAVAILABLE', 503);
  try {
    return {
      provider: textField(v.provider, 200),
      externalKey: textField(v.key, 200),
      label: textField(v.label),
      regionId: uuid(textField(v.regionId, 36)),
      evidence: textField(v.evidence),
    };
  } catch {
    throw new AccessError('ADDRESS_VALIDATION_UNAVAILABLE', 503);
  }
}
export function page(query: unknown) {
  if (!query || typeof query !== 'object' || Array.isArray(query))
    return invalid();
  const q = query as Record<string, unknown>;
  if (Object.keys(q).some((k) => !['limit', 'offset'].includes(k)))
    return invalid();
  const num = (value: unknown, fallback: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d{1,10}$/.test(value))
      return invalid();
    return Number(value);
  };
  const limit = num(q.limit, 50),
    offset = num(q.offset, 0);
  if (limit < 1 || limit > 100 || offset > 2147483647) return invalid();
  return { limit, offset };
}
