import { readEvolutionConfig } from '../../src/whatsapp/config';
import { projectWebhook } from '../../src/whatsapp/domain';

describe('WhatsApp ingress contract', () => {
  const event = (jid = '5549999999999@s.whatsapp.net') => ({
    event: 'messages.upsert',
    instance: 'test',
    apikey: 'must-not-survive',
    data: {
      key: { id: 'message-one', remoteJid: jid, fromMe: false },
      message: { conversation: 'vou' },
      messageTimestamp: 1793200000,
    },
  });
  it('is disabled without configuration and refuses partial activation', () => {
    expect(readEvolutionConfig({})).toBeUndefined();
    expect(() => readEvolutionConfig({ EVOLUTION_ENABLED: 'true' })).toThrow();
  });
  it('requires loopback, separate secrets and explicit allowed recipients before sending', () => {
    const raw = {
      EVOLUTION_ENABLED: 'true',
      EVOLUTION_BASE_URL: 'http://127.0.0.1:8085',
      EVOLUTION_INSTANCE: 'test',
      EVOLUTION_API_KEY: 'a'.repeat(32),
      EVOLUTION_WEBHOOK_SECRET: 'b'.repeat(32),
    };
    expect(readEvolutionConfig(raw)).toMatchObject({
      sendEnabled: false,
      testPhones: [],
    });
    expect(() =>
      readEvolutionConfig({
        ...raw,
        EVOLUTION_BASE_URL: 'https://example.test',
      }),
    ).toThrow();
    expect(() =>
      readEvolutionConfig({
        ...raw,
        EVOLUTION_WEBHOOK_SECRET: raw.EVOLUTION_API_KEY,
      }),
    ).toThrow();
    expect(() =>
      readEvolutionConfig({ ...raw, EVOLUTION_SEND_ENABLED: 'true' }),
    ).toThrow();
    expect(() =>
      readEvolutionConfig({ ...raw, EVOLUTION_TEST_PHONES: '123' }),
    ).toThrow();
  });
  it('bounds text and identifiers and accepts only an explicit PN alternative to LID', () => {
    const payload = event();
    payload.data.message.conversation = 'a'.repeat(4097);
    expect(() => projectWebhook(payload, 'test')).toThrow('INVALID_INPUT');
    payload.data.message.conversation = 'sim';
    payload.data.key.id = 'a'.repeat(201);
    expect(() => projectWebhook(payload, 'test')).toThrow('INVALID_INPUT');
    const lid = event('123@lid');
    expect(
      projectWebhook(
        {
          ...lid,
          data: {
            ...lid.data,
            key: {
              ...lid.data.key,
              remoteJidAlt: '5549999999999@s.whatsapp.net',
            },
          },
        },
        'test',
      ),
    ).toMatchObject({ phone: '+5549999999999' });
  });
  it('projects provider delivery evidence without interpreting a student command', () => {
    expect(
      projectWebhook(
        {
          instance: 'test',
          event: 'messages.update',
          data: {
            keyId: 'provider-1',
            fromMe: true,
            status: 'READ',
            remoteJid: '5549999999999@s.whatsapp.net',
          },
        },
        'test',
      ),
    ).toMatchObject({
      kind: 'status',
      externalId: 'provider-1:READ',
      providerStatus: 'READ',
      text: null,
    });
  });
  it('projects only text and proven phone, never secrets or claimed student identity', () => {
    const result = projectWebhook({ ...event(), studentId: 'forged' }, 'test');
    expect(result).toMatchObject({
      phone: '+5549999999999',
      text: 'vou',
      externalId: 'message-one',
      kind: 'message',
    });
    expect(JSON.stringify(result)).not.toContain('must-not-survive');
    expect(JSON.stringify(result)).not.toContain('forged');
  });
  it('never treats an opaque LID as a telephone', () => {
    expect(projectWebhook(event('123456789@lid'), 'test')).toMatchObject({
      phone: null,
      disposition: 'identity_pending',
    });
    expect(projectWebhook(event('123@g.us'), 'test')).toBeNull();
  });
  it('refuses the wrong instance and ignores self messages', () => {
    expect(() => projectWebhook(event(), 'other')).toThrow('UNAUTHENTICATED');
    const own = event();
    own.data.key.fromMe = true;
    expect(projectWebhook(own, 'test')).toBeNull();
  });
  it('does not treat captions or media as written commands', () => {
    const media = {
      ...event(),
      data: { ...event().data, message: { imageMessage: { caption: 'vou' } } },
    };
    expect(projectWebhook(media, 'test')).toMatchObject({
      text: null,
      disposition: 'needs_text',
    });
  });
});
