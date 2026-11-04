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

describe('WhatsApp authenticated webhook HTTP', () => {
  let app: INestApplication<Server>, source: DataSource;
  const users: string[] = [randomUUID(), randomUUID(), randomUUID()];
  const instance = randomUUID(),
    secret = 's'.repeat(32);
  const url = '/api/v1/integrations/whatsapp';
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
      imports: [
        AppModule.register({
          ...readEnvironment(raw),
          evolution: {
            baseUrl: 'http://127.0.0.1:8085',
            instance,
            apiKey: 'k'.repeat(32),
            webhookSecret: secret,
            sendEnabled: false,
            testPhones: [],
          },
        }),
      ],
    })
      .overrideProvider(IdentityVerifier)
      .useValue({
        verify: (token: string) =>
          Promise.resolve(users.includes(token) ? { subject: token } : null),
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) {
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
  it('authenticates webhook independently, validates payload and acknowledges only persisted projection', async () => {
    const body = {
      instance,
      event: 'messages.upsert',
      apikey: 'do-not-store',
      data: {
        key: {
          id: 'http',
          fromMe: false,
          remoteJid: '5549888888888@s.whatsapp.net',
        },
        message: { conversation: 'sim' },
      },
    };
    await request(app.getHttpServer())
      .post(`${url}/webhook`)
      .send(body)
      .expect(401);
    await request(app.getHttpServer())
      .post(`${url}/webhook`)
      .set('X-TechBus-Webhook-Secret', secret)
      .send({ ...body, instance: 'wrong' })
      .expect(401);
    await request(app.getHttpServer())
      .post(`${url}/webhook`)
      .set('X-TechBus-Webhook-Secret', secret)
      .send({ instance, event: 'messages.upsert' })
      .expect(400);
    const result = await request(app.getHttpServer())
      .post(`${url}/webhook`)
      .set('X-TechBus-Webhook-Secret', secret)
      .send(body)
      .expect(202);
    expect(result.body).toEqual({ accepted: true });
    expect(
      await source.query(
        'SELECT count(*)::int AS n FROM app.whatsapp_events WHERE instance=$1',
        [instance],
      ),
    ).toEqual([{ n: 1 }]);
  });
  it('limits current technical events to admin/operator, without historical query', async () => {
    await request(app.getHttpServer()).get(`${url}/events`).expect(401);
    await request(app.getHttpServer())
      .get(`${url}/events`)
      .auth(users[2], { type: 'bearer' })
      .expect(403);
    for (const user of users.slice(0, 2))
      await request(app.getHttpServer())
        .get(`${url}/events`)
        .auth(user, { type: 'bearer' })
        .expect(200);
    await request(app.getHttpServer())
      .get(`${url}/events?date=2020-01-01`)
      .auth(users[0], { type: 'bearer' })
      .expect(400);
  });
});
