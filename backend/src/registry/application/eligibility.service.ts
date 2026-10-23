import type { Clock } from '../../shared/time/clock';
import { operationalDate } from '../../shared/time/operational-date';
import { normalizePhone, invalid } from '../domain/registry';
import { evaluateEligibility } from '../domain/calendar';
import { RegistryStore } from './ports';

export class EligibilityService {
  constructor(
    private readonly store: RegistryStore,
    private readonly clock: Clock,
  ) {}
  consultation(phone: string) {
    return this.evaluate(phone, 'consultation', this.clock.now());
  }
  // Only trusted internal consumers may supply the durable receivedAt timestamp.
  request(phone: string, receivedAt: Date) {
    return this.evaluate(phone, 'request', receivedAt);
  }
  private async evaluate(
    phone: string,
    mode: 'consultation' | 'request',
    instant: Date,
  ) {
    const normalized = normalizePhone(phone);
    if (!(instant instanceof Date) || !Number.isFinite(instant.getTime()))
      return invalid();
    const received = new Date(instant.getTime()),
      date = operationalDate(received);
    return this.store.transaction(async (tx) => {
      const found = await tx.byPhone(normalized);
      if (!found) return evaluateEligibility(null, mode, received);
      // Writers of student/period data lock this same parent. Calendar writers
      // never lock students, so the order student -> calendar has no reverse path.
      const student = await tx.student(found.id, true);
      if (!student || student.phone !== normalized)
        return evaluateEligibility(null, mode, received);
      const calendar = await tx.calendar(student.universityId, 'read');
      const exception =
        (await tx.exceptions(student.universityId, date, date))[0]?.operates ??
        null;
      const contracts = await tx.contracts(student.id);
      return evaluateEligibility(
        { student, contracts, calendar, exception },
        mode,
        received,
      );
    });
  }
}
