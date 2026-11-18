export interface Session {
  id: string;
  role: "admin" | "operator" | "driver";
  active: boolean;
  version: number;
}
export interface Student {
  id: string;
  name: string;
  phone: string;
  universityId: string;
  habitualDays: number[];
  active: boolean;
  version: number;
}
export interface Contract {
  id: string;
  startDate: string;
  endDate: string;
  version: number;
}
export interface Catalog {
  id: string;
  name: string;
  active: boolean;
  version: number;
  direction?: string;
  groupId?: string;
  address?: string;
}
export interface Vehicle {
  id: string;
  identifier: string;
  plate: string;
  kind: string;
  seats: number;
  active: boolean;
  version: number;
  week: boolean[] | null;
}
export interface Driver {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  version: number;
}
export interface Leg {
  state: string;
  origin: string;
}
export interface OperationRow {
  studentId: string;
  name: string;
  phone: string;
  universityId: string;
  pickup: Leg;
  dropoff: Leg;
  pickupPlace: { id: string; label: string; stopReference?: string } | null;
  dropoffPlace: { id: string; label: string; stopReference?: string } | null;
  issues: string[];
  pending: string[];
  eligible: boolean;
  pickupGroupId?: string | null;
  dropoffGroupId?: string | null;
}
export interface Overview {
  date: string;
  total: number;
  students: OperationRow[];
  counts: { pickup: Record<string, number>; dropoff: Record<string, number> };
}
export interface Trip {
  vehicleId: string;
  stage: string;
  groupId?: string;
  universityId?: string;
  legs: { driverId: string }[];
}
export interface Planning {
  date: string;
  version: number;
  status: string;
  demandToken: string;
  closingPending: boolean;
  issues: { studentId: string; code: string }[];
  planningIssues: string[];
  groups: { groupId: string; stage: string; count: number }[];
  universities: {
    universityId: string;
    pickup: number;
    dropoff: number;
    required: number;
  }[];
  plan: {
    draft: Trip[];
    confirmedVersion: number | null;
    confirmedTrips?: Trip[] | null;
  } | null;
}
export interface DriverTrip {
  id: string;
  date: string;
  stage: string;
  side: string;
  universityId: string | null;
  groupId: string | null;
  vehicle: Vehicle | null;
  start: string;
  end: string;
  needsAdjustment: boolean;
  students?: {
    studentId: string;
    name: string;
    phone: string;
    place: { label: string; stopReference?: string } | null;
  }[];
}
export interface Stop {
  id: string;
  label: string;
  stopReference?: string;
  studentIds: string[];
}
export interface Itinerary {
  date: string;
  version: number;
  previewToken: string;
  needsAdjustment: boolean;
  order: { version: number; stopIds: string[] };
  candidate: { ordered: Stop[]; pending: Stop[] };
  planning: Planning;
  publication: { version: number } | null;
}
