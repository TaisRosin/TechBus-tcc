import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { WhatsAppStore } from '../../src/whatsapp/store';
import { InterpretationService } from '../../src/interpretation/service';
import { InterpretationApplication } from '../../src/interpretation/application';
import { ConversationProcessor } from '../../src/interpretation/processor';
import { ClarificationDispatcher } from '../../src/whatsapp/clarification-dispatcher';
import { RegistryService } from '../../src/registry/application/registry.service';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import { CorrectionService } from '../../src/journey/application/correction.service';
import type { WhatsAppEvent } from '../../src/whatsapp/domain';

describe('Durable clarification chain', () => {
  let db: DataSource, store: WhatsAppStore, registry: PostgresRegistryStore;
  const actor = randomUUID(),
    instance = randomUUID(),
    students: string[] = [];
  let instant = new Date('2026-11-05T12:00:00-03:00');
  const clock = { now: () => instant };
  let interpret: InterpretationService,
    apply: InterpretationApplication,
    worker: ConversationProcessor;
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    db = createTestDataSource(env);
    await db.initialize();
    await db.runMigrations();
    await db.query(
      "INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,'operator',true)",
      [actor],
    );
    store = new WhatsAppStore(readEnvironment(env).database);
    registry = new PostgresRegistryStore(readEnvironment(env).database);
    interpret = new InterpretationService(store, clock, {
      interpret: () => Promise.resolve({ proposal: null, code: 'UNUSED' }),
    });
    apply = new InterpretationApplication(store, clock);
    worker = new ConversationProcessor(
      store,
      clock,
      interpret,
      apply,
      instance,
    );
  });
  beforeEach(() => {
    instant = new Date('2026-11-05T12:00:00-03:00');
  });
  afterAll(async () => {
    await store?.close();
    await registry?.close();
    if (db?.isInitialized) {
      for (const table of [
        'conversation_jobs',
        'journey_acknowledgements',
        'message_interpretations',
        'conversation_clarifications',
      ])
        await db.query(
          `DELETE FROM app.${table} WHERE event_id IN (SELECT id FROM app.whatsapp_events WHERE instance=$1)`,
          [instance],
        );
      await db.query('DELETE FROM app.whatsapp_events WHERE instance=$1', [
        instance,
      ]);
      for (const table of [
        'team_corrections',
        'journey_receipts',
        'daily_journeys',
        'contracts',
      ])
        await db.query(
          `DELETE FROM app.${table} WHERE student_id=ANY($1::uuid[])`,
          [students],
        );
      await db.query('DELETE FROM app.students WHERE id=ANY($1::uuid[])', [
        students,
      ]);
      await db.query('DELETE FROM app.team_users WHERE id=$1', [actor]);
      await db.destroy();
    }
  });
  async function person() {
    const phone = '+55469' + randomInt(10000000, 99999999);
    const r = await new RegistryService(registry).createStudent(actor, {
      name: 'Context synthetic',
      phone,
      universityId: 'unimater',
      habitualDays: [],
      contract: { startDate: '2026-10-01', endDate: '2026-12-31' },
    });
    students.push(r.student.id);
    return { id: r.student.id, phone };
  }
  async function receive(s: { phone: string }, text: string, replyTo?: string) {
    instant = new Date(instant.getTime() + 2000);
    return (
      await store.receive(
        instance,
        {
          kind: 'message',
          externalId: randomUUID(),
          phone: s.phone,
          text,
          providerStatus: null,
          disposition: 'pending',
          originalOrder: {
            source: 'wa-stanza-v1',
            seconds: Math.floor(instant.getTime() / 1000) - 1,
          },
          ...(replyTo ? { replyTo } : {}),
        },
        clock,
      )
    ).id;
  }
  const questions = (id: string) =>
    db.query<{ state: string; provider_id: string }[]>(
      'SELECT state,provider_id FROM app.conversation_clarifications WHERE event_id=$1',
      [id],
    );
  async function sent(s: { phone: string }, id: string) {
    const transport = jest.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ key: { id: 'q-' + id } }))),
    );
    const dispatcher = new ClarificationDispatcher(
      store,
      clock,
      {
        instance,
        baseUrl: 'http://127.0.0.1:8085',
        apiKey: 'synthetic',
        webhookSecret: 'synthetic',
        sendEnabled: true,
        testPhones: [s.phone],
      },
      transport,
    );
    await Promise.all([dispatcher.runOnce(), dispatcher.runOnce()]);
    expect(transport).toHaveBeenCalledTimes(1);
    return dispatcher;
  }
  it('prepares once, reserves before dispatch, resolves only its origin atomically', async () => {
    const s = await person();
    const root = await receive(s, 'sim');
    await Promise.all([worker.runOnce(), worker.runOnce()]);
    expect(await questions(root)).toEqual([
      { state: 'prepared', provider_id: null },
    ]);
    await sent(s, root);
    const answer = await receive(s, 'não', 'q-' + root);
    await worker.runOnce();
    expect(await questions(root)).toEqual([
      { state: 'answered', provider_id: 'q-' + root },
    ]);
    expect(
      await db.query(
        'SELECT pickup_state,dropoff_state FROM app.daily_journeys WHERE student_id=$1',
        [s.id],
      ),
    ).toEqual([{ pickup_state: 'recusado', dropoff_state: 'recusado' }]);
    expect(await apply.applyReceived(answer)).toMatchObject({
      status: 'applied',
      version: 1,
    });
  });
  it('does not reuse a provider identifier from another instance', async () => {
    const s = await person(),
      root = await receive(s, 'sim');
    await worker.runOnce();
    await sent(s, root);
    instant = new Date(instant.getTime() + 2000);
    const child = await store.receive(
      instance + '-other',
      {
        kind: 'message',
        externalId: randomUUID(),
        phone: s.phone,
        text: 'não',
        providerStatus: null,
        disposition: 'pending',
        replyTo: 'q-' + root,
        originalOrder: {
          source: 'wa-stanza-v1',
          seconds: Math.floor(instant.getTime() / 1000) - 1,
        },
      },
      clock,
    );
    try {
      await interpret.interpretReceived(child.id);
      expect(await apply.applyReceived(child.id)).toMatchObject({
        code: 'AMBIGUOUS',
      });
      expect((await questions(root))[0].state).toBe('sent');
    } finally {
      await db.query(
        'DELETE FROM app.message_interpretations WHERE event_id=$1',
        [child.id],
      );
      await db.query('DELETE FROM app.whatsapp_events WHERE id=$1', [child.id]);
    }
  });
  it('preserves durable receipt time and blocks a changed quoted redelivery', async () => {
    const s = await person(),
      root = await receive(s, 'sim');
    await worker.runOnce();
    await sent(s, root);
    instant = new Date(instant.getTime() + 2000);
    const event: WhatsAppEvent = {
      kind: 'message',
      externalId: randomUUID(),
      phone: s.phone,
      text: 'não',
      providerStatus: null,
      disposition: 'pending',
      replyTo: 'q-' + root,
      originalOrder: {
        source: 'wa-stanza-v1',
        seconds: Math.floor(instant.getTime() / 1000) - 1,
      },
    };
    const child = await store.receive(instance, event, clock),
      original = clock.now();
    instant = new Date(instant.getTime() + 5000);
    expect((await store.receive(instance, event, clock)).id).toBe(child.id);
    await store.receive(
      instance,
      { ...event, replyTo: 'different-question' },
      clock,
    );
    expect(
      await db.query(
        'SELECT received_at,conflict FROM app.whatsapp_events WHERE id=$1',
        [child.id],
      ),
    ).toEqual([{ received_at: original, conflict: true }]);
    await interpret.interpretReceived(child.id);
    expect(await apply.applyReceived(child.id)).toMatchObject({
      code: 'EVENT_CONFLICT',
    });
    expect(
      await db.query('SELECT 1 FROM app.daily_journeys WHERE student_id=$1', [
        s.id,
      ]),
    ).toEqual([]);
  });
  it('binds a return-only question without changing the pickup leg', async () => {
    const s = await person(),
      root = await receive(s, 'sim');
    await interpret.interpretReceived(root);
    await db.query(
      "UPDATE app.message_interpretations SET proposal=jsonb_set(jsonb_set(proposal,'{trip}','\"answer\"'),'{dropoff}','\"unsure\"') WHERE event_id=$1",
      [root],
    );
    await worker.runOnce();
    await sent(s, root);
    await receive(s, 'não', 'q-' + root);
    await worker.runOnce();
    expect(
      await db.query(
        'SELECT pickup_state,dropoff_state FROM app.daily_journeys WHERE student_id=$1',
        [s.id],
      ),
    ).toEqual([{ pickup_state: 'sem_resposta', dropoff_state: 'recusado' }]);
  });
  it('escalates a second ambiguous response without preparing another question', async () => {
    const s = await person();
    const root = await receive(s, 'sim');
    await worker.runOnce();
    await sent(s, root);
    const child = await receive(s, 'talvez', 'q-' + root);
    await worker.runOnce();
    expect((await questions(root))[0].state).toBe('escalated');
    expect(await questions(child)).toEqual([]);
  });
  it('uses durable receipt time for a delayed interpretation', async () => {
    const s = await person(),
      root = await receive(s, 'sim');
    await worker.runOnce();
    await sent(s, root);
    const child = await receive(s, 'não', 'q-' + root);
    instant = new Date('2026-11-05T18:00:00-03:00');
    await worker.runOnce();
    expect((await questions(root))[0].state).toBe('answered');
    expect(await apply.applyReceived(child)).toMatchObject({
      status: 'applied',
    });
  });
  it('rolls back origin consumption and journey together', async () => {
    const s = await person(),
      root = await receive(s, 'sim');
    await worker.runOnce();
    await sent(s, root);
    const child = await receive(s, 'não', 'q-' + root);
    await interpret.interpretReceived(child);
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
      await expect(apply.applyReceived(child)).rejects.toThrow();
    } finally {
      failure.mockRestore();
    }
    expect((await questions(root))[0].state).toBe('sent');
    expect(
      await db.query('SELECT 1 FROM app.daily_journeys WHERE student_id=$1', [
        s.id,
      ]),
    ).toEqual([]);
    expect(
      await db.query('SELECT result FROM app.journey_receipts WHERE id=$1', [
        root,
      ]),
    ).toEqual([{ result: null }]);
    expect(await apply.applyReceived(child)).toMatchObject({
      status: 'applied',
    });
  });
  it('closes the question on explicit team review without sending a receipt', async () => {
    const s = await person(),
      root = await receive(s, 'sim');
    await worker.runOnce();
    await sent(s, root);
    const review = new CorrectionService(registry, clock);
    await expect(
      review.correct(actor, s.id, {
        operationId: randomUUID(),
        expectedVersion: 0,
        reason: 'Synthetic review',
        reviewedReceiptIds: [],
        changes: { pickup: 'recusado', dropoff: 'recusado' },
      }),
    ).rejects.toThrow('PENDING_REVIEW_REQUIRED');
    await review.correct(actor, s.id, {
      operationId: randomUUID(),
      expectedVersion: 0,
      reason: 'Synthetic review',
      reviewedReceiptIds: [root],
      changes: { pickup: 'recusado', dropoff: 'recusado' },
    });
    expect((await questions(root))[0].state).toBe('superseded');
    expect(
      await db.query(
        'SELECT 1 FROM app.journey_acknowledgements WHERE student_id=$1',
        [s.id],
      ),
    ).toEqual([]);
    await receive(s, 'sim', 'q-' + root);
    await worker.runOnce();
    expect(
      await db.query(
        'SELECT version,pickup_state FROM app.daily_journeys WHERE student_id=$1',
        [s.id],
      ),
    ).toEqual([{ version: 1, pickup_state: 'recusado' }]);
  });
  it('does not consume a question on rejection by the journey rules', async () => {
    const s = await person(),
      root = await receive(s, 'sim');
    await worker.runOnce();
    await sent(s, root);
    const child = await receive(s, 'sim', 'q-' + root);
    await worker.runOnce();
    // No university operation configured in this isolated database.
    expect((await questions(root))[0].state).toBe('escalated');
    expect(
      await db.query('SELECT result FROM app.journey_receipts WHERE id=$1', [
        root,
      ]),
    ).toEqual([{ result: null }]);
    expect(await apply.applyReceived(child)).toMatchObject({
      status: 'rejected',
    });
  });
  it('does not clear another unresolved predecessor', async () => {
    const s = await person(),
      root = await receive(s, 'sim');
    await worker.runOnce();
    await sent(s, root);
    await receive(s, 'sim');
    const child = await receive(s, 'não', 'q-' + root);
    await worker.runOnce();
    expect(
      await db.query(
        'SELECT code FROM app.conversation_jobs WHERE event_id=$1',
        [child],
      ),
    ).toEqual([{ code: 'ORDER_PREDECESSOR_PENDING' }]);
    expect(await apply.applyReceived(child)).toMatchObject({
      code: 'CONTEXT_REVIEW_REQUIRED',
    });
    expect((await questions(root))[0].state).not.toBe('answered');
  });
  it.each(['timeout', 'http', 'oversized', 'interrupted'])(
    'never retries uncertain question dispatch: %s',
    async (mode) => {
      const s = await person(),
        root = await receive(s, 'sim');
      await worker.runOnce();
      const transport = jest.fn(() =>
        mode === 'timeout'
          ? Promise.reject(new Error('timeout'))
          : Promise.resolve(
              new Response(
                mode === 'oversized'
                  ? 'x'.repeat(9000)
                  : JSON.stringify({ key: { id: 'q-' + root } }),
                { status: mode === 'http' ? 500 : 200 },
              ),
            ),
      );
      const dispatcher = new ClarificationDispatcher(
        store,
        clock,
        {
          instance,
          baseUrl: 'http://127.0.0.1:8085',
          apiKey: 'synthetic',
          webhookSecret: 'synthetic',
          sendEnabled: true,
          testPhones: [s.phone],
        },
        transport,
      );
      if (mode === 'interrupted') {
        const tx = store.transaction.bind(store);
        const failure = jest
          .spyOn(store, 'transaction')
          .mockImplementationOnce(tx)
          .mockRejectedValueOnce(new Error('after-send'));
        try {
          await expect(dispatcher.runOnce()).rejects.toThrow();
        } finally {
          failure.mockRestore();
        }
      } else await dispatcher.runOnce();
      await dispatcher.runOnce();
      expect(transport).toHaveBeenCalledTimes(1);
      expect((await questions(root))[0].state).toBe(
        mode === 'interrupted' ? 'sending' : 'unknown',
      );
    },
  );
  it('supersedes an unsent question after a new message', async () => {
    const s = await person(),
      root = await receive(s, 'sim');
    await worker.runOnce();
    await receive(s, 'não vou');
    const transport = jest.fn(() => Promise.resolve(new Response('{}')));
    await new ClarificationDispatcher(
      store,
      clock,
      {
        instance,
        baseUrl: 'http://127.0.0.1:8085',
        apiKey: 'synthetic',
        webhookSecret: 'synthetic',
        sendEnabled: true,
        testPhones: [s.phone],
      },
      transport,
    ).runOnce();
    expect(transport).not.toHaveBeenCalled();
    expect((await questions(root))[0].state).toBe('superseded');
  });
  it.each(['other-student', 'unquoted', 'late', 'changed', 'old-day'])(
    'does not bind %s responses',
    async (mode) => {
      const s = await person();
      const root = await receive(s, 'sim');
      await worker.runOnce();
      await sent(s, root);
      if (mode === 'late') instant = new Date('2026-11-05T17:00:00-03:00');
      if (mode === 'old-day') instant = new Date('2026-11-06T12:00:00-03:00');
      if (mode === 'changed')
        await db.query(
          'UPDATE app.students SET version=version+1 WHERE id=$1',
          [s.id],
        );
      const respondent = mode === 'other-student' ? await person() : s;
      await receive(
        respondent,
        'não',
        mode === 'unquoted' ? undefined : 'q-' + root,
      );
      await worker.runOnce();
      expect(
        await db.query('SELECT 1 FROM app.daily_journeys WHERE student_id=$1', [
          respondent.id,
        ]),
      ).toEqual([]);
      expect((await questions(root))[0].state).not.toBe('answered');
    },
  );
});
