import { consultable, tripSide } from '../../src/operation/domain/consultation';
import type { ProposedTrip } from '../../src/fleet/domain/fleet';
describe('Operational consultation window', () => {
  const trip: ProposedTrip = {
    stage: 'intermunicipal',
    vehicleId: 'v',
    universityId: 'unimater',
    start: 1080,
    end: 1470,
    legs: [
      { driverId: 'a', start: 1080, end: 1140 },
      { driverId: 'b', start: 1410, end: 1470 },
    ],
  };
  it('ends access at the date boundary even when a legacy trip ends later', () => {
    expect(
      consultable('2026-10-26', [trip], new Date('2026-10-27T00:29:59-03:00')),
    ).toBe(false);
    expect(
      consultable('2026-10-26', [trip], new Date('2026-10-27T00:30:00-03:00')),
    ).toBe(false);
    expect(
      consultable('2026-10-25', [trip], new Date('2026-10-27T00:00:00-03:00')),
    ).toBe(false);
    expect(
      consultable('2026-10-27', [], new Date('2026-10-27T00:00:00-03:00')),
    ).toBe(true);
  });
  it('distinguishes existing outbound and return assignments', () => {
    expect(tripSide(trip, 0)).toBe('pickup');
    expect(tripSide(trip, 1)).toBe('dropoff');
  });
});
