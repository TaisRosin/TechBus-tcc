import type { ProposedTrip, Stage } from '../../fleet/domain/fleet';
export interface Plan {
  date: string;
  version: number;
  draft: ProposedTrip[];
  demandToken: string;
  confirmedVersion: number | null;
  confirmedTrips: ProposedTrip[] | null;
  confirmedToken: string | null;
  confirmedBy: string | null;
  confirmedAt: Date | null;
  needsAdjustment: boolean;
}
export interface Occupancy {
  vehicleId: string | null;
  driverId: string | null;
  stage: Stage;
  side: string;
}
export interface OperationTransaction {
  plan(date: string): Promise<Plan | null>;
  save(plan: Plan): Promise<void>;
  replaceOccupancies(
    date: string,
    version: number,
    values: Occupancy[],
  ): Promise<void>;
  actorId(subject: string): Promise<string>;
}
