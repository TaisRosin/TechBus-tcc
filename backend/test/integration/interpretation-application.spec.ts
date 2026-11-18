import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { WhatsAppStore } from '../../src/whatsapp/store';
import { projectWebhook } from '../../src/whatsapp/domain';
import { InterpretationService } from '../../src/interpretation/service';
import { InterpretationApplication } from '../../src/interpretation/application';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import { RegistryService } from '../../src/registry/application/registry.service';
import { JourneyService } from '../../src/journey/application/journey.service';
import { ConversationProcessor } from '../../src/interpretation/processor';
import { AcknowledgementDispatcher } from '../../src/whatsapp/acknowledgement-dispatcher';
import { LocationService } from '../../src/registry/application/location.service';
import { directInterpretation } from '../../src/interpretation/domain';

describe('Applying interpreted WhatsApp messages atomically', () => {
  let db: DataSource, store: WhatsAppStore, registry: PostgresRegistryStore;
  const actor = randomUUID(),
    instance = randomUUID(),
    students: string[] = [];
  const fixedPlaces: string[] = [],
    fixedGroups: string[] = [];
  let ownsCalendar = false;
  let instant = new Date('2026-10-29T16:59:59-03:00');
  const clock = { now: () => instant };
  let apply: InterpretationApplication, interpret: InterpretationService;
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    db = createTestDataSource(env);
    await db.initialize();
    await db.runMigrations();
    const [calendar] = await db.query<
      { days: number[] | null; version: number }[]
    >(
      "SELECT days,version FROM app.university_calendars WHERE university_id='unimater'",
    );
    if (calendar.days !== null || calendar.version !== 1)
      throw new Error('Existing calendar preserved');
    ownsCalendar = true;
    await db.query(
      "UPDATE app.university_calendars SET days=ARRAY[0,1,2,3,4,5,6]::smallint[] WHERE university_id='unimater'",
    );
    await db.query(
      "INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,'operator',true)",
      [actor],
    );
    store = new WhatsAppStore(readEnvironment(env).database);
    registry = new PostgresRegistryStore(readEnvironment(env).database);
    apply = new InterpretationApplication(store, clock);
    interpret = new InterpretationService(store, clock, {
      interpret: () => Promise.resolve({ proposal: null, code: 'UNUSED' }),
    });
  });
  beforeEach(() => {
    instant = new Date('2026-10-29T16:59:59-03:00');
  });
  afterAll(async () => {
    await store?.close();
    await registry?.close();
    if (db?.isInitialized) {
      await db.query(
        'DELETE FROM app.conversation_jobs WHERE event_id IN (SELECT id FROM app.whatsapp_events WHERE instance=$1)',
        [instance],
      );
      await db.query(
        'DELETE FROM app.journey_acknowledgements WHERE event_id IN (SELECT id FROM app.whatsapp_events WHERE instance=$1)',
        [instance],
      );
      await db.query(
        'DELETE FROM app.message_interpretations WHERE event_id IN (SELECT id FROM app.whatsapp_events WHERE instance=$1)',
        [instance],
      );
      await db.query('DELETE FROM app.whatsapp_events WHERE instance=$1', [
        instance,
      ]);
      for (const table of ['journey_receipts', 'daily_journeys', 'contracts'])
        await db.query(
          'DELETE FROM app.' + table + ' WHERE student_id=ANY($1::uuid[])',
          [students],
        );
      await db.query('DELETE FROM app.students WHERE id=ANY($1::uuid[])', [
        students,
      ]);
      await db.query(
        'DELETE FROM app.return_locations WHERE id=ANY($1::uuid[])',
        [fixedPlaces],
      );
      await db.query('DELETE FROM app.local_groups WHERE id=ANY($1::uuid[])', [
        fixedGroups,
      ]);
      await db.query('DELETE FROM app.team_users WHERE id=$1', [actor]);
      if (ownsCalendar)
        await db.query(
          "UPDATE app.university_calendars SET days=NULL WHERE university_id='unimater'",
        );
      await db.destroy();
    }
  });
  async function student() {
    const phone = '+55469' + randomInt(10000000, 99999999);
    const result = await new RegistryService(registry).createStudent(actor, {
      name: 'Ordering synthetic',
      phone,
      universityId: 'unimater',
      habitualDays: [],
      contract: { startDate: '2026-10-01', endDate: '2026-12-31' },
    });
    students.push(result.student.id);
    return { id: result.student.id, phone };
  }
  async function message(
    s: { phone: string },
    text: string,
    seconds: number | null,
  ) {
    const event = projectWebhook(
      {
        instance,
        event: 'messages.upsert',
        data: {
          key: {
            id: randomUUID(),
            remoteJid: s.phone.slice(1) + '@s.whatsapp.net',
            fromMe: false,
          },
          message: { conversation: text },
          techbusOriginalOrder:
            seconds === null ? null : { source: 'wa-stanza-v1', seconds },
        },
      },
      instance,
    )!;
    const result = await store.receive(instance, event, clock);
    await interpret.interpret(actor, result.id, {});
    return result.id;
  }
  const stamp = () => Math.floor(instant.getTime() / 1000) - 10;
  it('applies trip and a named fixed dropoff as a complete command', async () => {
    const locations = new LocationService(registry, {
      validate: () => Promise.reject(new Error('MAPS_NOT_USED')),
    });
    const group = await locations.create(actor, 'group', {
      name: 'Synthetic context group',
      direction: 'dropoff',
    });
    fixedGroups.push(group.id);
    const name = 'Synthetic point ' + randomUUID();
    const point = await locations.create(actor, 'dropoff', {
      name,
      address: 'Fixed company point',
      groupId: group.id,
    });
    fixedPlaces.push(point.id);
    const s = await student(),
      id = await message(s, 'vou', stamp());
    await db.query(
      'UPDATE app.message_interpretations SET proposal=$2::jsonb WHERE event_id=$1',
      [
        id,
        JSON.stringify({ ...directInterpretation('vou')!, dropoffPlace: name }),
      ],
    );
    expect(await apply.applyReceived(id)).toMatchObject({ status: 'applied' });
    expect(
      await db.query(
        'SELECT pickup_state,dropoff_state,location_id FROM app.daily_journeys WHERE student_id=$1',
        [s.id],
      ),
    ).toEqual([
      {
        pickup_state: 'confirmado',
        dropoff_state: 'confirmado',
        location_id: point.id,
      },
    ]);
    const other = await student(),
      bad = await message(other, 'vou', stamp());
    await db.query(
      'UPDATE app.message_interpretations SET proposal=$2::jsonb WHERE event_id=$1',
      [
        bad,
        JSON.stringify({
          ...directInterpretation('vou')!,
          dropoffPlace: 'Unknown ' + randomUUID(),
        }),
      ],
    );
    expect(await apply.applyReceived(bad)).toMatchObject({
      code: 'LOCATION_NOT_FOUND',
    });
    expect(
      await db.query('SELECT 1 FROM app.daily_journeys WHERE student_id=$1', [
        other.id,
      ]),
    ).toEqual([]);
  });
  it('processes a durable event once across concurrent worker runs without an admin identity', async () => {
    const s = await student();
    const id = await message(s, 'vou', stamp());
    const worker = new ConversationProcessor(
      store,
      clock,
      interpret,
      apply,
      instance,
    );
    await Promise.all([worker.runOnce(), worker.runOnce()]);
    expect(
      await db.query(
        'SELECT state,code FROM app.conversation_jobs WHERE event_id=$1',
        [id],
      ),
    ).toEqual([{ state: 'completed', code: 'APPLIED' }]);
    expect(
      await db.query(
        'SELECT journey_version FROM app.journey_acknowledgements WHERE event_id=$1',
        [id],
      ),
    ).toEqual([{ journey_version: 1 }]);
  });
  it('does not retry a failed worker job or prepare a false acknowledgement', async () => {
    const s = await student();
    const id = await message(s, 'vou', stamp());
    const failure = jest
      .spyOn(apply, 'applyReceived')
      .mockRejectedValueOnce(new Error('synthetic failure'));
    try {
      const worker = new ConversationProcessor(
        store,
        clock,
        interpret,
        apply,
        instance,
      );
      await worker.runOnce();
      await worker.runOnce();
      expect(failure).toHaveBeenCalledTimes(1);
      expect(
        await db.query(
          'SELECT code FROM app.conversation_jobs WHERE event_id=$1',
          [id],
        ),
      ).toEqual([{ code: 'PROCESSING_FAILED' }]);
      expect(
        await db.query(
          'SELECT 1 FROM app.journey_acknowledgements WHERE event_id=$1',
          [id],
        ),
      ).toEqual([]);
    } finally {
      failure.mockRestore();
    }
  });
  it('rolls back receipt promotion, journey and acknowledgement together on transaction failure', async () => {
    const s = await student();
    const id = await message(s, 'vou', stamp());
    const transaction = store.transaction.bind(store);
    const failure = jest
      .spyOn(store, 'transaction')
      .mockImplementationOnce((work) =>
        transaction(async (m) => {
          await work(m);
          throw new Error('ROLLBACK_PROBE');
        }),
      );
    try {
      await expect(apply.applyReceived(id)).rejects.toThrow();
    } finally {
      failure.mockRestore();
    }
    expect(
      await db.query(
        'SELECT ordering,result FROM app.journey_receipts WHERE id=$1',
        [id],
      ),
    ).toEqual([{ ordering: 'uncertain', result: null }]);
    expect(
      await db.query('SELECT 1 FROM app.daily_journeys WHERE student_id=$1', [
        s.id,
      ]),
    ).toEqual([]);
    expect(
      await db.query(
        'SELECT 1 FROM app.journey_acknowledgements WHERE event_id=$1',
        [id],
      ),
    ).toEqual([]);
  });
  it('dispatches a prepared acknowledgement at most once under concurrency', async () => {
    const s = await student();
    const id = await message(s, 'vou', stamp());
    await apply.apply(actor, id, {});
    const transport = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ key: { id: 'ack-' + id } }), {
          status: 200,
        }),
      ),
    );
    const dispatcher = new AcknowledgementDispatcher(
      store,
      clock,
      {
        instance,
        baseUrl: 'http://127.0.0.1:8085',
        apiKey: 'synthetic-key',
        webhookSecret: 'synthetic-secret',
        sendEnabled: true,
        testPhones: [s.phone],
      },
      transport,
    );
    await Promise.all([dispatcher.runOnce(), dispatcher.runOnce()]);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(
      await db.query(
        'SELECT state FROM app.journey_acknowledgements WHERE event_id=$1',
        [id],
      ),
    ).toEqual([{ state: 'sent' }]);
  });
  it('applies clear timely intent after 17h once without reconfirmation', async () => {
    const s = await student();
    const id = await message(s, 'vou', stamp());
    instant = new Date('2026-10-29T18:00:00-03:00');
    const results = await Promise.all([
      apply.apply(actor, id, {}),
      apply.apply(actor, id, {}),
    ]);
    expect(results).toEqual([
      { status: 'applied', version: 1 },
      { status: 'applied', version: 1 },
    ]);
    const [j] = await db.query<
      { pickup_state?: string; dropoff_state: string; version?: number }[]
    >(
      'SELECT pickup_state,dropoff_state,version FROM app.daily_journeys WHERE student_id=$1',
      [s.id],
    );
    expect(j).toEqual({
      pickup_state: 'confirmado',
      dropoff_state: 'confirmado',
      version: 1,
    });
    const replies = await db.query<{ text: string; journey_version: number }[]>(
      'SELECT text,journey_version FROM app.journey_acknowledgements WHERE event_id=$1',
      [id],
    );
    expect(replies).toHaveLength(1);
    expect(replies[0].journey_version).toBe(1);
    expect(replies[0].text).toContain('Ida: confirmada');
    expect(replies[0].text).toContain('pendente de ajuste pela equipe');
  });
  it('does not reopen deadlines using an early provider timestamp', async () => {
    const s = await student();
    const original = stamp();
    instant = new Date('2026-10-29T17:00:00-03:00');
    const id = await message(s, 'vou', original);
    expect(await apply.apply(actor, id, {})).toMatchObject({
      status: 'rejected',
      code: 'DEADLINE_PASSED',
    });
  });
  it('does not let an older message arriving later replace an applied one', async () => {
    const s = await student();
    const t = stamp();
    const newer = await message(s, 'vou', t);
    await apply.apply(actor, newer, {});
    const older = await message(s, 'não vou', t - 1);
    expect(await apply.apply(actor, older, {})).toMatchObject({
      code: 'STALE_PROVIDER_MESSAGE',
    });
  });
  it('keeps same-second conflict pending', async () => {
    const s = await student();
    const t = stamp();
    const a = await message(s, 'vou', t);
    await message(s, 'não vou', t);
    expect(await apply.apply(actor, a, {})).toMatchObject({
      code: 'ORDER_UNCERTAIN',
    });
  });
  it('does not skip an earlier unprocessed refusal', async () => {
    const s = await student();
    const t = stamp();
    const first = await message(s, 'só ida', t - 1);
    const next = await message(s, 'vou', t);
    expect(await apply.apply(actor, next, {})).toMatchObject({
      code: 'ORDER_PREDECESSOR_PENDING',
    });
    await apply.apply(actor, first, {});
    expect(await apply.apply(actor, next, {})).toMatchObject({
      status: 'applied',
    });
    const [j] = await db.query<
      { pickup_state?: string; dropoff_state: string; version?: number }[]
    >('SELECT dropoff_state FROM app.daily_journeys WHERE student_id=$1', [
      s.id,
    ]);
    expect(j.dropoff_state).toBe('recusado');
  });
  it('requires original evidence and active authorization', async () => {
    const s = await student();
    const id = await message(s, 'vou', null);
    expect(await apply.apply(actor, id, {})).toMatchObject({
      code: 'ORDER_UNCERTAIN',
    });
    await expect(apply.apply(randomUUID(), id, {})).rejects.toThrow(
      'FORBIDDEN',
    );
    await expect(
      apply.apply(actor, id, { ordering: 'received' }),
    ).rejects.toThrow();
  });
  it('does not overwrite a newer internal revision with a delayed provider message', async () => {
    const s = await student();
    const earlier = stamp();
    const journeys = new JourneyService(registry, clock);
    const receipt = await journeys.receive(s.id, randomUUID());
    await journeys.apply(s.id, receipt.id, { kind: 'not_going' });
    const delayed = await message(s, 'vou', earlier);
    expect(await apply.apply(actor, delayed, {})).toMatchObject({
      code: 'REVISION_REVIEW_REQUIRED',
    });
  });
  it.each(['timeout', 'http', 'malformed', 'oversized'])(
    'never resends an uncertain acknowledgement after %s',
    async (mode) => {
      const person = await student();
      const id = await message(person, 'vou', stamp());
      await apply.apply(actor, id, {});
      const transport = jest.fn(() =>
        mode === 'timeout'
          ? Promise.reject(new Error('timeout'))
          : Promise.resolve(
              new Response(mode === 'oversized' ? 'x'.repeat(9000) : '{}', {
                status: mode === 'http' ? 500 : 200,
              }),
            ),
      );
      const dispatcher = new AcknowledgementDispatcher(
        store,
        clock,
        {
          instance,
          baseUrl: 'http://127.0.0.1:8085',
          apiKey: 'synthetic',
          webhookSecret: 'synthetic',
          sendEnabled: true,
          testPhones: [person.phone],
        },
        transport,
      );
      await dispatcher.runOnce();
      await dispatcher.runOnce();
      expect(transport).toHaveBeenCalledTimes(1);
      expect(
        await db.query(
          'SELECT state,delivery_code FROM app.journey_acknowledgements WHERE event_id=$1',
          [id],
        ),
      ).toEqual([{ state: 'unknown', delivery_code: 'DELIVERY_UNCERTAIN' }]);
    },
  );
  it.each(['revision', 'phone', 'conflict', 'new-message', 'old-day'])(
    'does not send an outdated acknowledgement after %s',
    async (change) => {
      const person = await student();
      const id = await message(person, 'vou', stamp());
      await apply.apply(actor, id, {});
      if (change === 'revision') {
        const service = new JourneyService(registry, clock);
        const receipt = await service.receive(person.id, randomUUID());
        await service.apply(person.id, receipt.id, { kind: 'not_going' });
      }
      if (change === 'phone')
        await db.query('UPDATE app.students SET phone=$2 WHERE id=$1', [
          person.id,
          '+55469' + randomInt(10000000, 99999999),
        ]);
      if (change === 'conflict')
        await db.query(
          'UPDATE app.whatsapp_events SET conflict=true WHERE id=$1',
          [id],
        );
      if (change === 'new-message') await message(person, 'sim', stamp() + 1);
      if (change === 'old-day') instant = new Date('2026-10-30T08:00:00-03:00');
      const transport = jest.fn(() => Promise.resolve(new Response('{}')));
      const dispatcher = new AcknowledgementDispatcher(
        store,
        clock,
        {
          instance,
          baseUrl: 'http://127.0.0.1:8085',
          apiKey: 'synthetic',
          webhookSecret: 'synthetic',
          sendEnabled: true,
          testPhones: [person.phone],
        },
        transport,
      );
      await dispatcher.runOnce();
      expect(transport).not.toHaveBeenCalled();
      expect(
        await db.query(
          'SELECT state FROM app.journey_acknowledgements WHERE event_id=$1',
          [id],
        ),
      ).toEqual([{ state: 'superseded' }]);
    },
  );
  it('does not resend after provider acceptance when persisting the result fails', async () => {
    const person = await student();
    const id = await message(person, 'vou', stamp());
    await apply.apply(actor, id, {});
    const transport = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ key: { id: 'accepted-' + id } })),
      ),
    );
    const dispatcher = new AcknowledgementDispatcher(
      store,
      clock,
      {
        instance,
        baseUrl: 'http://127.0.0.1:8085',
        apiKey: 'synthetic',
        webhookSecret: 'synthetic',
        sendEnabled: true,
        testPhones: [person.phone],
      },
      transport,
    );
    const transaction = store.transaction.bind(store);
    const failure = jest
      .spyOn(store, 'transaction')
      .mockImplementationOnce(transaction)
      .mockRejectedValueOnce(new Error('synthetic persistence failure'));
    try {
      await expect(dispatcher.runOnce()).rejects.toThrow();
    } finally {
      failure.mockRestore();
    }
    await dispatcher.runOnce();
    expect(transport).toHaveBeenCalledTimes(1);
    expect(
      await db.query(
        'SELECT state FROM app.journey_acknowledgements WHERE event_id=$1',
        [id],
      ),
    ).toEqual([{ state: 'sending' }]);
  });
  it('keeps sending disabled and respects the explicit phone allowlist', async () => {
    const person = await student();
    const id = await message(person, 'vou', stamp());
    await apply.apply(actor, id, {});
    const transport = jest.fn(() => Promise.resolve(new Response('{}')));
    const config = {
      instance,
      baseUrl: 'http://127.0.0.1:8085',
      apiKey: 'synthetic',
      webhookSecret: 'synthetic',
      sendEnabled: false,
      testPhones: [person.phone],
    };
    await new AcknowledgementDispatcher(
      store,
      clock,
      config,
      transport,
    ).runOnce();
    await new AcknowledgementDispatcher(
      store,
      clock,
      { ...config, sendEnabled: true, testPhones: ['+5549999999999'] },
      transport,
    ).runOnce();
    expect(transport).not.toHaveBeenCalled();
    expect(
      await db.query(
        'SELECT state FROM app.journey_acknowledgements WHERE event_id=$1',
        [id],
      ),
    ).toEqual([{ state: 'prepared' }]);
  });
});
