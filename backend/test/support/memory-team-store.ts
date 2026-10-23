import {
  TeamStore,
  type TeamTransaction,
} from '../../src/access/application/ports';
import type { TeamUser } from '../../src/access/domain/access';

export class MemoryTeamStore extends TeamStore {
  constructor(public users: TeamUser[]) {
    super();
  }
  bySubject(subject: string): Promise<TeamUser | null> {
    return Promise.resolve(
      this.users.find((u) => u.subject === subject) ?? null,
    );
  }
  async transaction<T>(work: (tx: TeamTransaction) => Promise<T>): Promise<T> {
    const copy = this.users.map((u) => ({ ...u }));
    const result = await work({
      bySubject: (subject) =>
        Promise.resolve(copy.find((u) => u.subject === subject) ?? null),
      byId: (id) => Promise.resolve(copy.find((u) => u.id === id) ?? null),
      activeAdmins: () =>
        Promise.resolve(
          copy.filter((u) => u.active && u.role === 'admin').length,
        ),
      save: (user) => {
        copy[copy.findIndex((u) => u.id === user.id)] = { ...user };
        return Promise.resolve();
      },
    });
    this.users = copy;
    return result;
  }
}
