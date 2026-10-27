import { calendarDate } from '../../registry/domain/calendar';
import { invalid } from '../../registry/domain/registry';
import { operationalDate } from '../../shared/time/operational-date';
import type { Legs, Leg, Journey } from './journey';

const hours = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  hourCycle: 'h23',
});
export function localHour(instant: Date): number {
  if (!Number.isFinite(instant.getTime())) return invalid();
  return Number(hours.format(instant));
}
export function closingDue(date: string, now: Date): boolean {
  calendarDate(date);
  const hour = localHour(now),
    current = operationalDate(now);
  return current > date || (current === date && hour >= 17);
}
export function defaultReturn(legs: Legs): Leg | null {
  if (
    legs.pickup.state !== 'confirmado' ||
    legs.pickup.origin === 'equipe' ||
    !['sem_resposta', 'indeciso'].includes(legs.dropoff.state)
  )
    return null;
  return { state: 'confirmado', origin: 'padrao_fechamento' };
}
export function returnGuidance(
  journey: Pick<Journey, 'pickup' | 'dropoff' | 'date' | 'closureIssue'>,
  now: Date,
) {
  if (journey.dropoff.state === 'cancelado')
    return {
      code: 'RETURN_CANCELLED',
      text: 'Sua volta está cancelada. A informação de ida foi preservada.',
    };
  if (journey.closureIssue)
    return {
      code: 'CLOSING_REVIEW_REQUIRED',
      text: 'A volta não foi confirmada por padrão porque a jornada exige ajuste da equipe.',
    };
  if (journey.dropoff.origin === 'padrao_fechamento') {
    if (operationalDate(now) === journey.date && localHour(now) < 22)
      return {
        code: 'RETURN_DEFAULT_CONFIRMED',
        text: 'Sua volta foi confirmada por padrão no fechamento. Você pode cancelar a volta antes das 22h de hoje.',
      };
    return {
      code: 'RETURN_DEFAULT_WINDOW_CLOSED',
      text: 'Sua volta foi confirmada por padrão no fechamento. O prazo de cancelamento pelo aluno terminou.',
    };
  }
  if (defaultReturn(journey)) {
    if (closingDue(journey.date, now))
      return {
        code: 'CLOSING_PENDING',
        text: 'A consolidação da volta ainda aguarda processamento.',
      };
    return {
      code: 'RETURN_DEFAULT_AT_17',
      text: 'Com a ida confirmada e a elegibilidade mantida, sua volta será confirmada por padrão às 17h. Você poderá cancelar a volta antes das 22h.',
    };
  }
  return null;
}
