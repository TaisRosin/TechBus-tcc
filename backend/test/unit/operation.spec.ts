import {
  demand,
  recommend,
  coverageIssues,
  localInstant,
} from '../../src/operation/domain/operation';
import type { ProposedTrip } from '../../src/fleet/domain/fleet';

describe('Operation rules', () => {
  it('uses max, never sum, with all equivalent smallest vehicles', () => {
    expect(demand(30, 40)).toBe(40);
    const vehicles = [
      { id: 'a', seats: 44 },
      { id: 'b', seats: 44 },
      { id: 'c', seats: 50 },
      { id: 'd', seats: 30 },
    ];
    expect(recommend(40, vehicles)).toEqual({
      available: vehicles.slice(0, 3),
      recommended: vehicles.slice(0, 2),
      issue: null,
    });
    expect(recommend(51, vehicles).issue).toBe('NO_SUITABLE_VEHICLE');
    expect(recommend(0, vehicles)).toEqual({
      available: [],
      recommended: [],
      issue: 'NO_DEMAND',
    });
  });
  it('requires coverage without partition and permits a larger manual vehicle', () => {
    const trip: ProposedTrip = {
      vehicleId: 'v',
      universityId: 'unimater',
      stage: 'intermunicipal',
      start: 1000,
      end: 1500,
      legs: [],
    };
    const required = [
      { key: 'unimater', stage: 'intermunicipal' as const, count: 40 },
    ];
    expect(coverageIssues(required, [], new Map())).toContain(
      'DEMAND_UNCOVERED',
    );
    expect(coverageIssues(required, [trip], new Map([['v', 50]]))).toEqual([]);
    expect(coverageIssues(required, [trip], new Map([['v', 30]]))).toContain(
      'CAPACITY_INSUFFICIENT',
    );
    expect(
      coverageIssues(required, [trip, trip], new Map([['v', 50]])),
    ).toContain('DUPLICATE_ALLOCATION');
  });
  it('converts local minutes across midnight and adjacent dates without overlap at a boundary', () => {
    expect(localInstant('2026-10-25', 1020).toISOString()).toBe(
      '2026-10-25T20:00:00.000Z',
    );
    expect(localInstant('2026-10-25', 1500)).toEqual(
      localInstant('2026-10-26', 60),
    );
    expect(localInstant('2026-10-25', 2880)).toEqual(
      localInstant('2026-10-27', 0),
    );
    expect(() => localInstant('2026-10-25', -1)).toThrow();
  });
});
