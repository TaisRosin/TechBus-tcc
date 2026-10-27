import type { OutgoingMessage, Slot } from '../domain/messages';
export interface SendRequest {
  attemptId: string;
  messageId: string;
  phone: string;
  text: string;
}
export interface SendOutcome {
  status: 'sent' | 'failed' | 'unknown';
}
export abstract class MessageSender {
  abstract send(request: SendRequest): Promise<SendOutcome>;
}
export class DisabledMessageSender extends MessageSender {
  send(): Promise<SendOutcome> {
    return Promise.resolve({ status: 'failed' });
  }
}
export interface MessageTransaction {
  get(id: string, lock?: boolean): Promise<OutgoingMessage | null>;
  find(
    studentId: string,
    date: string,
    slot: Slot,
  ): Promise<OutgoingMessage | null>;
  list(date: string, limit: number, offset: number): Promise<OutgoingMessage[]>;
  save(message: OutgoingMessage, insert?: boolean): Promise<void>;
  skipEarlier(studentId: string, date: string, slot: Slot): Promise<void>;
  start(request: SendRequest, now: Date): Promise<void>;
  finish(
    attemptId: string,
    status: SendOutcome['status'],
    code: string | null,
    now: Date,
  ): Promise<void>;
}
