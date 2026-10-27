import type { Journey, Receipt, CommandResult } from '../domain/journey';
export interface JourneyTransaction {
  markCancellation(studentId: string, id: string): Promise<void>;
  waitingBefore(
    studentId: string,
    date: string,
    before: number,
    after: number,
  ): Promise<boolean>;
  pendingCancellations(studentId: string, date: string): Promise<Receipt[]>;
  page(date: string, after: string | null, limit: number): Promise<string[]>;
  pending(
    studentId: string,
    date: string,
    afterSequence: number,
  ): Promise<string[]>;
  receipt(studentId: string, id: string): Promise<Receipt | null>;
  nextSequence(studentId: string): Promise<number>;
  receive(receipt: Receipt): Promise<void>;
  finish(studentId: string, id: string, result: CommandResult): Promise<void>;
  get(studentId: string, date: string): Promise<Journey | null>;
  save(journey: Journey): Promise<void>;
}
