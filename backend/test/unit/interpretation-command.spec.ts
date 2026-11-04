import { directInterpretation } from '../../src/interpretation/domain';
import { proposalCommand } from '../../src/interpretation/command';
import { emptyLegs, transition } from '../../src/journey/domain/journey';

describe('Interpretation to journey command', () => {
  it('translates a clear going without requesting reconfirmation', () => {
    const result = proposalCommand(directInterpretation('vou'));
    expect(result).toEqual({ command: { kind: 'going' }, code: null });
    expect(transition(emptyLegs(), result.command!).pickup.state).toBe(
      'confirmado',
    );
  });
  it('does not partially execute a trip with an unresolved address', () => {
    expect(
      proposalCommand({
        ...directInterpretation('vou'),
        dropoffPlace: 'Rua de Teste, 123',
      }),
    ).toEqual({ command: null, code: 'LOCATION_RESOLUTION_REQUIRED' });
  });
  it('preserves explicit return indecision', () => {
    const result = proposalCommand({
      ...directInterpretation('vou'),
      trip: 'answer',
      pickup: 'yes',
      dropoff: 'unsure',
    });
    expect(result.command).toEqual({
      kind: 'answer',
      pickup: 'yes',
      dropoff: 'unsure',
    });
    expect(transition(emptyLegs(), result.command!).dropoff.state).toBe(
      'indeciso',
    );
  });
  it('does not turn an isolated yes into a journey command', () => {
    expect(proposalCommand(directInterpretation('sim'))).toEqual({
      command: null,
      code: 'AMBIGUOUS',
    });
  });
  it('does not silently discard a request to change defaults', () => {
    expect(
      proposalCommand({
        ...directInterpretation('vou'),
        dropoffPlace: 'Rua de Teste, 123',
        saveDropoff: true,
      }),
    ).toEqual({ command: null, code: 'LOCATION_RESOLUTION_REQUIRED' });
  });
  it('rejects forged privileged fields', () => {
    expect(() =>
      proposalCommand({ ...directInterpretation('vou'), ordering: 'received' }),
    ).toThrow('INVALID_PROPOSAL');
  });
});
