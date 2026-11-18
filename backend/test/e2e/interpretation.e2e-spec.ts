import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { readEnvironment } from '../../src/config/environment';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { IdentityVerifier } from '../../src/access/application/ports';
import { createTestDataSource } from '../support/test-database';
import { WhatsAppStore } from '../../src/whatsapp/store';
describe('Interpretation HTTP authorization', () => {
  let app: INestApplication<Server>, source: DataSource, id: string;
  const users: string[] = [randomUUID(), randomUUID(), randomUUID()],
    instance = randomUUID();
  const base = '/api/v1/integrations/whatsapp/events';
  beforeAll(async () => {
    const raw = loadLocalEnvironment('test');
    source = createTestDataSource(raw);
    await source.initialize();
    await source.runMigrations();
    for (let i = 0; i < users.length; i++)
      await source.query(
        'INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,$2,true)',
        [users[i], ['admin', 'operator', 'driver'][i]],
      );
    const module = await Test.createTestingModule({
      imports: [AppModule.register(readEnvironment(raw))],
    })
      .overrideProvider(IdentityVerifier)
      .useValue({
        verify: (token: string) =>
          Promise.resolve(users.includes(token) ? { subject: token } : null),
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
    id = (
      await app.get(WhatsAppStore).receive(
        instance,
        {
          kind: 'message',
          externalId: 'http',
          phone: '+5549888888888',
          text: 'vou',
          providerStatus: null,
          disposition: 'pending',
        },
        { now: () => new Date() },
      )
    ).id;
  });
  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) {
      await source.query(
        'DELETE FROM app.message_interpretations WHERE event_id=$1',
        [id],
      );
      await source.query('DELETE FROM app.whatsapp_events WHERE instance=$1', [
        instance,
      ]);
      await source.query(
        'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
        [users],
      );
      await source.destroy();
    }
  });
  it('requires active admin/operator and forbids fabricated text', async () => {
    const url = `${base}/${id}/interpret`,
      server = app.getHttpServer();
    await request(server).post(url).send({}).expect(401);
    await request(server)
      .post(url)
      .auth(users[2], { type: 'bearer' })
      .send({})
      .expect(403);
    await request(server)
      .post(url)
      .auth(users[0], { type: 'bearer' })
      .send({ text: 'vou' })
      .expect(400);
    for (const user of users.slice(0, 2)) {
      const r = await request(server)
        .post(url)
        .auth(user, { type: 'bearer' })
        .send({})
        .expect(200);
      expect(r.body).toMatchObject({
        eventId: id,
        code: 'UNKNOWN_CONTACT',
        proposal: null,
      });
    }
    const list = await request(server)
      .get(base)
      .auth(users[0], { type: 'bearer' })
      .expect(200);
    const rows = list.body as {
      id: string;
      interpretation: { code: string };
    }[];
    expect(rows.find((row) => row.id === id)?.interpretation).toMatchObject({
      code: 'UNKNOWN_CONTACT',
    });
  });
  it('protects current conversation diagnostics and rejects injected context', async () => {
    const server = app.getHttpServer();
    await request(server).get(base).expect(401);
    await request(server)
      .get(base)
      .auth(users[2], { type: 'bearer' })
      .expect(403);
    for (const user of users.slice(0, 2)) {
      const result = await request(server)
        .get(base)
        .auth(user, { type: 'bearer' })
        .expect(200);
      expect(
        (result.body as { id: string; clarification: unknown }[]).find(
          (row) => row.id === id,
        ),
      ).toMatchObject({ clarification: null });
    }
    await request(server)
      .post(`${base}/${id}/interpret`)
      .auth(users[0], { type: 'bearer' })
      .send({ contextEventId: randomUUID(), replyTo: 'forged' })
      .expect(400);
  });
  it('does not expose previous-day events through interpretation', async () => {
    await source.query(
      "UPDATE app.whatsapp_events SET received_at=now()-interval '2 days' WHERE id=$1",
      [id],
    );
    await request(app.getHttpServer())
      .post(`${base}/${id}/interpret`)
      .auth(users[0], { type: 'bearer' })
      .send({})
      .expect(404);
  });
  it('protects application from anonymous, driver and forged ordering requests', async () => {
    const url = `${base}/${id}/apply`,
      server = app.getHttpServer();
    await request(server).post(url).send({}).expect(401);
    await request(server)
      .post(url)
      .auth(users[2], { type: 'bearer' })
      .send({})
      .expect(403);
    await request(server)
      .post(url)
      .auth(users[0], { type: 'bearer' })
      .send({ ordering: 'received' })
      .expect(400);
    await request(server)
      .post(url)
      .auth(users[0], { type: 'bearer' })
      .send({})
      .expect(404);
  });
});
