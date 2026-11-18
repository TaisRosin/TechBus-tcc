import { directInterpretation, parseProposal, type Proposal } from './domain';
export type Purpose =
  | 'trip'
  | 'pickup'
  | 'dropoff'
  | 'pickup-place'
  | 'dropoff-place';
export const normalizedName = (text: string) =>
  text
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
export function contextualAnswer(
  purpose: Purpose,
  base: Proposal,
  text: string,
): Proposal | null {
  const normalized = normalizedName(text).replace(/[.!]$/, '');
  if (purpose === 'pickup-place' || purpose === 'dropoff-place') {
    if (
      !text.trim() ||
      text.length > 200 ||
      ['sim', 'nao', 'talvez'].includes(normalized)
    )
      return null;
    return parseProposal({
      ...base,
      [purpose === 'pickup-place' ? 'pickupPlace' : 'dropoffPlace']:
        text.trim(),
      ambiguous: false,
    });
  }
  if (['sim', 'nao'].includes(normalized)) {
    const yes = normalized === 'sim';
    if (purpose === 'trip')
      return directInterpretation(yes ? 'vou e volto' : 'não vou');
    return parseProposal({
      trip: 'answer',
      pickup:
        purpose === 'pickup'
          ? yes
            ? 'yes'
            : 'no'
          : base.trip === 'answer'
            ? base.pickup
            : null,
      dropoff:
        purpose === 'dropoff'
          ? yes
            ? 'yes'
            : 'no'
          : base.trip === 'answer'
            ? base.dropoff
            : null,
      pickupPlace: null,
      dropoffPlace: null,
      savePickup: false,
      saveDropoff: false,
      ambiguous: false,
    });
  }
  const explicit = directInterpretation(text);
  return purpose === 'trip' && explicit && !explicit.ambiguous
    ? explicit
    : null;
}
export function questionText(purpose: Purpose): string {
  const question = {
    trip: 'Você vai hoje (ida e volta)? Se for somente um trecho, responda "só ida" ou "só volta".',
    pickup: 'Você vai na ida hoje?',
    dropoff: 'Você vai na volta hoje?',
    'pickup-place':
      'Qual é o nome do ponto de embarque cadastrado pela empresa?',
    'dropoff-place':
      'Qual é o nome do ponto de desembarque cadastrado pela empresa?',
  }[purpose];
  return `${question}\nUse Responder nesta mensagem para vincular sua resposta. Responda antes das 17h. Se a dúvida persistir, a equipe fará a revisão.`;
}
