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
describe('Operational consultation HTTP', () => {
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
        'DELETE FROM app.driver_access_links WHERE user_id=ANY($1::uuid[])',
        [users],
      );
      await source.query(
        'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
        [users],
      );
      await source.destroy();
    }
  });
  it('protects overview, identity links and driver queries without impersonation or history', async () => {
    const server = app.getHttpServer(),
      overview = '/api/v1/operations/overview',
      links = `/api/v1/access/driver-links/${users[2]}`,
      trips = '/api/v1/driver/trips';
    await request(server).get(overview).expect(401);
    await request(server)
      .get(overview)
      .set('Authorization', `Bearer ${users[2]}`)
      .expect(403);
    await request(server)
      .get(overview)
      .set('Authorization', `Bearer ${users[1]}`)
      .expect(200);
    await request(server)
      .get(overview + '?date=2020-01-01')
      .set('Authorization', `Bearer ${users[0]}`)
      .expect(404);
    await request(server)
      .get(links)
      .set('Authorization', `Bearer ${users[1]}`)
      .expect(403);
    await request(server)
      .put(links)
      .set('Authorization', `Bearer ${users[1]}`)
      .send({ driverId: null, expectedVersion: 0 })
      .expect(403);
    await request(server)
      .put(links)
      .set('Authorization', `Bearer ${users[0]}`)
      .send({ driverId: null, expectedVersion: 0 })
      .expect(200);
    await request(server)
      .get(trips)
      .set('Authorization', `Bearer ${users[2]}`)
      .expect(403);
    await request(server)
      .get(trips + '?driverId=' + users[0])
      .set('Authorization', `Bearer ${users[2]}`)
      .expect(400);
    await request(server)
      .get(trips)
      .set('Authorization', `Bearer ${users[1]}`)
      .expect(403);
    await request(server)
      .post(trips)
      .set('Authorization', `Bearer ${users[2]}`)
      .send({})
      .expect(404);
  });
});
