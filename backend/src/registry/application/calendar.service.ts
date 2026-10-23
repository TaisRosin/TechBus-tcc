import { AccessError } from '../../access/domain/access';
import { exact, invalid } from '../domain/registry';
import { calendarDate, parseWeek, parseException } from '../domain/calendar';
import { RegistryStore, type RegistryTransaction } from './ports';

export class CalendarService {
  constructor(private readonly store: RegistryStore) {}
  private async required(
    tx: RegistryTransaction,
    id: string,
    lock: 'read' | 'write',
  ) {
    const calendar = await tx.calendar(id, lock);
    if (!calendar) throw new AccessError('NOT_FOUND', 404);
    return calendar;
  }
  get(actor: string, id: string) {
    return this.store.transaction(async (tx) => {
      await tx.authorize(actor);
      return this.required(tx, id, 'read');
    });
  }
  async week(actor: string, id: string, input: unknown) {
    const command = parseWeek(input);
    return this.store.transaction(async (tx) => {
      await tx.authorize(actor);
      const current = await this.required(tx, id, 'write');
      if (current.version !== command.expectedVersion)
        throw new AccessError('VERSION_CONFLICT', 409);
      const changed = {
        ...current,
        days: command.days,
        version: current.version + 1,
      };
      await tx.saveCalendar(changed);
      return changed;
    });
  }
  async exception(actor: string, id: string, date: string, input: unknown) {
    calendarDate(date);
    const command = parseException(input);
    return this.store.transaction(async (tx) => {
      await tx.authorize(actor);
      const current = await this.required(tx, id, 'write');
      if (current.version !== command.expectedVersion)
        throw new AccessError('VERSION_CONFLICT', 409);
      const exception = {
        universityId: id,
        date,
        operates: command.operates,
        reason: command.reason,
      };
      await tx.saveException(exception);
      await tx.saveCalendar({ ...current, version: current.version + 1 });
      return { calendarVersion: current.version + 1, exception };
    });
  }
  async exceptions(actor: string, id: string, query: unknown) {
    const q = exact(query, ['from', 'to']);
    const from = calendarDate(q.from),
      to = calendarDate(q.to);
    if (from > to || (Date.parse(to) - Date.parse(from)) / 86400000 > 365)
      return invalid();
    return this.store.transaction(async (tx) => {
      await tx.authorize(actor);
      const current = await this.required(tx, id, 'read');
      return {
        calendarVersion: current.version,
        exceptions: await tx.exceptions(id, from, to),
      };
    });
  }
}
