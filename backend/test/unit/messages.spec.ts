import { latestSlot, pendingText } from '../../src/messaging/domain/messages';
import { emptyLegs } from '../../src/journey/domain/journey';

describe('Scheduled message rules', () => {
  it.each([
    ['04:59:59', null],
    ['05:00:00', 5],
    ['10:59:59', 5],
    ['11:00:00', 11],
    ['13:00:00', 13],
    ['16:59:59', 16],
    ['17:00:00', null],
  ])('selects only the latest relevant slot at %s', (time, slot) => {
    expect(latestSlot(new Date(`2026-10-26T${time}-03:00`))).toBe(slot);
  });
  it('asks only about unresolved legs and never treats silence as confirmation', () => {
    const legs = emptyLegs();
    expect(pendingText(legs)).toContain('ida e volta');
    legs.pickup = { state: 'confirmado', origin: 'aluno_explicito' };
    expect(pendingText(legs)).toContain('sua volta');
    legs.dropoff = { state: 'recusado', origin: 'aluno_explicito' };
    expect(pendingText(legs)).toBeNull();
    legs.pickup.state = 'indeciso';
    expect(pendingText(legs)).toContain('sua ida');
  });
});
