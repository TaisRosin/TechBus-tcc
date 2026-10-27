import { invalid } from '../../registry/domain/registry';
import { calendarDate } from '../../registry/domain/calendar';
import type { ProposedTrip, Stage } from '../../fleet/domain/fleet';

export const demand = (pickup: number, dropoff: number) =>
  Math.max(pickup, dropoff);
export function recommend<T extends { seats: number }>(
  required: number,
  vehicles: T[],
) {
  const available =
    required > 0
      ? vehicles
          .filter((v) => v.seats >= required)
          .sort((a, b) => a.seats - b.seats)
      : [];
  return {
    available,
    recommended: available.filter((v) => v.seats === available[0]?.seats),
    issue:
      required === 0
        ? 'NO_DEMAND'
        : available.length
          ? null
          : 'NO_SUITABLE_VEHICLE',
  };
}
export interface Requirement {
  key: string;
  stage: Stage;
  count: number;
}
export function coverageIssues(
  required: Requirement[],
  trips: ProposedTrip[],
  capacities: Map<string, number>,
) {
  const issues: string[] = [],
    seen = new Set<string>();
  for (const t of trips) {
    const key = `${t.stage}:${t.universityId ?? t.groupId}`;
    if (seen.has(key)) issues.push('DUPLICATE_ALLOCATION');
    seen.add(key);
    const count =
      required.find(
        (r) => r.stage === t.stage && r.key === (t.universityId ?? t.groupId),
      )?.count ?? 0;
    if ((capacities.get(t.vehicleId) ?? 0) < count)
      issues.push('CAPACITY_INSUFFICIENT');
  }
  if (required.some((r) => r.count > 0 && !seen.has(`${r.stage}:${r.key}`)))
    issues.push('DEMAND_UNCOVERED');
  return [...new Set(issues)];
}
const wallFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
function wall(instant: number) {
  const parts = Object.fromEntries(
    wallFormat.formatToParts(new Date(instant)).map((p) => [p.type, p.value]),
  );
  return Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
  );
}
export function localInstant(date: string, minutes: number): Date {
  calendarDate(date);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 2880)
    return invalid();
  const target = Date.parse(`${date}T00:00:00Z`) + minutes * 60000;
  let instant = target;
  for (let i = 0; i < 3; i++) instant += target - wall(instant);
  if (wall(instant) !== target) return invalid();
  return new Date(instant);
}
