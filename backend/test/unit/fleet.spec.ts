import {
  parseWindows,
  covers,
  parseProposal,
  parseWeek,
} from '../../src/fleet/domain/fleet';
import { randomUUID } from 'node:crypto';
describe('Fleet availability intervals', () => {
  it.each(
    [
      [{ stage: 'collection', start: 10, end: 10 }],
      [{ stage: 'collection', start: -1, end: 10 }],
      [{ stage: 'collection', start: 0.5, end: 10 }],
      [{ stage: 'collection', start: 10, end: 2881 }],
      [{ stage: 'unknown', start: 10, end: 20 }],
      [
        { stage: 'collection', start: 10, end: 30 },
        { stage: 'collection', start: 20, end: 40 },
      ],
      [{ stage: 'collection', start: 10, end: 20, approved: true }],
    ].map((windows) => [windows]),
  )('rejects invalid or ambiguous availability %#', (windows) => {
    expect(() => parseWindows(windows)).toThrow('INVALID_INPUT');
  });
  it('rejects an incomplete week and allows explicit unconfigured or unavailable days', () => {
    expect(() => parseWeek([[]])).toThrow('INVALID_INPUT');
    expect(parseWeek(null)).toBeNull();
    expect(parseWeek([[], [], [], [], [], [], []])).toHaveLength(7);
  });
  it('rejects reversed trips and a different vehicle injected into the return leg', () => {
    const leg = { driverId: randomUUID(), start: 1000, end: 1100 };
    const trip = {
      kind: 'intermunicipal',
      vehicleId: randomUUID(),
      universityId: 'unimater',
      outbound: leg,
      return: { ...leg, start: 1099, end: 1200 },
    };
    expect(() => parseProposal({ date: '2026-10-25', trips: [trip] })).toThrow(
      'INVALID_INPUT',
    );
    expect(() =>
      parseProposal({
        date: '2026-10-25',
        trips: [
          {
            ...trip,
            return: { ...leg, start: 1400, end: 1500, vehicleId: randomUUID() },
          },
        ],
      }),
    ).toThrow('INVALID_INPUT');
    expect(() => parseProposal({ date: '2026-02-30', trips: [trip] })).toThrow(
      'INVALID_INPUT',
    );
  });
  it('supports stages starting after midnight and keeps the intermunicipal vehicle occupied during the wait', () => {
    const vehicleId = randomUUID(),
      a = randomUUID(),
      b = randomUUID();
    expect(
      parseWindows([{ stage: 'distribution', start: 1470, end: 1530 }]),
    ).toHaveLength(1);
    const result = parseProposal({
      date: '2026-10-25',
      trips: [
        {
          kind: 'intermunicipal',
          vehicleId,
          universityId: 'unimater',
          outbound: { driverId: a, start: 1080, end: 1140 },
          return: { driverId: b, start: 1440, end: 1470 },
        },
      ],
    });
    expect(result.trips[0]).toMatchObject({
      vehicleId,
      stage: 'intermunicipal',
      start: 1080,
      end: 1470,
      legs: [
        { driverId: a, start: 1080, end: 1140 },
        { driverId: b, start: 1440, end: 1470 },
      ],
    });
  });
  it('covers adjacent intervals but not gaps, including after midnight', () => {
    const windows = parseWindows([
      { stage: 'intermunicipal', start: 1000, end: 1300 },
      { stage: 'intermunicipal', start: 1300, end: 1500 },
    ]);
    expect(covers(windows, 'intermunicipal', 1000, 1500)).toBe(true);
    expect(covers(windows, 'intermunicipal', 999, 1500)).toBe(false);
    expect(covers(windows, 'collection', 1000, 1100)).toBe(false);
    expect(
      covers(
        [
          { stage: 'intermunicipal', start: 1000, end: 1200 },
          { stage: 'intermunicipal', start: 1201, end: 1500 },
        ],
        'intermunicipal',
        1000,
        1500,
      ),
    ).toBe(false);
  });
});
