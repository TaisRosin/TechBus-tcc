import type { Student, Contract, University, Period } from '../domain/registry';
import type { Calendar, CalendarException } from '../domain/calendar';
import type { LocationTransaction } from './location-ports';
import type { JourneyTransaction } from '../../journey/application/ports';
import type { PatternTransaction } from '../../journey/application/pattern-ports';
import type { FleetTransaction } from '../../fleet/application/ports';
import type { OperationTransaction } from '../../operation/application/ports';
import type { CorrectionTransaction } from '../../journey/application/correction-ports';
import type { MessageTransaction } from '../../messaging/application/ports';
import type { ConsultationTransaction } from '../../operation/application/consultation-ports';
import type { ItineraryTransaction } from '../../itinerary/application/ports';

export interface RegistryTransaction {
  itineraries: ItineraryTransaction;
  consultations: ConsultationTransaction;
  messages: MessageTransaction;
  corrections: CorrectionTransaction;
  operations: OperationTransaction;
  fleet: FleetTransaction;
  patterns: PatternTransaction;
  journeys: JourneyTransaction;
  places: LocationTransaction;
  calendar(
    universityId: string,
    lock: 'read' | 'write',
  ): Promise<Calendar | null>;
  saveCalendar(calendar: Calendar): Promise<void>;
  exceptions(
    universityId: string,
    from: string,
    to: string,
  ): Promise<CalendarException[]>;
  saveException(exception: CalendarException): Promise<void>;
  authorize(subject: string): Promise<void>;
  universities(): Promise<University[]>;
  students(limit: number, offset: number): Promise<Student[]>;
  student(id: string, lock?: boolean): Promise<Student | null>;
  byPhone(phone: string): Promise<Student | null>;
  saveStudent(student: Student, insert: boolean): Promise<void>;
  contracts(studentId: string): Promise<Contract[]>;
  contract(id: string): Promise<Contract | null>;
  overlaps(
    studentId: string,
    period: Period,
    exceptId?: string,
  ): Promise<boolean>;
  saveContract(contract: Contract, insert: boolean): Promise<void>;
}
export abstract class RegistryStore {
  abstract transaction<T>(
    work: (tx: RegistryTransaction) => Promise<T>,
  ): Promise<T>;
}
