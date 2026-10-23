import { parseStudent, parsePeriod } from '../../src/registry/domain/registry';

const input = {
  name: ' Aluna Sintética ',
  phone: '+55 (46) 99999-0000',
  universityId: 'unimater',
  habitualDays: [],
};
describe('Registry input contract', () => {
  it('normalizes explicit international phone and permits no habitual days', () => {
    expect(parseStudent(input)).toEqual({
      ...input,
      name: 'Aluna Sintética',
      phone: '+5546999990000',
    });
  });
  it('sorts days without changing the supplied array', () => {
    const days = [5, 1];
    expect(parseStudent({ ...input, habitualDays: days }).habitualDays).toEqual(
      [1, 5],
    );
    expect(days).toEqual([5, 1]);
  });
  it.each([
    { phone: '46999990000' },
    { phone: '+55abc99999999' },
    { name: ' ' },
    { universityId: 'other' },
    { habitualDays: [1, 1] },
    { habitualDays: [7] },
    { habitualDays: [1.5] },
    { habitualDays: null },
    { price: 100 },
  ])('rejects invalid or unexpected fields %j', (patch) => {
    expect(() => parseStudent({ ...input, ...patch })).toThrow('INVALID_INPUT');
  });
  it('accepts a real leap day and a same-day inclusive period', () => {
    expect(
      parsePeriod({ startDate: '2028-02-29', endDate: '2028-02-29' }),
    ).toEqual({ startDate: '2028-02-29', endDate: '2028-02-29' });
  });
  it.each([
    ['2026-02-29', '2026-03-01'],
    ['2026-04-31', '2026-05-01'],
    ['2026-10-24', '2026-10-23'],
    ['23/10/2026', '2026-10-24'],
    ['2026-10-23T00:00:00Z', '2026-10-24'],
  ])('rejects invalid period %s / %s', (startDate, endDate) => {
    expect(() => parsePeriod({ startDate, endDate })).toThrow('INVALID_INPUT');
  });
});
