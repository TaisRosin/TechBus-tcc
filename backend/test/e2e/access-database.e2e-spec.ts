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

describe('HTTP authorization with PostgreSQL persistence', () => {
  const admin = randomUUID();
  const operator = randomUUID();
  let source: DataSource;
  let app: INestApplication<Server>;
  beforeAll(async () => {
    const environment = loadLocalEnvironment('test');
    source = createTestDataSource(environment);
    await source.initialize();
    await source.runMigrations();
    await source.query(
      "INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,'admin',true),($2,$2,'operator',true)",
      [admin, operator],
    );
    const module = await Test.createTestingModule({
      imports: [AppModule.register(readEnvironment(environment))],
    })
      .overrideProvider(IdentityVerifier)
      .useValue({
        verify: (token: string) => {
          if (token !== admin && token !== operator)
            throw new AccessError('UNAUTHENTICATED', 401);
          return Promise.resolve({ subject: token });
        },
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      if (source?.isInitialized) {
        try {
          await source.query(
            'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
            [[admin, operator]],
          );
        } finally {
          await source.destroy();
        }
      }
    }
  });
  it('uses the restricted real repository and blocks the same token after deactivation', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/session')
      .set('Authorization', `Bearer ${operator}`)
      .expect(200)
      .expect({ id: operator, role: 'operator', active: true, version: 1 });
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${operator}/access`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ role: 'operator', active: false, expectedVersion: 1 })
      .expect(200)
      .expect({ id: operator, role: 'operator', active: false, version: 2 });
    await request(app.getHttpServer())
      .get('/api/v1/session')
      .set('Authorization', `Bearer ${operator}`)
      .expect(403)
      .expect({ code: 'FORBIDDEN' });
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${operator}/access`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ role: 'admin', active: true, expectedVersion: 1 })
      .expect(409)
      .expect({ code: 'VERSION_CONFLICT' });
  });
});
