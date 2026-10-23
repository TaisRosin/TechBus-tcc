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

describe('Calendar HTTP authorization and contract', () => {
  const users: string[] = [randomUUID(), randomUUID(), randomUUID()];
  let source: DataSource;
  let app: INestApplication<Server>;
  let owns = false;
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    const rows = await source.query<{ count: string }[]>(
      "SELECT (SELECT count(*) FROM app.university_calendars WHERE university_id='unimater' AND (days IS NOT NULL OR version<>1))+(SELECT count(*) FROM app.calendar_exceptions WHERE university_id='unimater') AS count",
    );
    if (rows[0].count !== '0')
      throw new Error(
        'Existing calendar preserved; test requires unconfigured university',
      );
    owns = true;
    for (let i = 0; i < 3; i++)
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
      if (owns) {
        await source.query(
          "DELETE FROM app.calendar_exceptions WHERE university_id='unimater' AND date='2026-10-23'",
        );
        await source.query(
          "UPDATE app.university_calendars SET days=NULL,version=1 WHERE university_id='unimater'",
        );
        await source.query(
          'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
          [users],
        );
      }
      await source.destroy();
    }
  });
  it('protects all calendar commands and persists an operator correction', async () => {
    const base = '/api/v1/universities/unimater/calendar',
      server = app.getHttpServer(),
      auth = `Bearer ${users[1]}`;
    await request(server).get(base).expect(401);
    await request(server)
      .get(base)
      .set('Authorization', `Bearer ${users[2]}`)
      .expect(403);
    await request(server)
      .patch(base)
      .set('Authorization', `Bearer ${users[2]}`)
      .send({ days: [5], expectedVersion: 1 })
      .expect(403);
    await request(server)
      .patch(base)
      .set('Authorization', auth)
      .send({ days: [5], expectedVersion: 1 })
      .expect(200)
      .expect({ universityId: 'unimater', days: [5], version: 2 });
    await request(server)
      .put(`${base}/exceptions/2026-10-23`)
      .set('Authorization', `Bearer ${users[0]}`)
      .send({
        operates: false,
        reason: 'Recesso sintético',
        expectedVersion: 2,
      })
      .expect(200);
    await request(server)
      .get(`${base}/exceptions?from=2026-10-23&to=2026-10-23`)
      .set('Authorization', auth)
      .expect(200)
      .expect({
        calendarVersion: 3,
        exceptions: [
          {
            universityId: 'unimater',
            date: '2026-10-23',
            operates: false,
            reason: 'Recesso sintético',
          },
        ],
      });
    await request(server)
      .patch(base)
      .set('Authorization', auth)
      .send({ days: [], expectedVersion: 2 })
      .expect(409)
      .expect({ code: 'VERSION_CONFLICT' });
    await request(server)
      .put(`${base}/exceptions/2026-02-30`)
      .set('Authorization', auth)
      .send({ operates: true, reason: 'Inválida', expectedVersion: 3 })
      .expect(400);
    await request(server)
      .get(`${base}/exceptions?from=2026-01-01&to=2028-01-01`)
      .set('Authorization', auth)
      .expect(400);
    await request(server)
      .get('/api/v1/universities/other/calendar')
      .set('Authorization', auth)
      .expect(404);
    await source.query('UPDATE app.team_users SET active=false WHERE id=$1', [
      users[1],
    ]);
    await request(server)
      .patch(base)
      .set('Authorization', auth)
      .send({ days: [], expectedVersion: 3 })
      .expect(403);
  });
});
