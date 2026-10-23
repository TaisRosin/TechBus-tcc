import type { Clock } from '../../shared/time/clock';
import { operationalDate } from '../../shared/time/operational-date';
import {
  normalizePhone,
  type Student,
  type Contract,
} from '../domain/registry';
import { RegistryStore } from './ports';

export interface EnrollmentReader {
  lookup(
    phone: string,
  ): Promise<{ student: Student; contracts: Contract[] } | null>;
}
export class StoredEnrollmentReader implements EnrollmentReader {
  constructor(private readonly store: RegistryStore) {}
  lookup(phone: string) {
    return this.store.transaction(async (tx) => {
      const found = await tx.byPhone(phone);
      if (!found) return null;
      // Consistent with all student/period writers; no stale snapshot authorizes a command.
      const student = await tx.student(found.id, true);
      if (!student || student.phone !== phone) return null;
      return { student, contracts: await tx.contracts(student.id) };
    });
  }
}
export class EnrollmentGate {
  constructor(
    private readonly reader: EnrollmentReader,
    private readonly clock: Clock,
  ) {}
  // Internal assessment only. Future commands must revalidate in their own transaction;
  // VALID_ENROLLMENT is not a permission, a calendar decision or a confirmation.
  async check(phone: string) {
    const date = operationalDate(this.clock.now());
    const snapshot = await this.reader.lookup(normalizePhone(phone));
    if (!snapshot) return { status: 'UNKNOWN_STUDENT' as const, date };
    if (!snapshot.student.active)
      return { status: 'INACTIVE_STUDENT' as const, date };
    if (
      !snapshot.contracts.some((c) => c.startDate <= date && c.endDate >= date)
    )
      return { status: 'NO_VALID_CONTRACT' as const, date };
    return {
      status: 'VALID_ENROLLMENT' as const,
      date,
      student: snapshot.student,
    };
  }
}
