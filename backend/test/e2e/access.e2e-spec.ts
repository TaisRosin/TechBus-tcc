import { Controller, Get, Patch, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { readEnvironment } from '../../src/config/environment';
import { syntheticEnvironment } from '../support/environment';
import {
  IdentityVerifier,
  TeamStore,
  TripAssignments,
} from '../../src/access/application/ports';
import { RequireAction } from '../../src/access/http/access-policy';
import { AccessError } from '../../src/access/domain/access';
import { MemoryTeamStore } from '../support/memory-team-store';

@Controller('b03-test')
class UndeclaredController {
  @Get('undeclared') undeclared() {
    return { secret: 'must not be accessible' };
  }
  @Get('trips/:id') @RequireAction('trips:read') trip() {
    return { phone: 'synthetic-phone' };
  }
  @Patch('trips/:id') @RequireAction('operations:manage') edit() {
    return { updated: true };
  }
  @Get('settings') @RequireAction('settings:manage') settings() {
    return { settings: true };
  }
}
describe('Access HTTP boundary', () => {
  let app: INestApplication<Server>;
  const id = '00000000-0000-4000-8000-000000000001';
  const operatorId = '00000000-0000-4000-8000-000000000002';
  const driverId = '00000000-0000-4000-8000-000000000003';
  let store: MemoryTeamStore;
  beforeAll(async () => {
    store = new MemoryTeamStore([]);
    const module = await Test.createTestingModule({
      imports: [AppModule.register(readEnvironment(syntheticEnvironment))],
      controllers: [UndeclaredController],
    })
      .overrideProvider(TeamStore)
      .useValue(store)
      .overrideProvider(TripAssignments)
      .useValue({
        isAssigned: (user: string, trip: string) =>
          Promise.resolve(user === driverId && trip === 'own'),
      })
      .overrideProvider(IdentityVerifier)
      .useValue({
        verify: (token: string) => {
          const subject =
            token === 'valid-admin'
              ? id
              : token === 'valid-operator'
                ? operatorId
                : token === 'valid-driver'
                  ? driverId
                  : undefined;
          if (!subject) throw new AccessError('UNAUTHENTICATED', 401);
          return Promise.resolve({ subject });
        },
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });
  beforeEach(() => {
    store.users = [
      { id, subject: id, role: 'admin', active: true, version: 1 },
      {
        id: operatorId,
        subject: operatorId,
        role: 'operator',
        active: true,
        version: 1,
      },
      {
        id: driverId,
        subject: driverId,
        role: 'driver',
        active: true,
        version: 1,
      },
    ];
  });
  afterAll(async () => {
    await app?.close();
  });
  it('returns the current local profile for a verified identity', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/session')
      .set('Authorization', 'Bearer valid-admin')
      .expect(200)
      .expect({ id, role: 'admin', active: true, version: 1 });
  });
  it.each([undefined, 'Bearer expired', 'Basic valid-admin', 'Bearer a b'])(
    'refuses absent, invalid or malformed identity %s',
    async (header) => {
      const req = request(app.getHttpServer()).get('/api/v1/session');
      if (header) req.set('Authorization', header);
      await req.expect(401).expect({ code: 'UNAUTHENTICATED' });
    },
  );
  it('denies routes with no declared policy even to an admin', async () => {
    await request(app.getHttpServer())
      .get('/b03-test/undeclared')
      .set('Authorization', 'Bearer valid-admin')
      .expect(403);
  });
  it('allows only an admin to change access and blocks the deactivated identity immediately', async () => {
    const route = `/api/v1/users/${operatorId}/access`;
    const command = { role: 'operator', active: false, expectedVersion: 1 };
    await request(app.getHttpServer())
      .patch(route)
      .set('Authorization', 'Bearer valid-operator')
      .send({ ...command, role: 'admin' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(route)
      .set('Authorization', 'Bearer valid-admin')
      .send(command)
      .expect(200)
      .expect({ id: operatorId, role: 'operator', active: false, version: 2 });
    await request(app.getHttpServer())
      .get('/api/v1/session')
      .set('Authorization', 'Bearer valid-operator')
      .expect(403);
    await request(app.getHttpServer())
      .patch(route)
      .set('Authorization', 'Bearer valid-admin')
      .send(command)
      .expect(409)
      .expect({ code: 'VERSION_CONFLICT' });
  });
  it('rejects forged profile headers, extra fields and last-admin removal', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${operatorId}/access`)
      .set('Authorization', 'Bearer valid-operator')
      .set('X-Role', 'admin')
      .send({ role: 'admin', active: true, expectedVersion: 1 })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${operatorId}/access`)
      .set('Authorization', 'Bearer valid-admin')
      .send({ role: 'driver', active: true, expectedVersion: 1, subject: id })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${id}/access`)
      .set('Authorization', 'Bearer valid-admin')
      .send({ role: 'operator', active: true, expectedVersion: 1 })
      .expect(409)
      .expect({ code: 'LAST_ADMIN' });
  });
  it('never pretends to send an invitation and denies operators before integration', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users/invitations')
      .set('Authorization', 'Bearer valid-operator')
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/users/invitations')
      .set('Authorization', 'Bearer valid-admin')
      .send({})
      .expect(503)
      .expect({ code: 'INVITATIONS_UNAVAILABLE' });
  });
  it('has no test-token bypass in the normal application', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.register(readEnvironment(syntheticEnvironment))],
    }).compile();
    const normal = module.createNestApplication<INestApplication<Server>>({
      logger: false,
    });
    try {
      await normal.init();
      await request(normal.getHttpServer())
        .get('/api/v1/session')
        .set('Authorization', 'Bearer valid-admin')
        .expect(503)
        .expect({ code: 'AUTH_UNAVAILABLE' });
      await request(normal.getHttpServer()).get('/health/live').expect(200);
    } finally {
      await normal.close();
    }
  });
  it('enforces assignment and read-only access on HTTP, ignoring claimed ownership', async () => {
    await request(app.getHttpServer())
      .get('/b03-test/trips/own')
      .set('Authorization', 'Bearer valid-driver')
      .expect(200)
      .expect({ phone: 'synthetic-phone' });
    for (const trip of ['other', 'missing'])
      await request(app.getHttpServer())
        .get(`/b03-test/trips/${trip}`)
        .query({ driverId })
        .set('Authorization', 'Bearer valid-driver')
        .expect(404)
        .expect({ code: 'NOT_FOUND' });
    await request(app.getHttpServer())
      .patch('/b03-test/trips/own')
      .set('Authorization', 'Bearer valid-driver')
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .get('/b03-test/settings')
      .set('Authorization', 'Bearer valid-operator')
      .expect(403);
    await request(app.getHttpServer())
      .get('/b03-test/settings')
      .set('Authorization', 'Bearer valid-admin')
      .expect(200);
  });
});
