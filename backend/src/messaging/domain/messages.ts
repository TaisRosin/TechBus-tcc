import { localHour } from '../../journey/domain/closing';
import type { Legs } from '../../journey/domain/journey';

export type Slot = 5 | 11 | 13 | 16 | 17;
export type MessageStatus =
  | 'ready'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'unknown'
  | 'skipped';
export interface OutgoingMessage {
  id: string;
  studentId: string;
  date: string;
  slot: Slot;
  status: MessageStatus;
  version: number;
  phone: string;
  text: string;
  code: string | null;
}
export function latestSlot(now: Date): Slot | null {
  const hour = localHour(now);
  if (hour < 5 || hour >= 17) return null;
  return hour >= 16 ? 16 : hour >= 13 ? 13 : hour >= 11 ? 11 : 5;
}
export function pendingText(legs: Legs): string | null {
  const pending = (state: string) =>
    ['sem_resposta', 'indeciso'].includes(state);
  const pickup = pending(legs.pickup.state),
    dropoff = pending(legs.dropoff.state);
  if (!pickup && !dropoff) return null;
  const subject =
    pickup && dropoff ? 'sua ida e volta' : pickup ? 'sua ida' : 'sua volta';
  return `Informe ${subject} para hoje antes das 17h. Sem resposta não há confirmação de viagem.`;
}
