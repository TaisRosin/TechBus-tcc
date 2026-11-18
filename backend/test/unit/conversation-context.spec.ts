import { contextualAnswer } from '../../src/interpretation/context';
import { directInterpretation } from '../../src/interpretation/domain';
import { projectWebhook, eventFingerprint } from '../../src/whatsapp/domain';
describe('Quoted clarification answers', () => {
  it('preserves the explicit other leg from the original compound request', () => {
    expect(
      contextualAnswer(
        'dropoff',
        {
          ...directInterpretation('sim')!,
          trip: 'answer',
          pickup: 'yes',
          dropoff: 'unsure',
        },
        'não',
      ),
    ).toMatchObject({ pickup: 'yes', dropoff: 'no' });
  });
  it('treats a yes to the explicitly asked round trip as both legs', () => {
    expect(
      contextualAnswer('trip', directInterpretation('sim')!, 'sim'),
    ).toMatchObject({ trip: 'answer', pickup: 'yes', dropoff: 'yes' });
  });
  it('projects only a quote identifier and preserves uncertain ordering', () => {
    const data = {
      key: {
        id: 'incoming',
        remoteJid: '5549999999999@s.whatsapp.net',
        fromMe: false,
      },
      message: {
        extendedTextMessage: {
          text: 'sim',
          contextInfo: {
            stanzaId: 'outgoing',
            quotedMessage: { conversation: 'forged question' },
          },
        },
      },
    };
    const projected = projectWebhook(
      { instance: 'test', event: 'messages.upsert', data },
      'test',
    )!;
    expect(projected.replyTo).toBe('outgoing');
    expect(projected.originalOrder).toBeUndefined();
    expect(JSON.stringify(projected)).not.toContain('forged');
    const mismatch = projectWebhook(
      {
        instance: 'test',
        event: 'messages.upsert',
        data: { ...data, contextInfo: { stanzaId: 'other' } },
      },
      'test',
    )!;
    expect(mismatch.replyTo).toBeUndefined();
    expect(eventFingerprint(projected)).not.toBe(eventFingerprint(mismatch));
    expect(() =>
      projectWebhook(
        { instance: 'other', event: 'messages.upsert', data },
        'test',
      ),
    ).toThrow('UNAUTHENTICATED');
  });
  it('answers only the requested return leg', () => {
    expect(
      contextualAnswer('dropoff', directInterpretation('sim')!, 'sim'),
    ).toMatchObject({
      trip: 'answer',
      pickup: null,
      dropoff: 'yes',
      ambiguous: false,
    });
  });
  it('does not turn an unknown answer into agreement', () => {
    expect(
      contextualAnswer('trip', directInterpretation('sim')!, 'talvez'),
    ).toBeNull();
  });
  it('uses a quoted point name only for the requested side', () => {
    expect(
      contextualAnswer('dropoff-place', directInterpretation('vou')!, 'Praça'),
    ).toMatchObject({
      trip: 'going',
      pickupPlace: null,
      dropoffPlace: 'Praça',
    });
  });
});
