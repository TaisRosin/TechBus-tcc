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
import type { Vehicle, Driver } from '../../src/fleet/application/ports';
describe('Fleet HTTP authorization and contracts', () => {
  let source: DataSource, app: INestApplication<Server>;
  const users: string[] = [randomUUID(), randomUUID(), randomUUID()],
    ids: string[] = [],
    drivers: string[] = [];
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
        'DELETE FROM app.fleet_exceptions WHERE vehicle_id=ANY($1::uuid[])',
        [ids],
      );
      await source.query(
        'DELETE FROM app.fleet_vehicles WHERE id=ANY($1::uuid[])',
        [ids],
      );
      await source.query(
        'DELETE FROM app.fleet_drivers WHERE id=ANY($1::uuid[])',
        [drivers],
      );
      await source.query(
        'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
        [users],
      );
      await source.destroy();
    }
  });
  it('protects the catalog and allows operator to manage availability without creating accounts', async () => {
    const server = app.getHttpServer(),
      auth = `Bearer ${users[1]}`;
    await request(server).get('/api/v1/vehicles').expect(401);
    await request(server)
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${users[2]}`)
      .expect(403);
    for (const user of users.slice(0, 2))
      await request(server)
        .get('/api/v1/vehicles')
        .set('Authorization', `Bearer ${user}`)
        .expect(200);
    const created = await request(server)
      .post('/api/v1/vehicles')
      .set('Authorization', auth)
      .send({
        identifier: randomUUID(),
        plate: randomUUID().replaceAll('-', '').slice(0, 10),
        kind: 'micro',
        seats: 30,
      })
      .expect(201);
    const v = created.body as Vehicle;
    ids.push(v.id);
    await request(server)
      .get(`/api/v1/vehicles/${v.id}/availability`)
      .set('Authorization', auth)
      .expect(200)
      .expect({ vehicleId: v.id, version: 1, week: null });
    await request(server)
      .put(`/api/v1/vehicles/${v.id}/availability`)
      .set('Authorization', auth)
      .send({ week: [[], [], [], [], [], [], []], expectedVersion: 1 })
      .expect(200);
    await request(server)
      .put(`/api/v1/vehicles/${v.id}/availability/exceptions/2026-10-25`)
      .set('Authorization', auth)
      .send({ windows: [], expectedVersion: 2 })
      .expect(200);
    await request(server)
      .get(
        `/api/v1/vehicles/${v.id}/availability/exceptions?from=2026-10-25&to=2026-10-25`,
      )
      .set('Authorization', auth)
      .expect(200)
      .expect([{ date: '2026-10-25', windows: [] }]);
    const dres = await request(server)
      .post('/api/v1/drivers')
      .set('Authorization', auth)
      .send({ name: 'Pessoa sintética', phone: '+5546999998888' })
      .expect(201);
    const d = dres.body as Driver;
    drivers.push(d.id);
    await request(server)
      .post('/api/v1/drivers')
      .set('Authorization', auth)
      .send({
        name: 'Pessoa sintética',
        phone: '+5546999998888',
        role: 'admin',
      })
      .expect(400);
    await request(server)
      .patch(`/api/v1/drivers/${d.id}`)
      .set('Authorization', auth)
      .send({ name: d.name, phone: d.phone, active: false, expectedVersion: 1 })
      .expect(200);
    await request(server)
      .post('/api/v1/fleet/evaluate')
      .set('Authorization', auth)
      .send({
        date: '2026-10-25',
        trips: [
          {
            kind: 'intermunicipal',
            vehicleId: v.id,
            universityId: 'unimater',
            outbound: { driverId: d.id, start: 1000, end: 1100 },
            return: { driverId: d.id, start: 1400, end: 1500 },
          },
        ],
      })
      .expect(201)
      .expect((res) => {
        expect((res.body as { eligible: boolean }).eligible).toBe(false);
      });
    await source.query('UPDATE app.team_users SET active=false WHERE id=$1', [
      users[1],
    ]);
    await request(server)
      .get('/api/v1/drivers')
      .set('Authorization', auth)
      .expect(403);
  });
});
