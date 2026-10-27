import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID, randomInt } from 'node:crypto';
import type { Server } from 'node:http';
import type { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { readEnvironment } from '../../src/config/environment';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { IdentityVerifier } from '../../src/access/application/ports';
import { AccessError } from '../../src/access/domain/access';
import { createTestDataSource } from '../support/test-database';
import { CorrectionService } from '../../src/journey/application/correction.service';
import { RegistryStore } from '../../src/registry/application/ports';
import { RegistryService } from '../../src/registry/application/registry.service';
describe('Team correction HTTP', () => {
  let source: DataSource, app: INestApplication<Server>, studentId: string;
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
      .overrideProvider(CorrectionService)
      .useFactory({
        factory: (store: RegistryStore) =>
          new CorrectionService(store, {
            now: () => new Date('2026-12-25T23:00:00Z'),
          }),
        inject: [RegistryStore],
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
    studentId = (
      await app.get(RegistryService).createStudent(users[1], {
        name: 'B13 HTTP',
        phone: `+55469${randomInt(10000000, 99999999)}`,
        universityId: 'unimater',
        habitualDays: [],
        contract: { startDate: '2026-01-01', endDate: '2026-12-31' },
      })
    ).student.id;
  });
  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) {
      for (const t of [
        'team_corrections',
        'journey_receipts',
        'daily_journeys',
        'contracts',
      ])
        await source.query(`DELETE FROM app.${t} WHERE student_id=$1`, [
          studentId,
        ]);
      await source.query('DELETE FROM app.students WHERE id=$1', [studentId]);
      await source.query(
        'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
        [users],
      );
      await source.destroy();
    }
  });
  it('protects the administrative command and rejects injected context, stale edits and inactive actors', async () => {
    const server = app.getHttpServer(),
      url = `/api/v1/students/${studentId}/journey/correction`,
      auth = `Bearer ${users[1]}`;
    await request(server).get(url).expect(401);
    await request(server)
      .get(url)
      .set('Authorization', `Bearer ${users[2]}`)
      .expect(403);
    await request(server)
      .post(url)
      .set('Authorization', `Bearer ${users[2]}`)
      .send({})
      .expect(403);
    for (const user of users.slice(0, 2))
      await request(server)
        .get(url)
        .set('Authorization', `Bearer ${user}`)
        .expect(200);
    await request(server)
      .get(`${url}?date=2026-01-01`)
      .set('Authorization', auth)
      .expect(400);
    const body = {
      operationId: randomUUID(),
      expectedVersion: 0,
      reason: 'Contato conferido',
      reviewedReceiptIds: [],
      changes: { pickup: 'recusado' },
    };
    await request(server)
      .post(url)
      .set('Authorization', auth)
      .send({ ...body, actor: 'admin' })
      .expect(400);
    const first = await request(server)
      .post(url)
      .set('Authorization', auth)
      .send(body)
      .expect(201);
    await request(server)
      .post(url)
      .set('Authorization', auth)
      .send(body)
      .expect(201)
      .expect(first.body as object);
    await request(server)
      .post(url)
      .set('Authorization', auth)
      .send({ ...body, operationId: randomUUID() })
      .expect(409);
    await source.query('UPDATE app.team_users SET active=false WHERE id=$1', [
      users[1],
    ]);
    await request(server)
      .post(url)
      .set('Authorization', auth)
      .send(body)
      .expect(403);
  });
});
