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
import { OperationService } from '../../src/operation/application/operation.service';
import { RegistryStore } from '../../src/registry/application/ports';
describe('Operation HTTP', () => {
  let source: DataSource,
    app: INestApplication<Server>,
    ownsDate = false;
  const users: string[] = [randomUUID(), randomUUID(), randomUUID()],
    date = '2097-06-15';
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    if (
      (
        await source.query<unknown[]>(
          'SELECT 1 FROM app.operation_plans WHERE date=$1',
          [date],
        )
      ).length
    )
      throw new Error('Existing plan preserved');
    ownsDate = true;
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
      .overrideProvider(OperationService)
      .useFactory({
        factory: (store: RegistryStore) =>
          new OperationService(store, {
            now: () => new Date(`${date}T20:00:00Z`),
          }),
        inject: [RegistryStore],
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) {
      if (ownsDate) {
        await source.query(
          'DELETE FROM app.operation_occupancies WHERE plan_date=$1',
          [date],
        );
        await source.query(
          'DELETE FROM app.operation_manifests WHERE date=$1',
          [date],
        );
        await source.query('DELETE FROM app.operation_plans WHERE date=$1', [
          date,
        ]);
      }
      await source.query(
        'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
        [users],
      );
      await source.destroy();
    }
  });
  it('restricts all planning routes to active admin/operator and validates current-day contracts', async () => {
    const server = app.getHttpServer(),
      url = '/api/v1/operations/current',
      auth = `Bearer ${users[1]}`;
    await request(server).get(url).expect(401);
    await request(server)
      .get(url)
      .set('Authorization', `Bearer ${users[2]}`)
      .expect(403);
    await request(server)
      .post(`${url}/planning/confirm`)
      .set('Authorization', `Bearer ${users[2]}`)
      .send({})
      .expect(403);
    await request(server)
      .put(`${url}/planning`)
      .set('Authorization', `Bearer ${users[2]}`)
      .send({})
      .expect(403);
    await request(server)
      .post(`${url}/vehicle-options`)
      .set('Authorization', `Bearer ${users[2]}`)
      .send({})
      .expect(403);
    await request(server)
      .get(url)
      .set('Authorization', `Bearer ${users[0]}`)
      .expect(200);
    await request(server)
      .get(`${url}?date=2026-10-01`)
      .set('Authorization', auth)
      .expect(400);
    const snapshot = await request(server)
        .get(url)
        .set('Authorization', auth)
        .expect(200),
      token = (snapshot.body as { demandToken: string }).demandToken;
    await request(server)
      .post(`${url}/vehicle-options`)
      .set('Authorization', auth)
      .send({ universityId: 'unimater', start: 1050, end: 1400 })
      .expect(201)
      .expect((r) =>
        expect((r.body as { issue: string }).issue).toBe('NO_DEMAND'),
      );
    await request(server)
      .put(`${url}/planning`)
      .set('Authorization', auth)
      .send({
        expectedVersion: 0,
        demandToken: token,
        trips: [],
        confirmed: true,
      })
      .expect(400);
    await request(server)
      .put(`${url}/planning`)
      .set('Authorization', auth)
      .send({ expectedVersion: 0, demandToken: token, trips: [] })
      .expect(200);
    await request(server)
      .post(`${url}/planning/confirm`)
      .set('Authorization', auth)
      .send({ expectedVersion: 1, demandToken: token })
      .expect(201)
      .expect((r) =>
        expect((r.body as { status: string }).status).toBe('confirmed'),
      );
    await source.query('UPDATE app.team_users SET active=false WHERE id=$1', [
      users[1],
    ]);
    await request(server).get(url).set('Authorization', auth).expect(403);
  });
});
