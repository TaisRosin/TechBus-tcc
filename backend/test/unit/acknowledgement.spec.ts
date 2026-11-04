import { acknowledgementText } from '../../src/interpretation/acknowledgement';
import { emptyLegs, transition } from '../../src/journey/domain/journey';
describe('Acknowledgement of persisted journey state', () => {
  it('states both actual legs and places without requesting confirmation', () => {
    const text = acknowledgementText(
      '2026-10-29',
      transition(emptyLegs(), { kind: 'going' }),
      'Ponto Centro',
      'Rua de Teste, 123',
    );
    expect(text).toContain('Ida: confirmada');
    expect(text).toContain('Volta: confirmada');
    expect(text).toContain('Ponto Centro');
    expect(text).not.toContain('?');
  });
  it('does not invent missing places or override refusal', () => {
    const text = acknowledgementText(
      '2026-10-29',
      transition(emptyLegs(), { kind: 'only_pickup' }),
      null,
      null,
    );
    expect(text).toContain('Embarque: pendente de ajuste pela equipe');
    expect(text).toContain('Volta: recusada');
    expect(text).not.toContain('Desembarque:');
  });
  it('preserves indecision instead of claiming a confirmed return', () => {
    const text = acknowledgementText(
      '2026-10-29',
      transition(emptyLegs(), {
        kind: 'answer',
        pickup: 'yes',
        dropoff: 'unsure',
      }),
      null,
      null,
    );
    expect(text).toContain('Volta: indecisa');
    expect(text).not.toContain('Volta: confirmada');
  });
});
