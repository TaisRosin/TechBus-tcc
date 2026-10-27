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
import { AccessError } from '../../src/access/domain/access';
import { createTestDataSource } from '../support/test-database';
describe('Messages HTTP authorization', () => {
  let source: DataSource, app: INestApplication<Server>;
  const users: string[] = [randomUUID(), randomUUID(), randomUUID()];
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    for (let i = 0; i < users.length; i++)
      await source.query(
        'INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,$2,true)',
        [users[i], ['admin', 'operator', 'driver'][i]],
      );
    const module = await Test.createTestingModule({
      imports: [AppModule.register(readEnvironment(env))],
    })
      .overrideProvider(IdentityVerifier)
      .useValue({
        verify: (token: string) => {
          if (!users.includes(token))
            throw new AccessError('UNAUTHENTICATED', 401);
          return Promise.resolve({ subject: token });
        },
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) {
      await source.query(
        'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
        [users],
      );
      await source.destroy();
    }
  });
  it('limits listing and retries to active administrative roles, without historical parameters', async () => {
    const server = app.getHttpServer(),
      url = '/api/v1/messages',
      retry = `${url}/${randomUUID()}/retry`;
    await request(server).get(url).expect(401);
    await request(server)
      .get(url)
      .set('Authorization', `Bearer ${users[2]}`)
      .expect(403);
    await request(server)
      .post(retry)
      .set('Authorization', `Bearer ${users[2]}`)
      .send({ expectedVersion: 1 })
      .expect(403);
    for (const user of users.slice(0, 2))
      await request(server)
        .get(url)
        .set('Authorization', `Bearer ${user}`)
        .expect(200);
    await request(server)
      .get(`${url}?date=2026-01-01`)
      .set('Authorization', `Bearer ${users[1]}`)
      .expect(400);
    await request(server)
      .post(retry)
      .set('Authorization', `Bearer ${users[1]}`)
      .send({ expectedVersion: 1, phone: '+5546999999999' })
      .expect(400);
    await request(server)
      .post(retry)
      .set('Authorization', `Bearer ${users[1]}`)
      .send({ expectedVersion: 1 })
      .expect(404);
    await source.query('UPDATE app.team_users SET active=false WHERE id=$1', [
      users[1],
    ]);
    await request(server)
      .get(url)
      .set('Authorization', `Bearer ${users[1]}`)
      .expect(403);
  });
});
