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
import type { Student, Contract } from '../../src/registry/domain/registry';

describe('Registry HTTP with real isolated persistence', () => {
  const users: string[] = [randomUUID(), randomUUID(), randomUUID()];
  const phone = `+55469${randomInt(10000000, 99999999)}`;
  let source: DataSource;
  let app: INestApplication<Server>;
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
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
      await source.query(
        'DELETE FROM app.contracts WHERE student_id IN (SELECT id FROM app.students WHERE phone=$1)',
        [phone],
      );
      await source.query('DELETE FROM app.students WHERE phone=$1', [phone]);
      await source.query(
        'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
        [users],
      );
      await source.destroy();
    }
  });
  it('denies unauthenticated users and drivers', async () => {
    await request(app.getHttpServer()).get('/api/v1/students').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${users[2]}`)
      .expect(403);
  });
  it('allows operator creation and admin revision, with bounded lists and safe errors', async () => {
    const server = app.getHttpServer();
    const auth = `Bearer ${users[1]}`;
    await request(server)
      .get('/api/v1/universities')
      .set('Authorization', auth)
      .expect(200)
      .expect([
        { id: 'unidep', name: 'Unidep' },
        { id: 'unimater', name: 'Unimater' },
      ]);
    const fields = {
      name: 'Aluna HTTP sintética',
      phone,
      universityId: 'unidep',
      habitualDays: [],
    };
    const body = {
      ...fields,
      contract: { startDate: '2026-10-01', endDate: '2026-10-31' },
    };
    await request(server)
      .post('/api/v1/students')
      .set('Authorization', auth)
      .send({ ...body, price: 20 })
      .expect(400)
      .expect({ code: 'INVALID_INPUT' });
    const response = await request(server)
      .post('/api/v1/students')
      .set('Authorization', auth)
      .send(body)
      .expect(201);
    const created = response.body as { student: Student; contract: Contract };
    await request(server)
      .get(`/api/v1/students/${created.student.id}`)
      .set('Authorization', auth)
      .expect(200)
      .expect(created.student);
    await request(server)
      .get('/api/v1/students?limit=1&offset=0')
      .set('Authorization', auth)
      .expect(200)
      .expect((r) => {
        expect((r.body as Student[]).length).toBeLessThanOrEqual(1);
      });
    await request(server)
      .get('/api/v1/students?limit=101')
      .set('Authorization', auth)
      .expect(400);
    await request(server)
      .get('/api/v1/students/not-uuid')
      .set('Authorization', auth)
      .expect(400);
    await request(server)
      .get(`/api/v1/students/${randomUUID()}`)
      .set('Authorization', auth)
      .expect(404);
    await request(server)
      .post('/api/v1/students')
      .set('Authorization', auth)
      .send(body)
      .expect(409)
      .expect({ code: 'PHONE_IN_USE' });
    await request(server)
      .patch(`/api/v1/students/${created.student.id}`)
      .set('Authorization', `Bearer ${users[0]}`)
      .send({ ...fields, active: false, expectedVersion: 1 })
      .expect(200)
      .expect({ ...created.student, active: false, version: 2 });
    await request(server)
      .get(`/api/v1/students/${created.student.id}/contracts`)
      .set('Authorization', auth)
      .expect(200)
      .expect([created.contract]);
    const renewal = await request(server)
      .post(`/api/v1/students/${created.student.id}/contracts`)
      .set('Authorization', auth)
      .send({ startDate: '2026-11-01', endDate: '2026-11-30' })
      .expect(201);
    const next = renewal.body as Contract;
    await request(server)
      .patch(`/api/v1/contracts/${next.id}`)
      .set('Authorization', auth)
      .send({
        startDate: '2026-11-02',
        endDate: '2026-11-30',
        expectedVersion: 1,
      })
      .expect(200);
    await request(server)
      .patch(`/api/v1/contracts/${next.id}`)
      .set('Authorization', auth)
      .send({
        startDate: '2026-11-02',
        endDate: '2026-11-30',
        expectedVersion: 1,
      })
      .expect(409)
      .expect({ code: 'VERSION_CONFLICT' });
  });
});
