import { randomUUID, createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { createTestDataSource } from '../support/test-database';
import { PasswordHasher } from '../../src/access/infrastructure/password-hasher';

describe('Real authentication HTTP', () => {
  let app: INestApplication<Server>, source: DataSource;
  let id: string, email: string;
  const created: string[] = [];
  const password = 'senha de teste individual';
  it('does not cache authentication errors or accept client-provided roles', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password, role: 'admin' })
      .expect(400);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({ code: 'INVALID_INPUT' });
  });
  beforeAll(async () => {
    const raw = loadLocalEnvironment('test');
    source = createTestDataSource(raw);
    await source.initialize();
    await source.runMigrations();
    id = randomUUID();
    email = `${id}@example.test`;
    await source.query(
      "INSERT INTO app.team_users VALUES($1,$1,'admin',true,1)",
      [id],
    );
    await source.query(
      'INSERT INTO app.auth_credentials VALUES($1,$2,$3,false,NULL,1,now())',
      [id, email, await new PasswordHasher().hash(password)],
    );
    const module = await Test.createTestingModule({
      imports: [AppModule.register(readEnvironment(raw))],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    const ids = [id, ...created];
    const emails = await source.query<{ email: string }[]>(
      'SELECT email FROM app.auth_credentials WHERE user_id=ANY($1::uuid[])',
      [ids],
    );
    for (const value of [
      ...emails.map((x) => x.email),
      ...ids.map((x) => `change:${x}`),
      '::ffff:127.0.0.1',
      '127.0.0.1',
    ])
      await source.query(
        'DELETE FROM app.auth_attempt_windows WHERE key_hash=$1',
        [createHash('sha256').update(value).digest('hex')],
      );
    await source.query(
      'DELETE FROM app.auth_events WHERE target_id=ANY($1::uuid[])',
      [ids],
    );
    await source.query(
      'DELETE FROM app.auth_sessions WHERE user_id=ANY($1::uuid[])',
      [ids],
    );
    await source.query(
      'DELETE FROM app.auth_credentials WHERE user_id=ANY($1::uuid[])',
      [ids],
    );
    await source.query('DELETE FROM app.team_users WHERE id=ANY($1::uuid[])', [
      ids,
    ]);
    await source.destroy();
  });
  it('authenticates without a test verifier and completes administrative creation and password change', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const token = (login.body as { token: string }).token;
    expect(login.headers['cache-control']).toBe('no-store');
    await request(app.getHttpServer())
      .get('/api/v1/session')
      .auth(token, { type: 'bearer' })
      .expect(200)
      .expect({ id, role: 'admin', active: true, version: 1 });
    const creation = await request(app.getHttpServer())
      .post('/api/v1/users')
      .auth(token, { type: 'bearer' })
      .send({ email: `operator-${id}@example.test`, role: 'operator' })
      .expect(201);
    const user = creation.body as {
      id: string;
      email: string;
      temporaryPassword: string;
    };
    created.push(user.id);
    const temporary = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: user.temporaryPassword })
      .expect(200);
    const restricted = (temporary.body as { token: string }).token;
    await request(app.getHttpServer())
      .get('/api/v1/session')
      .auth(restricted, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/password')
      .auth(restricted, { type: 'bearer' })
      .send({ newPassword: password })
      .expect(204);
    const operator = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password })
      .expect(200);
    const operatorToken = (operator.body as { token: string }).token;
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .auth(operatorToken, { type: 'bearer' })
      .send({ email: 'forbidden@example.test', role: 'admin' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .auth(token, { type: 'bearer' })
      .expect(204);
    await request(app.getHttpServer())
      .get('/api/v1/session')
      .auth(token, { type: 'bearer' })
      .expect(401);
  });
});
