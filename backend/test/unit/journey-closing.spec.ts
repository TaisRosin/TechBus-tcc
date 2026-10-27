import {
  closingDue,
  defaultReturn,
  returnGuidance,
} from '../../src/journey/domain/closing';
import { transition, emptyLegs } from '../../src/journey/domain/journey';

describe('Closing the operational day', () => {
  it('includes an undecided return only from 17h, with closing origin', () => {
    const legs = transition(emptyLegs(), {
      kind: 'answer',
      pickup: 'yes',
      dropoff: 'unsure',
    });
    expect(closingDue('2026-10-24', new Date('2026-10-24T19:59:59.999Z'))).toBe(
      false,
    );
    expect(closingDue('2026-10-24', new Date('2026-10-24T20:00:00.000Z'))).toBe(
      true,
    );
    expect(defaultReturn(legs)).toEqual({
      state: 'confirmado',
      origin: 'padrao_fechamento',
    });
  });
  it.each(['only_pickup', 'only_dropoff', 'not_going', 'going'] as const)(
    'preserves explicit states for %s',
    (kind) => {
      expect(defaultReturn(transition(emptyLegs(), { kind }))).toBeNull();
    },
  );
  it('does not confirm silence or outbound uncertainty', () => {
    expect(defaultReturn(emptyLegs())).toBeNull();
    expect(
      defaultReturn(
        transition(emptyLegs(), { kind: 'answer', pickup: 'unsure' }),
      ),
    ).toBeNull();
    expect(closingDue('2026-10-24', new Date('2026-10-25T03:00:00Z'))).toBe(
      true,
    );
    expect(closingDue('2026-10-25', new Date('2026-10-24T23:59:59Z'))).toBe(
      false,
    );
  });
  it('prepares truthful default/cancellation guidance without claiming a message was sent', () => {
    const journey = {
      ...transition(emptyLegs(), {
        kind: 'answer',
        pickup: 'yes',
        dropoff: 'unsure',
      }),
      date: '2026-10-24',
      closureIssue: null,
    };
    expect(
      returnGuidance(journey, new Date('2026-10-24T19:00:00Z'))?.code,
    ).toBe('RETURN_DEFAULT_AT_17');
    expect(
      returnGuidance(journey, new Date('2026-10-24T20:00:00Z'))?.code,
    ).toBe('CLOSING_PENDING');
    const closed = { ...journey, dropoff: defaultReturn(journey)! };
    expect(
      returnGuidance(closed, new Date('2026-10-25T00:59:59Z'))?.text,
    ).toContain('antes das 22h');
    expect(returnGuidance(closed, new Date('2026-10-25T01:00:00Z'))?.code).toBe(
      'RETURN_DEFAULT_WINDOW_CLOSED',
    );
    expect(
      returnGuidance(
        { ...journey, closureIssue: 'INACTIVE_STUDENT' },
        new Date('2026-10-24T20:00:00Z'),
      )?.code,
    ).toBe('CLOSING_REVIEW_REQUIRED');
  });
});
