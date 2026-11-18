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
import { AddressValidator } from '../../src/registry/application/location-ports';
import { AccessError } from '../../src/access/domain/access';
import { createTestDataSource } from '../support/test-database';
import type { CatalogRecord } from '../../src/registry/domain/locations';

describe('Locations HTTP and unavailable real validation', () => {
  const users: string[] = [randomUUID(), randomUUID(), randomUUID()],
    ids: string[] = [],
    students: string[] = [],
    provider = randomUUID();
  let source: DataSource,
    app: INestApplication<Server>,
    normal: INestApplication<Server>,
    validation: unknown = { status: 'indeterminate' };
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
    const build = async (simulated: boolean) => {
      let builder = Test.createTestingModule({
        imports: [AppModule.register(readEnvironment(env))],
      })
        .overrideProvider(IdentityVerifier)
        .useValue({
          verify: (token: string) => {
            if (!users.includes(token))
              throw new AccessError('UNAUTHENTICATED', 401);
            return Promise.resolve({ subject: token });
          },
        });
      if (simulated)
        builder = builder
          .overrideProvider(AddressValidator)
          .useValue({ validate: () => Promise.resolve(validation) });
      const module = await builder.compile(),
        instance = module.createNestApplication<INestApplication<Server>>({
          logger: false,
        });
      await instance.init();
      return instance;
    };
    normal = await build(false);
    app = await build(true);
  });
  afterAll(async () => {
    await app?.close();
    await normal?.close();
    if (source?.isInitialized) {
      await source.query(
        'DELETE FROM app.student_place_defaults WHERE student_id=ANY($1::uuid[])',
        [students],
      );
      await source.query(
        'DELETE FROM app.return_locations WHERE provider=$1 OR id=ANY($2::uuid[])',
        [provider, ids],
      );
      await source.query(
        'DELETE FROM app.boarding_points WHERE id=ANY($1::uuid[])',
        [ids],
      );
      await source.query(
        'DELETE FROM app.service_regions WHERE id=ANY($1::uuid[])',
        [ids],
      );
      await source.query(
        'DELETE FROM app.local_groups WHERE id=ANY($1::uuid[])',
        [ids],
      );
      await source.query(
        'DELETE FROM app.contracts WHERE student_id=ANY($1::uuid[])',
        [students],
      );
      await source.query('DELETE FROM app.students WHERE id=ANY($1::uuid[])', [
        students,
      ]);
      await source.query(
        'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
        [users],
      );
      await source.destroy();
    }
  });
  it('protects Maps endpoints and reports missing configuration without credentials', async () => {
    await request(normal.getHttpServer())
      .post('/api/v1/maps/geocode')
      .send({ address: 'Praça' })
      .expect(401);
    await request(normal.getHttpServer())
      .post('/api/v1/maps/geocode')
      .set('Authorization', `Bearer ${users[2]}`)
      .send({ address: 'Praça' })
      .expect(403);
    const response = await request(normal.getHttpServer())
      .post('/api/v1/maps/geocode')
      .set('Authorization', `Bearer ${users[0]}`)
      .send({ address: 'Praça' })
      .expect(503);
    expect(JSON.stringify(response.body)).toContain('MAPS_UNCONFIGURED');
    await request(normal.getHttpServer())
      .get('/api/v1/maps/groups/direct?mode=direct')
      .set('Authorization', `Bearer ${users[0]}`)
      .expect(200);
  });
  it('rejects unauthenticated/driver access and cannot fake a real address validation', async () => {
    const server = normal.getHttpServer();
    await request(server).get('/api/v1/groups').expect(401);
    await request(server)
      .post('/api/v1/groups')
      .set('Authorization', `Bearer ${users[2]}`)
      .send({ name: 'A', direction: 'pickup' })
      .expect(403);
    await request(server)
      .post('/api/v1/return-locations/resolve')
      .set('Authorization', `Bearer ${users[0]}`)
      .send({ address: 'Endereço sem integração real' })
      .expect(422)
      .expect({ code: 'FIXED_DROPOFF_REQUIRED' });
    await request(server)
      .post('/api/v1/return-locations/resolve')
      .set('Authorization', `Bearer ${users[0]}`)
      .send({ address: 'A', inside: true })
      .expect(400);
  });
  it('manages manual places and defaults with protected HTTP contracts', async () => {
    const server = app.getHttpServer(),
      auth = `Bearer ${users[1]}`;
    const create = async (route: string, body: object) => {
      const response = await request(server)
        .post(`/api/v1/${route}`)
        .set('Authorization', auth)
        .send(body)
        .expect(201);
      const result = response.body as CatalogRecord;
      ids.push(result.id);
      return result;
    };
    const pickup = await create('groups', {
        name: 'Coleta HTTP',
        direction: 'pickup',
      }),
      dropoff = await create('groups', {
        name: 'Volta HTTP',
        direction: 'dropoff',
      });
    const point = await create('boarding-points', {
        name: 'Ponto HTTP',
        address: 'Local sintético',
        groupId: pickup.id,
      }),
      region = await create('dropoff-points', {
        address: 'Rua sintética',
        name: 'Região HTTP',
        groupId: dropoff.id,
      });
    await request(server)
      .get('/api/v1/groups?limit=1')
      .set('Authorization', auth)
      .expect(200)
      .expect((r) =>
        expect((r.body as unknown[]).length).toBeLessThanOrEqual(1),
      );
    await request(server)
      .get('/api/v1/groups?limit=101')
      .set('Authorization', auth)
      .expect(400);
    const response = await request(server)
      .post('/api/v1/students')
      .set('Authorization', auth)
      .send({
        name: 'Aluna HTTP B06',
        phone: `+55469${randomInt(10000000, 99999999)}`,
        universityId: 'unimater',
        habitualDays: [],
        contract: { startDate: '2026-10-01', endDate: '2026-12-31' },
      })
      .expect(201);
    const id = (response.body as { student: { id: string } }).student.id;
    students.push(id);
    const url = `/api/v1/students/${id}/location-defaults`;
    await request(server)
      .put(`${url}/pickup`)
      .set('Authorization', auth)
      .send({
        pointId: point.id,
        source: 'initial',
        evidence: 'Cadastro HTTP',
        expectedVersion: 0,
      })
      .expect(200);
    validation = {
      status: 'inside',
      provider,
      key: 'http-one',
      label: 'Casa sintética',
      regionId: region.id,
      evidence: 'Área de teste',
    };
    await request(server)
      .put(`${url}/dropoff`)
      .set('Authorization', auth)
      .send({
        locationId: region.id,
        source: 'initial',
        evidence: 'Cadastro HTTP',
        expectedVersion: 0,
      })
      .expect(200);
    await request(server)
      .get(url)
      .set('Authorization', auth)
      .expect(200)
      .expect((r) =>
        expect(r.body as unknown).toMatchObject({ needsAdjustment: false }),
      );
    await request(server)
      .patch(`/api/v1/groups/${pickup.id}`)
      .set('Authorization', auth)
      .send({ name: pickup.name, active: false, expectedVersion: 1 })
      .expect(200);
    await request(server)
      .get(url)
      .set('Authorization', auth)
      .expect(200)
      .expect((r) =>
        expect(r.body as unknown).toMatchObject({
          pickup: { usable: false, issue: 'LOCATION_INACTIVE' },
          needsAdjustment: true,
        }),
      );
    await request(server)
      .put(`${url}/pickup`)
      .set('Authorization', auth)
      .send({
        pointId: point.id,
        source: 'request',
        evidence: 'Pedido',
        expectedVersion: 1,
      })
      .expect(409);
  });
});
