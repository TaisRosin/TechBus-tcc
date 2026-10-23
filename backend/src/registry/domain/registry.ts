import { AccessError } from '../../access/domain/access';

export interface StudentFields {
  name: string;
  phone: string;
  universityId: string;
  habitualDays: number[];
}
export interface Student extends StudentFields {
  id: string;
  active: boolean;
  version: number;
}
export interface Period {
  startDate: string;
  endDate: string;
}
export interface Contract extends Period {
  id: string;
  studentId: string;
  version: number;
}
export interface University {
  id: string;
  name: string;
}
export function invalid(): never {
  throw new AccessError('INVALID_INPUT', 400);
}
export function exact(input: unknown, keys: string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return invalid();
  if (Object.keys(input).sort().join(',') !== [...keys].sort().join(','))
    return invalid();
  return input as Record<string, unknown>;
}
export function normalizePhone(input: unknown): string {
  if (
    typeof input !== 'string' ||
    input.length > 50 ||
    !/^[+\d\s()-]+$/.test(input)
  )
    return invalid();
  const phone = input.replace(/[\s()-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return invalid();
  return phone;
}
export function parseStudent(input: unknown): StudentFields {
  const v = exact(input, ['name', 'phone', 'universityId', 'habitualDays']);
  if (
    typeof v.name !== 'string' ||
    !v.name.trim() ||
    v.name.trim().length > 200 ||
    typeof v.universityId !== 'string' ||
    !['unimater', 'unidep'].includes(v.universityId) ||
    !Array.isArray(v.habitualDays) ||
    v.habitualDays.length > 7 ||
    !v.habitualDays.every(
      (d: unknown) =>
        typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6,
    ) ||
    new Set(v.habitualDays).size !== v.habitualDays.length
  )
    return invalid();
  return {
    name: v.name.trim(),
    phone: normalizePhone(v.phone),
    universityId: v.universityId,
    habitualDays: [...(v.habitualDays as number[])].sort((a, b) => a - b),
  };
}
function date(input: unknown): string {
  if (
    typeof input !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input) ||
    input < '0001-01-01'
  )
    return invalid();
  const parsed = new Date(`${input}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== input
  )
    return invalid();
  return input;
}
export function parsePeriod(input: unknown): Period {
  const v = exact(input, ['startDate', 'endDate']);
  const startDate = date(v.startDate),
    endDate = date(v.endDate);
  if (startDate > endDate) return invalid();
  return { startDate, endDate };
}
export function revision(input: unknown): number {
  if (
    typeof input !== 'number' ||
    !Number.isInteger(input) ||
    input < 1 ||
    input >= 2147483647
  )
    return invalid();
  return input;
}
export function uuid(input: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input,
    )
  )
    return invalid();
  return input;
}
