import type { TeamUser } from '../../access/domain/access';
import type { Member } from '../domain/consultation';
export interface DriverLink {
  userId: string;
  driverId: string | null;
  version: number;
}
export interface ConsultationTransaction {
  lockAccess(): Promise<void>;
  actor(subject: string): Promise<TeamUser | null>;
  user(id: string): Promise<TeamUser | null>;
  link(userId: string): Promise<DriverLink | null>;
  owner(driverId: string): Promise<DriverLink | null>;
  saveLink(link: DriverLink): Promise<void>;
  manifest(date: string, version: number): Promise<Member[] | null>;
  saveManifest(date: string, version: number, members: Member[]): Promise<void>;
}
