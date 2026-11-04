import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { WhatsAppStore } from '../../src/whatsapp/store';
import { projectWebhook } from '../../src/whatsapp/domain';
import { EvolutionSender } from '../../src/whatsapp/sender';
import type { EvolutionConfig } from '../../src/whatsapp/config';
import type { SendRequest } from '../../src/messaging/application/ports';
import { WhatsAppChannel1794100000000 } from '../../src/infrastructure/database/migrations/1794100000000-whatsapp-channel';
import { WhatsAppService } from '../../src/whatsapp/service';

describe('WhatsApp durable ingress', () => {
  let source: DataSource, store: WhatsAppStore;
  const instance = randomUUID(),
    student = randomUUID();
  const message = randomUUID();
  const config: EvolutionConfig = {
    instance,
    baseUrl: 'http://127.0.0.1:8085',
    apiKey: 'k'.repeat(32),
    webhookSecret: 's'.repeat(32),
    sendEnabled: true,
    testPhones: ['+5549999999999'],
  };
  const attempt = async (): Promise<SendRequest> => {
    const attemptId = randomUUID();
    await source.query(
      "INSERT INTO app.message_attempts(id,message_id,number,phone,text,status,started_at) SELECT $1,$2,COALESCE(MAX(number),0)+1,'+5549999999999','synthetic','sending',now() FROM app.message_attempts WHERE message_id=$2",
      [attemptId, message],
    );
    return {
      attemptId,
      messageId: message,
      phone: '+5549999999999',
      text: 'synthetic',
    };
  };
  const event = (text = 'vou', jid = '5549999999999@s.whatsapp.net') =>
    projectWebhook(
      {
        event: 'messages.upsert',
        instance,
        data: {
          key: { id: 'one', remoteJid: jid, fromMe: false },
          message: { conversation: text },
        },
      },
      instance,
    )!;
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    await source.query(
      "INSERT INTO app.students(id,name,phone,university_id,habitual_days) VALUES($1,'B18 synthetic','+5549999999999','unimater',ARRAY[]::smallint[])",
      [student],
    );
    store = new WhatsAppStore(readEnvironment(env).database);
    await source.query(
      "INSERT INTO app.outgoing_messages(id,student_id,date,slot,status,version,phone,text) VALUES($1,$2,'2026-10-28',5,'sending',1,'+5549999999999','synthetic')",
      [message, student],
    );
  });
  afterAll(async () => {
    await store?.close();
    if (source?.isInitialized) {
      await source.query('DELETE FROM app.whatsapp_events WHERE instance=$1', [
        instance,
      ]);
      await source.query(
        'DELETE FROM app.whatsapp_attempts WHERE instance=$1',
        [instance],
      );
      await source.query(
        'DELETE FROM app.message_attempts WHERE message_id=$1',
        [message],
      );
      await source.query('DELETE FROM app.outgoing_messages WHERE id=$1', [
        message,
      ]);
      await source.query(
        'DELETE FROM app.journey_receipts WHERE student_id=$1',
        [student],
      );
      await source.query('DELETE FROM app.students WHERE id=$1', [student]);
      await source.destroy();
    }
  });
  it('persists original evidence separately and preserves the receipt deadline on redelivery', async () => {
    const clock = { now: () => new Date('2026-10-28T16:59:59-03:00') };
    const body = {
      event: 'messages.upsert',
      instance,
      data: {
        key: {
          id: 'original-order',
          remoteJid: '5549999999999@s.whatsapp.net',
          fromMe: false,
        },
        message: { conversation: 'vou' },
        messageTimestamp: 999,
        techbusOriginalOrder: { source: 'wa-stanza-v1', seconds: 1793217598 },
      },
    };
    const projected = projectWebhook(body, instance)!;
    const result = await store.receive(instance, projected, clock);
    await store.receive(instance, projected, {
      now: () => new Date('2026-10-28T18:00:00-03:00'),
    });
    expect(
      await source.query(
        'SELECT original_order,received_at FROM app.whatsapp_events WHERE id=$1',
        [result.id],
      ),
    ).toEqual([
      {
        original_order: body.data.techbusOriginalOrder,
        received_at: clock.now(),
      },
    ]);
    expect(
      await source.query(
        'SELECT received_at,ordering FROM app.journey_receipts WHERE id=$1',
        [result.id],
      ),
    ).toEqual([{ received_at: clock.now(), ordering: 'uncertain' }]);
    await source.query('DELETE FROM app.whatsapp_events WHERE id=$1', [
      result.id,
    ]);
    await source.query('DELETE FROM app.journey_receipts WHERE id=$1', [
      result.id,
    ]);
  });
  it('commits one receipt under duplicate concurrency, preserving time and first content on conflict', async () => {
    const clock = { now: () => new Date('2026-10-28T16:59:59-03:00') };
    const results = await Promise.all([
      store.receive(instance, event(), clock),
      store.receive(instance, event(), clock),
    ]);
    expect(results[0].id).toBe(results[1].id);
    await store.receive(instance, event('não vou'), {
      now: () => new Date('2026-10-28T18:00:00-03:00'),
    });
    expect(
      await source.query(
        'SELECT text_body,conflict,received_at FROM app.whatsapp_events WHERE instance=$1',
        [instance],
      ),
    ).toEqual([{ text_body: 'vou', conflict: true, received_at: clock.now() }]);
    expect(
      await source.query(
        'SELECT ordering,received_at FROM app.journey_receipts WHERE student_id=$1',
        [student],
      ),
    ).toEqual([{ ordering: 'uncertain', received_at: clock.now() }]);
    expect(
      await source.query(
        'SELECT 1 FROM app.daily_journeys WHERE student_id=$1',
        [student],
      ),
    ).toEqual([]);
  });
  it('retains unknown contact without fabricating a student or receipt', async () => {
    const unknown = {
      ...event('sim', '5549888888888@s.whatsapp.net'),
      externalId: 'unknown',
    };
    const result = await store.receive(instance, unknown, {
      now: () => new Date(),
    });
    expect(result.disposition).toBe('unknown_contact');
    expect(
      await source.query(
        'SELECT student_id,receipt_id FROM app.whatsapp_events WHERE id=$1',
        [result.id],
      ),
    ).toEqual([{ student_id: null, receipt_id: null }]);
  });
  it('rolls back the receipt when persisting its event fails', async () => {
    const before = await source.query<{ n: number }[]>(
      'SELECT count(*)::int AS n FROM app.journey_receipts WHERE student_id=$1',
      [student],
    );
    await expect(
      store.receive(
        instance,
        { ...event(), externalId: 'x'.repeat(201) },
        { now: () => new Date() },
      ),
    ).rejects.toThrow('WHATSAPP_UNAVAILABLE');
    expect(
      await source.query(
        'SELECT count(*)::int AS n FROM app.journey_receipts WHERE student_id=$1',
        [student],
      ),
    ).toEqual(before);
  });
  it('preserves evidence on rollback and denies application deletion and schema creation', async () => {
    const runner = source.createQueryRunner();
    await runner.connect();
    try {
      await expect(
        new WhatsAppChannel1794100000000().down(runner),
      ).rejects.toThrow('B18_DATA_REQUIRES_PRESERVATION');
    } finally {
      await runner.release();
    }
    const user = readEnvironment(loadLocalEnvironment('test')).database.user;
    for (const table of ['whatsapp_events', 'whatsapp_attempts'])
      expect(
        await source.query(
          "SELECT has_table_privilege($1,$2,'DELETE') AS remove,has_schema_privilege($1,'app','CREATE') AS ddl",
          [user, `app.${table}`],
        ),
      ).toEqual([{ remove: false, ddl: false }]);
  });
  it('dispatches a persisted attempt at most once concurrently and records provider acceptance', async () => {
    const transport = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ key: { id: 'provider-1' } }), {
          status: 201,
        }),
      ),
    );
    const sender = new EvolutionSender(store, config, transport);
    const req = await attempt();
    const results = await Promise.all([sender.send(req), sender.send(req)]);
    expect(transport).toHaveBeenCalledTimes(1);
    const calls = transport.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0][1].headers).toMatchObject({ Origin: config.baseUrl });
    expect(calls[0][1].redirect).toBe('error');
    expect(results).toContainEqual({ status: 'sent' });
    expect(await sender.send(req)).toEqual({ status: 'sent' });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it.each(['timeout', 'http', 'malformed'])(
    'never retries uncertain %s after dispatch',
    async (failure) => {
      const transport = jest.fn(() =>
        failure === 'timeout'
          ? Promise.reject(new Error('timeout'))
          : Promise.resolve(
              new Response(failure === 'http' ? 'error' : '{}', {
                status: failure === 'http' ? 400 : 200,
              }),
            ),
      );
      const sender = new EvolutionSender(store, config, transport),
        req = await attempt();
      expect(await sender.send(req)).toEqual({ status: 'unknown' });
      expect(await sender.send(req)).toEqual({ status: 'unknown' });
      expect(transport).toHaveBeenCalledTimes(1);
    },
  );
  it('does not dispatch disabled, unlisted or forged attempts', async () => {
    const transport = jest.fn(() => Promise.resolve(new Response('{}'))),
      req = await attempt();
    expect(
      await new EvolutionSender(
        store,
        { ...config, sendEnabled: false },
        transport,
      ).send(req),
    ).toEqual({ status: 'failed' });
    expect(
      await new EvolutionSender(
        store,
        { ...config, testPhones: [] },
        transport,
      ).send(req),
    ).toEqual({ status: 'failed' });
    await expect(
      new EvolutionSender(store, config, transport).send({
        ...req,
        text: 'forged',
      }),
    ).rejects.toThrow('INVALID_ATTEMPT');
    expect(transport).not.toHaveBeenCalled();
  });
  it('correlates early status evidence only after the exact provider id is persisted', async () => {
    const actor = randomUUID();
    await source.query(
      "INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,'operator',true)",
      [actor],
    );
    try {
      const clock = { now: () => new Date() },
        service = new WhatsAppService(store, clock, config);
      const payload = (keyId: string) => ({
        instance,
        event: 'messages.update',
        data: {
          keyId,
          fromMe: true,
          status: 'READ',
          remoteJid: '5549999999999@s.whatsapp.net',
        },
      });
      await service.receive(config.webhookSecret, payload('early-status'));
      await service.receive(config.webhookSecret, payload('unrelated-status'));
      expect(await service.current(actor, {})).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: 'status', attemptId: null }),
        ]),
      );
      const req = await attempt();
      await new EvolutionSender(store, config, () =>
        Promise.resolve(
          new Response(JSON.stringify({ key: { id: 'early-status' } })),
        ),
      ).send(req);
      const rows = await service.current(actor, {});
      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            providerStatus: 'READ',
            attemptId: req.attemptId,
          }),
          expect.objectContaining({ providerStatus: 'READ', attemptId: null }),
        ]),
      );
    } finally {
      await source.query('DELETE FROM app.team_users WHERE id=$1', [actor]);
    }
  });
});
