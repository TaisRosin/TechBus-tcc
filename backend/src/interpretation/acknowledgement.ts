import type { Legs, State } from '../journey/domain/journey';
const names: Record<State, string> = {
  confirmado: 'confirmada',
  recusado: 'recusada',
  cancelado: 'cancelada',
  indeciso: 'indecisa',
  sem_resposta: 'sem resposta',
};
export function acknowledgementText(
  date: string,
  legs: Legs,
  pickup: string | null,
  dropoff: string | null,
): string {
  const lines = [
    `Anotado para ${date.split('-').reverse().join('/')}.`,
    `Ida: ${names[legs.pickup.state]}.`,
  ];
  if (legs.pickup.state === 'confirmado')
    lines.push(`Embarque: ${pickup ?? 'pendente de ajuste pela equipe'}.`);
  lines.push(`Volta: ${names[legs.dropoff.state]}.`);
  if (legs.dropoff.state === 'confirmado')
    lines.push(`Desembarque: ${dropoff ?? 'pendente de ajuste pela equipe'}.`);
  return lines.join('\n');
}
