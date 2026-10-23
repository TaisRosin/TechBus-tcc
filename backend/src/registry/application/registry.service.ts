import { randomUUID } from 'node:crypto';
import { AccessError } from '../../access/domain/access';
import { RegistryStore, type RegistryTransaction } from './ports';
import {
  exact,
  invalid,
  parsePeriod,
  parseStudent,
  revision,
  uuid,
  type Student,
  type Contract,
} from '../domain/registry';

export class RegistryService {
  constructor(private readonly store: RegistryStore) {}
  private run<T>(
    actor: string,
    work: (tx: RegistryTransaction) => Promise<T>,
  ): Promise<T> {
    return this.store.transaction(async (tx) => {
      await tx.authorize(actor);
      return work(tx);
    });
  }
  universities(actor: string) {
    return this.run(actor, (tx) => tx.universities());
  }
  students(actor: string, query: unknown = {}) {
    if (!query || typeof query !== 'object' || Array.isArray(query))
      return invalid();
    const q = query as Record<string, unknown>;
    if (Object.keys(q).some((k) => !['limit', 'offset'].includes(k)))
      return invalid();
    const number = (v: unknown, fallback: number) => {
      if (v === undefined) return fallback;
      if (typeof v !== 'string' || !/^\d{1,10}$/.test(v)) return invalid();
      return Number(v);
    };
    const limit = number(q.limit, 50),
      offset = number(q.offset, 0);
    if (limit < 1 || limit > 100 || offset > 2147483647) return invalid();
    return this.run(actor, (tx) => tx.students(limit, offset));
  }
  private async required(
    tx: RegistryTransaction,
    id: string,
    lock = false,
  ): Promise<Student> {
    const student = await tx.student(uuid(id), lock);
    if (!student) throw new AccessError('NOT_FOUND', 404);
    return student;
  }
  student(actor: string, id: string) {
    return this.run(actor, (tx) => this.required(tx, id));
  }
  contracts(actor: string, id: string) {
    return this.run(actor, async (tx) => {
      await this.required(tx, id);
      return tx.contracts(id);
    });
  }
  async createStudent(actor: string, input: unknown) {
    const v = exact(input, [
      'name',
      'phone',
      'universityId',
      'habitualDays',
      'contract',
    ]);
    const { contract, ...fields } = v;
    const student: Student = {
      ...parseStudent(fields),
      id: randomUUID(),
      active: true,
      version: 1,
    };
    const initial: Contract = {
      ...parsePeriod(contract),
      id: randomUUID(),
      studentId: student.id,
      version: 1,
    };
    return this.run(actor, async (tx) => {
      await tx.saveStudent(student, true);
      await tx.saveContract(initial, true);
      return { student, contract: initial };
    });
  }
  async addContract(actor: string, studentId: string, input: unknown) {
    const period = parsePeriod(input);
    return this.run(actor, async (tx) => {
      await this.required(tx, studentId, true);
      if (await tx.overlaps(studentId, period))
        throw new AccessError('CONTRACT_OVERLAP', 409);
      const contract: Contract = {
        ...period,
        id: randomUUID(),
        studentId,
        version: 1,
      };
      await tx.saveContract(contract, true);
      return contract;
    });
  }
  async updateContract(actor: string, id: string, input: unknown) {
    const v = exact(input, ['startDate', 'endDate', 'expectedVersion']);
    const { expectedVersion, ...dates } = v;
    const period = parsePeriod(dates),
      expected = revision(expectedVersion);
    uuid(id);
    return this.run(actor, async (tx) => {
      const found = await tx.contract(id);
      if (!found) throw new AccessError('NOT_FOUND', 404);
      // All period writers lock the parent BEFORE rereading/checking periods.
      await this.required(tx, found.studentId, true);
      const previous = await tx.contract(id);
      if (!previous) throw new AccessError('NOT_FOUND', 404);
      if (previous.version !== expected)
        throw new AccessError('VERSION_CONFLICT', 409);
      if (await tx.overlaps(previous.studentId, period, id))
        throw new AccessError('CONTRACT_OVERLAP', 409);
      const contract = {
        ...previous,
        ...period,
        version: previous.version + 1,
      };
      await tx.saveContract(contract, false);
      return contract;
    });
  }
  async updateStudent(actor: string, id: string, input: unknown) {
    const v = exact(input, [
      'name',
      'phone',
      'universityId',
      'habitualDays',
      'active',
      'expectedVersion',
    ]);
    const { active, expectedVersion, ...fields } = v;
    if (typeof active !== 'boolean') return invalid();
    const parsed = parseStudent(fields),
      expected = revision(expectedVersion);
    return this.run(actor, async (tx) => {
      const previous = await this.required(tx, id, true);
      if (previous.version !== expected)
        throw new AccessError('VERSION_CONFLICT', 409);
      const student = {
        ...previous,
        ...parsed,
        active,
        version: previous.version + 1,
      };
      await tx.saveStudent(student, false);
      return student;
    });
  }
}
