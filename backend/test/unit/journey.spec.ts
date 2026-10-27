import {
  emptyLegs,
  transition,
  parseCommand,
  type Command,
} from '../../src/journey/domain/journey';

describe('Daily journey intentions', () => {
  it('does not count silence and going confirms both with a derived return', () => {
    const empty = emptyLegs();
    expect(empty.pickup.state).toBe('sem_resposta');
    expect(empty.dropoff.state).toBe('sem_resposta');
    expect(transition(empty, { kind: 'going' })).toEqual({
      pickup: { state: 'confirmado', origin: 'aluno_explicito' },
      dropoff: { state: 'confirmado', origin: 'implicito_da_ida' },
    });
  });
  it.each<[Command, string, string]>([
    [{ kind: 'only_pickup' }, 'confirmado', 'recusado'],
    [{ kind: 'only_dropoff' }, 'recusado', 'confirmado'],
    [{ kind: 'not_going' }, 'recusado', 'recusado'],
    [
      { kind: 'answer', pickup: 'yes', dropoff: 'unsure' },
      'confirmado',
      'indeciso',
    ],
    [{ kind: 'answer', pickup: 'unsure' }, 'indeciso', 'sem_resposta'],
  ])('applies explicit intent %j', (command, pickup, dropoff) => {
    expect(transition(emptyLegs(), command)).toMatchObject({
      pickup: { state: pickup },
      dropoff: { state: dropoff },
    });
  });
  it('preserves explicit return uncertainty for closing, without confirming it early', () => {
    const unsure = transition(emptyLegs(), {
      kind: 'answer',
      pickup: 'yes',
      dropoff: 'unsure',
    });
    expect(transition(unsure, { kind: 'going' }).dropoff.state).toBe(
      'indeciso',
    );
    expect(transition(unsure, { kind: 'unclear', persistent: true })).toEqual(
      unsure,
    );
  });
  it('removes only the derived return when outbound becomes uncertain', () => {
    const going = transition(emptyLegs(), { kind: 'going' });
    expect(
      transition(going, { kind: 'answer', pickup: 'unsure' }),
    ).toMatchObject({
      pickup: { state: 'indeciso' },
      dropoff: { state: 'sem_resposta', origin: 'none' },
    });
    const explicit = transition(going, { kind: 'answer', dropoff: 'yes' });
    expect(
      transition(explicit, { kind: 'answer', pickup: 'unsure' }).dropoff.state,
    ).toBe('confirmado');
  });
  it.each([
    { kind: 'answer' },
    { kind: 'answer', pickup: 'maybe' },
    { kind: 'going', receivedAt: '2026-10-23' },
    { kind: 'places', locationId: 'bad' },
    { kind: 'places', inside: true },
    { kind: 'unclear', persistent: 'true' },
    { kind: 'only_go' },
    null,
  ])('rejects ambiguous intent and authority fields %j', (input) => {
    expect(() => parseCommand(input)).toThrow('INVALID_INPUT');
  });
  it('preserves an explicit refusal after a generic going, until explicit return yes', () => {
    const only = transition(emptyLegs(), { kind: 'only_pickup' });
    const going = transition(only, { kind: 'going' });
    expect(going.dropoff).toEqual({
      state: 'recusado',
      origin: 'aluno_explicito',
    });
    expect(
      transition(going, { kind: 'answer', dropoff: 'yes' }).dropoff,
    ).toEqual({ state: 'confirmado', origin: 'aluno_explicito' });
  });
});
