import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { WhatsAppStore } from '../../src/whatsapp/store';
import { projectWebhook } from '../../src/whatsapp/domain';
import { InterpretationService } from '../../src/interpretation/service';
import { directInterpretation } from '../../src/interpretation/domain';
import { MessageInterpretation1794200000000 } from '../../src/infrastructure/database/migrations/1794200000000-message-interpretation';

describe('Persisted interpretation boundary', () => {
  let source: DataSource, store: WhatsAppStore, service: InterpretationService;
  const actor = randomUUID(),
    student = randomUUID(),
    instance = randomUUID(),
    phone = `+55469${randomInt(10000000, 99999999)}`;
  const clock = { now: () => new Date('2026-10-28T18:00:00-03:00') };
  const provider = {
    interpret: jest.fn(() =>
      Promise.resolve({ proposal: directInterpretation('vou'), code: null }),
    ),
  };
  const receive = async (text: string, known = true) =>
    store.receive(
      instance,
      projectWebhook(
        {
          instance,
          event: 'messages.upsert',
          data: {
            key: {
              id: randomUUID(),
              remoteJid: `${known ? phone.slice(1) : '5549888888888'}@s.whatsapp.net`,
              fromMe: false,
            },
            message: { conversation: text },
          },
        },
        instance,
      )!,
      clock,
    );
  beforeAll(async () => {
    const raw = loadLocalEnvironment('test');
    source = createTestDataSource(raw);
    await source.initialize();
    await source.runMigrations();
    await source.query(
      "INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,'operator',true)",
      [actor],
    );
    await source.query(
      "INSERT INTO app.students(id,name,phone,university_id,habitual_days) VALUES($1,'B18.3 synthetic',$2,'unimater',ARRAY[]::smallint[])",
      [student, phone],
    );
    store = new WhatsAppStore(readEnvironment(raw).database);
    service = new InterpretationService(store, clock, provider);
  });
  afterAll(async () => {
    await store?.close();
    if (source?.isInitialized) {
      await source.query(
        'DELETE FROM app.message_interpretations WHERE event_id IN (SELECT id FROM app.whatsapp_events WHERE instance=$1)',
        [instance],
      );
      await source.query('DELETE FROM app.whatsapp_events WHERE instance=$1', [
        instance,
      ]);
      await source.query(
        'DELETE FROM app.journey_receipts WHERE student_id=$1',
        [student],
      );
      await source.query('DELETE FROM app.students WHERE id=$1', [student]);
      await source.query('DELETE FROM app.team_users WHERE id=$1', [actor]);
      await source.destroy();
    }
  });
  beforeEach(() => provider.interpret.mockClear());
  it('persists the entire address request as pending without applying the trip', async () => {
    provider.interpret.mockResolvedValueOnce({
      proposal: {
        ...directInterpretation('vou')!,
        dropoffPlace: 'Rua de Teste, 123',
      },
      code: null,
    });
    const event = await receive('vou e quero voltar para outro endereço');
    expect(await service.interpret(actor, event.id, {})).toMatchObject({
      code: 'LOCATION_RESOLUTION_REQUIRED',
      proposal: { trip: 'going', dropoffPlace: 'Rua de Teste, 123' },
    });
    expect(await service.interpret(actor, event.id, {})).toMatchObject({
      code: 'LOCATION_RESOLUTION_REQUIRED',
    });
    expect(provider.interpret).toHaveBeenCalledTimes(1);
    expect(
      await source.query(
        'SELECT 1 FROM app.daily_journeys WHERE student_id=$1',
        [student],
      ),
    ).toEqual([]);
  });
  it('interprets a simple command without provider and preserves uncertain receipt after 17h', async () => {
    const event = await receive('vou');
    const result = await service.interpret(actor, event.id, {});
    expect(result).toMatchObject({
      state: 'completed',
      source: 'rules',
      code: 'ORDER_UNCERTAIN',
      proposal: { trip: 'going' },
    });
    expect(provider.interpret).not.toHaveBeenCalled();
    expect(
      await source.query(
        'SELECT received_at,ordering FROM app.journey_receipts WHERE student_id=$1 AND id=$2',
        [student, event.id],
      ),
    ).toEqual([{ received_at: clock.now(), ordering: 'uncertain' }]);
    expect(
      await source.query(
        'SELECT 1 FROM app.daily_journeys WHERE student_id=$1',
        [student],
      ),
    ).toEqual([]);
  });
  it('claims a complex message once under concurrency and never repeats the provider', async () => {
    const event = await receive('vou e talvez volte');
    await Promise.all([
      service.interpret(actor, event.id, {}),
      service.interpret(actor, event.id, {}),
    ]);
    expect(provider.interpret).toHaveBeenCalledTimes(1);
    expect(await service.interpret(actor, event.id, {})).toMatchObject({
      state: 'completed',
      source: 'gemini',
      code: 'ORDER_UNCERTAIN',
    });
    expect(provider.interpret).toHaveBeenCalledTimes(1);
  });
  it('keeps yes ambiguous and unknown contacts outside the provider', async () => {
    expect(
      await service.interpret(actor, (await receive('sim')).id, {}),
    ).toMatchObject({ code: 'AMBIGUOUS' });
    expect(
      await service.interpret(
        actor,
        (await receive('linguagem natural', false)).id,
        {},
      ),
    ).toMatchObject({ code: 'UNKNOWN_CONTACT', proposal: null });
    expect(provider.interpret).not.toHaveBeenCalled();
  });
  it('does not accept fabricated text or a revoked operator', async () => {
    const event = await receive('vou');
    await expect(
      service.interpret(actor, event.id, { text: 'não vou' }),
    ).rejects.toThrow('INVALID_INPUT');
    await source.query('UPDATE app.team_users SET active=false WHERE id=$1', [
      actor,
    ]);
    try {
      await expect(service.interpret(actor, event.id, {})).rejects.toThrow(
        'FORBIDDEN',
      );
    } finally {
      await source.query('UPDATE app.team_users SET active=true WHERE id=$1', [
        actor,
      ]);
    }
  });
  it('discards a proposal if the message becomes conflicting while the provider runs', async () => {
    const event = await receive('texto complexo');
    const slow = new InterpretationService(store, clock, {
      interpret: async () => {
        await source.query(
          'UPDATE app.whatsapp_events SET conflict=true WHERE id=$1',
          [event.id],
        );
        return { proposal: directInterpretation('vou'), code: null };
      },
    });
    expect(await slow.interpret(actor, event.id, {})).toMatchObject({
      proposal: null,
      code: 'EVENT_CONFLICT',
    });
  });
  it('does not keep a usable proposal when the student is deactivated during interpretation', async () => {
    const event = await receive('texto complexo');
    const slow = new InterpretationService(store, clock, {
      interpret: async () => {
        await source.query('UPDATE app.students SET active=false WHERE id=$1', [
          student,
        ]);
        return { proposal: directInterpretation('vou'), code: null };
      },
    });
    try {
      expect(await slow.interpret(actor, event.id, {})).toMatchObject({
        proposal: null,
        code: 'STUDENT_INACTIVE',
      });
    } finally {
      await source.query('UPDATE app.students SET active=true WHERE id=$1', [
        student,
      ]);
    }
  });
  it('keeps a failed provider attempt final and does not retry it', async () => {
    const event = await receive('texto complexo'),
      transport = jest.fn(() => Promise.reject(new Error('provider failed')));
    const failed = new InterpretationService(store, clock, {
      interpret: transport,
    });
    expect(await failed.interpret(actor, event.id, {})).toMatchObject({
      proposal: null,
      code: 'PROVIDER_UNAVAILABLE',
    });
    expect(await failed.interpret(actor, event.id, {})).toMatchObject({
      proposal: null,
      code: 'PROVIDER_UNAVAILABLE',
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('preserves interpretation evidence on rollback and denies application deletion', async () => {
    const runner = source.createQueryRunner();
    await runner.connect();
    try {
      await expect(
        new MessageInterpretation1794200000000().down(runner),
      ).rejects.toThrow('B18_3_DATA_REQUIRES_PRESERVATION');
    } finally {
      await runner.release();
    }
    const user = readEnvironment(loadLocalEnvironment('test')).database.user;
    expect(
      await source.query(
        "SELECT has_table_privilege($1,'app.message_interpretations','DELETE') AS remove,has_schema_privilege($1,'app','CREATE') AS ddl",
        [user],
      ),
    ).toEqual([{ remove: false, ddl: false }]);
  });
  it('does not return a proposal to an operator revoked while the provider runs', async () => {
    const event = await receive('complexa');
    const revoked = new InterpretationService(store, clock, {
      interpret: async () => {
        await source.query(
          'UPDATE app.team_users SET active=false WHERE id=$1',
          [actor],
        );
        return { proposal: directInterpretation('vou'), code: null };
      },
    });
    try {
      await expect(revoked.interpret(actor, event.id, {})).rejects.toThrow(
        'FORBIDDEN',
      );
    } finally {
      await source.query('UPDATE app.team_users SET active=true WHERE id=$1', [
        actor,
      ]);
    }
    expect(await service.interpret(actor, event.id, {})).toMatchObject({
      proposal: null,
      code: 'ACCESS_REVOKED',
    });
  });
});
