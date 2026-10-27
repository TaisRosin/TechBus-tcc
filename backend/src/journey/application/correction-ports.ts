import type { Journey, Receipt } from '../domain/journey';
export interface CorrectionResult {
  operationId: string;
  version: number;
  correctedAt: string;
  journey: Journey;
}
export interface CorrectionRecord {
  studentId: string;
  operationId: string;
  date: string;
  actorId: string;
  requestHash: string;
  reason: string;
  createdAt: Date;
  result: CorrectionResult;
}
export interface CorrectionTransaction {
  pending(studentId: string, date: string): Promise<Receipt[]>;
  get(studentId: string, operationId: string): Promise<CorrectionRecord | null>;
  insert(value: CorrectionRecord): Promise<void>;
}
