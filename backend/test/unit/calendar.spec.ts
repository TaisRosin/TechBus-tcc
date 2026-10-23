import {
  operation,
  parseWeek,
  parseException,
  evaluateEligibility,
} from '../../src/registry/domain/calendar';
import type { Student, Contract } from '../../src/registry/domain/registry';

describe('University calendar rules', () => {
  it('uses explicit exceptions before the week, even without a configured week', () => {
    expect(operation(null, true, '2026-10-23')).toBe('OPERATING');
    expect(operation([5], false, '2026-10-23')).toBe('NO_OPERATION');
    expect(operation([5], null, '2026-10-23')).toBe('OPERATING');
    expect(operation([], null, '2026-10-23')).toBe('NO_OPERATION');
    expect(operation(null, null, '2026-10-23')).toBe('CALENDAR_UNCONFIGURED');
  });
  it('accepts an explicitly empty week and sorts unique days', () => {
    expect(parseWeek({ days: [], expectedVersion: 1 })).toEqual({
      days: [],
      expectedVersion: 1,
    });
    expect(parseWeek({ days: [5, 1], expectedVersion: 1 }).days).toEqual([
      1, 5,
    ]);
  });
  it.each([
    { days: [1, 1] },
    { days: [7] },
    { days: [-1] },
    { days: [1.5] },
    { days: null },
  ])('rejects invalid days %j', ({ days }) => {
    expect(() => parseWeek({ days, expectedVersion: 1 })).toThrow(
      'INVALID_INPUT',
    );
  });
  it('accepts inheritance reset but requires a reason and revision', () => {
    expect(
      parseException({
        operates: null,
        reason: ' Correção ',
        expectedVersion: 2,
      }),
    ).toEqual({ operates: null, reason: 'Correção', expectedVersion: 2 });
    expect(() =>
      parseException({ operates: true, reason: ' ', expectedVersion: 1 }),
    ).toThrow('INVALID_INPUT');
    expect(() => parseWeek({ days: [1], expectedVersion: 0 })).toThrow(
      'INVALID_INPUT',
    );
    expect(() =>
      parseWeek({ days: [1], expectedVersion: 1, other: true }),
    ).toThrow('INVALID_INPUT');
  });
});

describe('Eligibility without creating confirmations', () => {
  const student: Student = {
    id: 'synthetic',
    name: 'Synthetic',
    phone: '+5546999990000',
    universityId: 'unimater',
    habitualDays: [5],
    active: true,
    version: 1,
  };
  const contracts: Contract[] = [
    {
      id: 'period',
      studentId: student.id,
      startDate: '2026-10-23',
      endDate: '2026-10-23',
      version: 1,
    },
  ];
  const base = {
    student,
    contracts,
    calendar: { universityId: 'unimater', days: [5], version: 2 },
    exception: null,
  };
  it('requires habitual day only for automatic consultation', () => {
    const empty = { ...base, student: { ...student, habitualDays: [] } };
    expect(
      evaluateEligibility(
        empty,
        'consultation',
        new Date('2026-10-23T08:00:00Z'),
      ),
    ).toMatchObject({ eligible: false, reason: 'NOT_HABITUAL' });
    expect(
      evaluateEligibility(
        empty,
        'request',
        new Date('2026-10-23T19:59:59.999Z'),
      ),
    ).toMatchObject({ eligible: true, reason: 'ELIGIBLE', date: '2026-10-23' });
  });
  it.each(['2026-10-23T20:00:00.000Z', '2026-10-23T21:00:00Z'])(
    'rejects requests at/after 17h: %s',
    (instant) => {
      expect(
        evaluateEligibility(base, 'request', new Date(instant)),
      ).toMatchObject({ eligible: false, reason: 'DEADLINE_PASSED' });
    },
  );
  it('uses Sao Paulo date boundaries and inclusive validity', () => {
    expect(
      evaluateEligibility(
        base,
        'consultation',
        new Date('2026-10-23T02:59:59Z'),
      ),
    ).toMatchObject({ reason: 'NO_VALID_CONTRACT', date: '2026-10-22' });
    expect(
      evaluateEligibility(
        base,
        'consultation',
        new Date('2026-10-23T03:00:00Z'),
      ),
    ).toMatchObject({ eligible: true });
    expect(
      evaluateEligibility(
        base,
        'consultation',
        new Date('2026-10-24T02:59:59Z'),
      ),
    ).toMatchObject({ eligible: true });
    expect(
      evaluateEligibility(
        base,
        'consultation',
        new Date('2026-10-24T03:00:00Z'),
      ),
    ).toMatchObject({ reason: 'NO_VALID_CONTRACT' });
  });
  it('blocks unknown/inactive/missing contract independently of operation', () => {
    const instant = new Date('2026-10-23T12:00:00Z');
    expect(evaluateEligibility(null, 'request', instant).reason).toBe(
      'UNKNOWN_STUDENT',
    );
    expect(
      evaluateEligibility(
        { ...base, student: { ...student, active: false } },
        'request',
        instant,
      ).reason,
    ).toBe('INACTIVE_STUDENT');
    expect(
      evaluateEligibility({ ...base, contracts: [] }, 'request', instant)
        .reason,
    ).toBe('NO_VALID_CONTRACT');
  });
  it('requires known operation and applies exceptions independently of habitual days', () => {
    const instant = new Date('2026-10-23T12:00:00Z');
    expect(
      evaluateEligibility(
        { ...base, calendar: { ...base.calendar, days: null } },
        'request',
        instant,
      ).reason,
    ).toBe('CALENDAR_UNCONFIGURED');
    expect(
      evaluateEligibility({ ...base, exception: false }, 'request', instant)
        .reason,
    ).toBe('NO_OPERATION');
    expect(
      evaluateEligibility(
        { ...base, calendar: { ...base.calendar, days: [] }, exception: true },
        'request',
        instant,
      ).eligible,
    ).toBe(true);
  });
  it('rejects invalid instants rather than presuming eligibility', () => {
    expect(() =>
      evaluateEligibility(base, 'request', new Date('invalid')),
    ).toThrow('INVALID_INPUT');
  });
});
