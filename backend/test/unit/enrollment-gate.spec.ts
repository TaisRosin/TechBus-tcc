import { EnrollmentGate } from '../../src/registry/application/enrollment-gate';
import { FixedClock } from '../support/fixed-clock';
import type { Student, Contract } from '../../src/registry/domain/registry';

const student: Student = {
  id: 'synthetic',
  name: 'Synthetic',
  phone: '+5546999990000',
  universityId: 'unimater',
  habitualDays: [],
  active: true,
  version: 1,
};
const periods: Contract[] = [
  {
    id: 'period',
    studentId: student.id,
    startDate: '2026-10-23',
    endDate: '2026-10-23',
    version: 1,
  },
];
describe('Enrollment base gate (not full eligibility)', () => {
  const check = (
    instant: string,
    s: Student | null = student,
    contracts = periods,
  ) =>
    new EnrollmentGate(
      { lookup: () => Promise.resolve(s ? { student: s, contracts } : null) },
      new FixedClock(instant),
    ).check(student.phone);
  it.each(['2026-10-23T03:00:00Z', '2026-10-24T02:59:59Z'])(
    'includes both bounds in Sao Paulo and accepts empty habitual days at %s',
    async (instant) => {
      await expect(check(instant)).resolves.toMatchObject({
        status: 'VALID_ENROLLMENT',
        date: '2026-10-23',
      });
    },
  );
  it.each(['2026-10-23T02:59:59Z', '2026-10-24T03:00:00Z'])(
    'rejects dates outside inclusive period at %s',
    async (instant) => {
      await expect(check(instant)).resolves.toMatchObject({
        status: 'NO_VALID_CONTRACT',
      });
    },
  );
  it('rejects inactive student even with a current contract', async () => {
    await expect(
      check('2026-10-23T12:00:00Z', { ...student, active: false }),
    ).resolves.toMatchObject({ status: 'INACTIVE_STUDENT' });
  });
  it('does not presume an unknown student enrolled', async () => {
    await expect(check('2026-10-23T12:00:00Z', null)).resolves.toMatchObject({
      status: 'UNKNOWN_STUDENT',
    });
  });
  it('rejects missing periods without inventing validity', async () => {
    await expect(
      check('2026-10-23T12:00:00Z', student, []),
    ).resolves.toMatchObject({ status: 'NO_VALID_CONTRACT' });
  });
});
