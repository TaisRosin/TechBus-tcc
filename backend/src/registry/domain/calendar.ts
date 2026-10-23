import { exact, invalid, revision, parsePeriod } from './registry';
import type { Student, Contract } from './registry';
import { operationalDate } from '../../shared/time/operational-date';

export interface Calendar {
  universityId: string;
  days: number[] | null;
  version: number;
}
export interface CalendarException {
  universityId: string;
  date: string;
  operates: boolean | null;
  reason: string;
}
export function calendarDate(input: unknown): string {
  return parsePeriod({ startDate: input, endDate: input }).startDate;
}
export function operation(
  days: number[] | null,
  exception: boolean | null,
  date: string,
) {
  calendarDate(date);
  if (exception !== null) return exception ? 'OPERATING' : 'NO_OPERATION';
  if (days === null) return 'CALENDAR_UNCONFIGURED';
  return days.includes(new Date(`${date}T12:00:00Z`).getUTCDay())
    ? 'OPERATING'
    : 'NO_OPERATION';
}
export function parseWeek(input: unknown) {
  const v = exact(input, ['days', 'expectedVersion']);
  if (
    !Array.isArray(v.days) ||
    v.days.length > 7 ||
    !v.days.every(
      (d: unknown) =>
        typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6,
    ) ||
    new Set(v.days).size !== v.days.length
  )
    return invalid();
  return {
    days: [...(v.days as number[])].sort((a, b) => a - b),
    expectedVersion: revision(v.expectedVersion),
  };
}
export function parseException(input: unknown) {
  const v = exact(input, ['operates', 'reason', 'expectedVersion']);
  if (
    (v.operates !== null && typeof v.operates !== 'boolean') ||
    typeof v.reason !== 'string' ||
    !v.reason.trim() ||
    v.reason.trim().length > 500
  )
    return invalid();
  return {
    operates: v.operates,
    reason: v.reason.trim(),
    expectedVersion: revision(v.expectedVersion),
  };
}

export interface EligibilitySnapshot {
  student: Student;
  contracts: Contract[];
  calendar: Calendar | null;
  exception: boolean | null;
}
export type EligibilityReason =
  | 'UNKNOWN_STUDENT'
  | 'INACTIVE_STUDENT'
  | 'NO_VALID_CONTRACT'
  | 'CALENDAR_UNCONFIGURED'
  | 'NO_OPERATION'
  | 'NOT_HABITUAL'
  | 'DEADLINE_PASSED'
  | 'ELIGIBLE';
const localHour = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  hourCycle: 'h23',
});
export function evaluateEligibility(
  snapshot: EligibilitySnapshot | null,
  mode: 'consultation' | 'request',
  instant: Date,
) {
  if (!(instant instanceof Date) || !Number.isFinite(instant.getTime()))
    return invalid();
  const date = operationalDate(instant);
  const result = (reason: EligibilityReason) => ({
    eligible: reason === 'ELIGIBLE',
    reason,
    date,
    ...(snapshot?.calendar
      ? { calendarVersion: snapshot.calendar.version }
      : {}),
  });
  if (!snapshot) return result('UNKNOWN_STUDENT');
  if (!snapshot.student.active) return result('INACTIVE_STUDENT');
  if (!snapshot.contracts.some((c) => c.startDate <= date && c.endDate >= date))
    return result('NO_VALID_CONTRACT');
  const state = operation(
    snapshot.calendar?.days ?? null,
    snapshot.exception,
    date,
  );
  if (state !== 'OPERATING') return result(state);
  if (
    mode === 'consultation' &&
    !snapshot.student.habitualDays.includes(
      new Date(`${date}T12:00:00Z`).getUTCDay(),
    )
  )
    return result('NOT_HABITUAL');
  if (mode === 'request' && Number(localHour.format(instant)) >= 17)
    return result('DEADLINE_PASSED');
  return result('ELIGIBLE');
}
