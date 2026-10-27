import type { Contribution } from '../domain/patterns';
import type { Direction } from '../../registry/domain/locations';
export interface PatternTransaction {
  lastSequence(studentId: string, side: Direction): Promise<number>;
  refused(studentId: string, key: string): Promise<boolean>;
  record(value: PatternDecision): Promise<void>;
  contributions(
    studentId: string,
    side: Direction,
    date: string,
  ): Promise<Contribution[]>;
}
export interface PatternDecision {
  studentId: string;
  receiptId: string;
  direction: Direction;
  action: 'accept' | 'refuse' | 'request';
  sequence: number;
  defaultVersion: number;
  suggestionKey: string | null;
  placeId: string;
}
