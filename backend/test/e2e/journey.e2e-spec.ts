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
import { RegistryService } from '../../src/registry/application/registry.service';
import { createTestDataSource } from '../support/test-database';

describe('Current journey HTTP access', () => {
  const users: string[] = [randomUUID(), randomUUID(), randomUUID()];
  let source: DataSource, app: INestApplication<Server>, studentId: string;
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
    const created = await app.get(RegistryService).createStudent(users[0], {
      name: 'Aluna HTTP sintética',
      phone: `+55469${randomInt(10000000, 99999999)}`,
      universityId: 'unimater',
      habitualDays: [],
      contract: { startDate: '2026-10-01', endDate: '2026-12-31' },
    });
    studentId = created.student.id;
  });
  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) {
      await source.query('DELETE FROM app.contracts WHERE student_id=$1', [
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
  it('allows only active admin/operator to read the current day, with no public command endpoint', async () => {
    const server = app.getHttpServer(),
      url = `/api/v1/students/${studentId}/journey`;
    await request(server).get(url).expect(401);
    await request(server)
      .get(url)
      .set('Authorization', `Bearer ${users[2]}`)
      .expect(403);
    for (const actor of users.slice(0, 2))
      await request(server)
        .get(url)
        .set('Authorization', `Bearer ${actor}`)
        .expect(200)
        .expect({
          journey: null,
          counts: { pickup: 0, dropoff: 0 },
          issues: [],
          needsAdjustment: false,
          pending: [],
        });
    await request(server)
      .post(url)
      .set('Authorization', `Bearer ${users[0]}`)
      .send({ kind: 'going' })
      .expect(404);
    await request(server)
      .get(url + '?date=2026-10-22')
      .set('Authorization', `Bearer ${users[0]}`)
      .expect(400);
    await source.query('UPDATE app.team_users SET active=false WHERE id=$1', [
      users[1],
    ]);
    await request(server)
      .get(url)
      .set('Authorization', `Bearer ${users[1]}`)
      .expect(403);
  });
});
