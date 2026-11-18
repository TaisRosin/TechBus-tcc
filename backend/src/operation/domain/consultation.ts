import type { ProposedTrip } from '../../fleet/domain/fleet';
import { operationalDate } from '../../shared/time/operational-date';
export function previousDate(date: string): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) - 86400000)
    .toISOString()
    .slice(0, 10);
}
export function consultable(
  date: string,
  trips: ProposedTrip[],
  now: Date,
): boolean {
  void trips;
  return date === operationalDate(now);
}
export function tripSide(
  trip: ProposedTrip,
  index: number,
): 'pickup' | 'dropoff' {
  return trip.stage === 'distribution' ||
    (trip.stage === 'intermunicipal' && index === 1)
    ? 'dropoff'
    : 'pickup';
}
export interface Member {
  studentId: string;
  universityId: string;
  pickup: boolean;
  dropoff: boolean;
  pickupGroupId: string | null;
  dropoffGroupId: string | null;
}
