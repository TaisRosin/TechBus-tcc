import type { TeamUser } from '../domain/access';

export abstract class IdentityVerifier {
  abstract verify(token: string): Promise<{ subject: string }>;
}
export abstract class TripAssignments {
  abstract isAssigned(userId: string, tripId: string): Promise<boolean>;
}
export interface TeamTransaction {
  bySubject(subject: string): Promise<TeamUser | null>;
  byId(id: string): Promise<TeamUser | null>;
  activeAdmins(): Promise<number>;
  save(user: TeamUser): Promise<void>;
}
export abstract class TeamStore {
  abstract bySubject(subject: string): Promise<TeamUser | null>;
  abstract transaction<T>(
    work: (tx: TeamTransaction) => Promise<T>,
  ): Promise<T>;
}
