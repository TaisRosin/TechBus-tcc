import { calendarDate } from '../../registry/domain/calendar';
import { exact, invalid, uuid } from '../../registry/domain/registry';
export type Stage = 'collection' | 'intermunicipal' | 'distribution';
export interface Window {
  stage: Stage;
  start: number;
  end: number;
}
export function interval(start: unknown, end: unknown) {
  if (
    typeof start !== 'number' ||
    typeof end !== 'number' ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start >= 2880 ||
    end <= start ||
    end > 2880
  )
    return invalid();
  return { start, end };
}
export function parseWindows(input: unknown): Window[] {
  if (!Array.isArray(input) || input.length > 30) return invalid();
  const windows = input
    .map((item: unknown) => {
      const v = exact(item, ['stage', 'start', 'end']);
      if (
        !['collection', 'intermunicipal', 'distribution'].includes(
          v.stage as string,
        )
      )
        return invalid();
      return { stage: v.stage as Stage, ...interval(v.start, v.end) };
    })
    .sort((a, b) => a.start - b.start);
  for (let i = 0; i < windows.length; i++)
    for (let j = i + 1; j < windows.length; j++)
      if (
        windows[i].stage === windows[j].stage &&
        windows[j].start < windows[i].end
      )
        return invalid();
  return windows;
}
export function parseWeek(input: unknown): Window[][] | null {
  if (input === null) return null;
  if (!Array.isArray(input) || input.length !== 7) return invalid();
  return input.map(parseWindows);
}
export function covers(
  windows: Window[],
  stage: Stage,
  start: number,
  end: number,
) {
  let cursor = start;
  for (const w of [...windows]
    .filter((w) => w.stage === stage)
    .sort((a, b) => a.start - b.start)) {
    if (w.start > cursor) break;
    if (w.end > cursor) cursor = w.end;
    if (cursor >= end) return true;
  }
  return false;
}
export interface DrivingLeg {
  driverId: string;
  start: number;
  end: number;
}
export interface ProposedTrip {
  vehicleId: string;
  stage: Stage;
  groupId?: string;
  universityId?: string;
  start: number;
  end: number;
  legs: DrivingLeg[];
}
const id = (value: unknown) => {
  if (typeof value !== 'string') return invalid();
  return uuid(value);
};
const driving = (input: unknown): DrivingLeg => {
  const v = exact(input, ['driverId', 'start', 'end']);
  return { driverId: id(v.driverId), ...interval(v.start, v.end) };
};
export function parseProposal(input: unknown): {
  date: string;
  trips: ProposedTrip[];
} {
  const v = exact(input, ['date', 'trips']);
  const date = calendarDate(v.date);
  if (!Array.isArray(v.trips) || v.trips.length < 1 || v.trips.length > 100)
    return invalid();
  const trips = v.trips.map((input: unknown): ProposedTrip => {
    if (!input || typeof input !== 'object' || !('kind' in input))
      return invalid();
    if (input.kind === 'intermunicipal') {
      const t = exact(input, [
        'kind',
        'vehicleId',
        'universityId',
        'outbound',
        'return',
      ]);
      if (!['unimater', 'unidep'].includes(t.universityId as string))
        return invalid();
      const outbound = driving(t.outbound),
        back = driving(t.return);
      if (back.start < outbound.end) return invalid();
      return {
        vehicleId: id(t.vehicleId),
        universityId: t.universityId as string,
        stage: 'intermunicipal',
        start: outbound.start,
        end: back.end,
        legs: [outbound, back],
      };
    }
    if (input.kind === 'local') {
      const t = exact(input, [
        'kind',
        'vehicleId',
        'groupId',
        'stage',
        'driverId',
        'start',
        'end',
      ]);
      if (t.stage !== 'collection' && t.stage !== 'distribution')
        return invalid();
      const leg = { driverId: id(t.driverId), ...interval(t.start, t.end) };
      return {
        vehicleId: id(t.vehicleId),
        groupId: id(t.groupId),
        stage: t.stage,
        ...interval(t.start, t.end),
        legs: [leg],
      };
    }
    return invalid();
  });
  return { date, trips };
}
