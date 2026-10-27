import { randomUUID } from 'node:crypto';
import {
  parseCorrection,
  correctLegs,
} from '../../src/journey/domain/correction';
import { emptyLegs, transition } from '../../src/journey/domain/journey';
import { defaultReturn } from '../../src/journey/domain/closing';
describe('Team correction rules', () => {
  it('changes only explicitly selected legs without inferring a return at closing', () => {
    const legs = correctLegs(emptyLegs(), { pickup: 'confirmado' });
    expect(legs).toEqual({
      pickup: { state: 'confirmado', origin: 'equipe' },
      dropoff: { state: 'sem_resposta', origin: 'none' },
    });
    expect(defaultReturn(legs)).toBeNull();
    const refused = correctLegs(legs, { dropoff: 'recusado' });
    expect(transition(refused, { kind: 'going' }).dropoff).toEqual({
      state: 'recusado',
      origin: 'equipe',
    });
  });
  it('validates explicit review, nonempty reason, changes and trusted fields', () => {
    const input = {
      operationId: randomUUID(),
      expectedVersion: 0,
      reason: 'Contato telefônico',
      reviewedReceiptIds: [],
      changes: { pickup: 'confirmado' },
    };
    expect(parseCorrection(input).changes).toEqual({ pickup: 'confirmado' });
    for (const change of [
      { reason: '' },
      { changes: {} },
      { changes: { pickup: 'indeciso' } },
      { changes: { insideArea: true } },
      { reviewedReceiptIds: ['bad'] },
      { date: '2026-01-01' },
    ])
      expect(() => parseCorrection({ ...input, ...change })).toThrow();
  });
});
