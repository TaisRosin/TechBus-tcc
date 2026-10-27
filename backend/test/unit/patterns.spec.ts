import { sequence } from '../../src/journey/domain/patterns';
describe('Confirmed place sequence', () => {
  it('suspends on unknown confirmed place instead of assuming continuity', () => {
    expect(
      sequence([
        { date: '2026-10-01', placeId: 'a' },
        { date: '2026-10-02', placeId: null },
        { date: '2026-10-03', placeId: 'a' },
      ]),
    ).toMatchObject({ suspended: true });
    expect(
      sequence([
        { date: '2026-10-01', placeId: 'a' },
        { date: '2026-10-02', placeId: null },
      ]),
    ).toMatchObject({ suspended: true });
  });
  it('stops at a different known place and does not let older unknowns suspend a new sequence', () => {
    expect(
      sequence([
        { date: '2026-10-01', placeId: null },
        { date: '2026-10-02', placeId: 'b' },
        { date: '2026-10-03', placeId: 'a' },
      ]),
    ).toEqual({
      placeId: 'a',
      startDate: '2026-10-03',
      count: 1,
      suspended: false,
    });
    expect(sequence([])).toEqual({
      placeId: null,
      startDate: null,
      count: 0,
      suspended: false,
    });
  });
  it('requires four uses, ignores missing days and keeps direction-specific input', () => {
    const rows = ['2026-10-02', '2026-10-05', '2026-10-07', '2026-10-09'].map(
      (date) => ({ date, placeId: 'alternate' }),
    );
    expect(sequence(rows.slice(0, 3))).toEqual({
      placeId: 'alternate',
      startDate: '2026-10-02',
      count: 3,
      suspended: false,
    });
    expect(sequence(rows)).toEqual({
      placeId: 'alternate',
      startDate: '2026-10-02',
      count: 4,
      suspended: false,
    });
  });
});
