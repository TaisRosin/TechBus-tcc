import { AccessError } from '../../access/domain/access';
import { exact, invalid, revision, uuid } from './registry';
import {
  parsePointAddress,
  formatPointAddress,
  parseStopReference,
  type PointAddress,
} from './point-address';

export type Direction = 'pickup' | 'dropoff';
export type CatalogKind = 'group' | 'region' | 'point' | 'dropoff';
export interface CatalogRecord {
  id: string;
  name: string;
  active: boolean;
  version: number;
  direction?: Direction;
  groupId?: string;
  address?: string;
  addressDetails?: PointAddress | null;
  stopReference?: string;
  legacyAddress?: string | null;
}
export interface ReturnLocation {
  groupId?: string;
  name?: string;
  address?: string;
  addressDetails?: PointAddress | null;
  stopReference?: string;
  legacyAddress?: string | null;
  active?: boolean;
  version?: number;
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
  const point = kind === 'point' || kind === 'dropoff';
  const structured =
    point && !!input && typeof input === 'object' && 'addressDetails' in input;
  const reference =
    point && !!input && typeof input === 'object' && 'stopReference' in input;
  const keys = [
    'name',
    ...(kind === 'group' ? (edit ? [] : ['direction']) : ['groupId']),
    ...(point ? [structured ? 'addressDetails' : 'address'] : []),
    ...(reference ? ['stopReference'] : []),
    ...(edit ? ['active', 'expectedVersion'] : []),
  ];
  const v = exact(input, keys);
  const result: {
    name: string;
    direction?: Direction;
    groupId?: string;
    address?: string;
    addressDetails?: PointAddress;
    stopReference?: string;
    active?: boolean;
    expectedVersion?: number;
  } = { name: textField(v.name, 200) };
  if (kind === 'group' && !edit) result.direction = direction(v.direction);
  if (kind !== 'group') result.groupId = uuid(textField(v.groupId, 36));
  if (structured) {
    result.addressDetails = parsePointAddress(v.addressDetails);
    result.address = formatPointAddress(result.addressDetails);
  } else if (point) result.address = textField(v.address);
  if (reference) result.stopReference = parseStopReference(v.stopReference);
  if (edit) {
    if (typeof v.active !== 'boolean') return invalid();
    result.active = v.active;
    result.expectedVersion = revision(v.expectedVersion);
  }
  return result;
}
export function parseDefault(side: Direction, input: unknown) {
  const fixed =
    side === 'dropoff' &&
    !!input &&
    typeof input === 'object' &&
    'locationId' in input;
  const v = exact(input, [
    side === 'pickup' ? 'pointId' : fixed ? 'locationId' : 'address',
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
    locationId: fixed ? uuid(textField(v.locationId, 36)) : null,
    address: side === 'dropoff' && !fixed ? textField(v.address) : null,
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
