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
import { LocationService } from '../../src/registry/application/location.service';
describe('Itinerary HTTP', () => {
  let source: DataSource, app: INestApplication<Server>, group: string;
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
    group = (
      await app
        .get(LocationService)
        .create(users[0], 'group', { name: 'B16 HTTP', direction: 'pickup' })
    ).id;
  });
  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) {
      await source.query(
        'DELETE FROM app.group_stop_orders WHERE group_id=$1',
        [group],
      );
      await source.query('DELETE FROM app.local_groups WHERE id=$1', [group]);
      await source.query(
        'DELETE FROM app.team_users WHERE id=ANY($1::uuid[])',
        [users],
      );
      await source.destroy();
    }
  });
  it('protects staff edits and previews, validates bodies and restricts drivers to assigned local trips', async () => {
    const server = app.getHttpServer(),
      order = `/api/v1/groups/${group}/stop-order`,
      preview = `/api/v1/operations/groups/${group}/itinerary`;
    await request(server).get(order).expect(401);
    await request(server)
      .get(order)
      .set('Authorization', `Bearer ${users[2]}`)
      .expect(403);
    await request(server)
      .put(order)
      .set('Authorization', `Bearer ${users[1]}`)
      .send({ expectedVersion: 0, stopIds: [] })
      .expect(200);
    await request(server)
      .get(order)
      .set('Authorization', `Bearer ${users[0]}`)
      .expect(200)
      .expect(({ body }: { body: { version: number } }) =>
        expect(body.version).toBe(1),
      );
    await request(server)
      .put(order)
      .set('Authorization', `Bearer ${users[0]}`)
      .send({ expectedVersion: 1, stopIds: [], extra: true })
      .expect(400);
    await request(server)
      .get(preview)
      .set('Authorization', `Bearer ${users[1]}`)
      .expect(200);
    await request(server)
      .get(preview + '?date=2020-01-01')
      .set('Authorization', `Bearer ${users[0]}`)
      .expect(404);
    await request(server)
      .post(preview + '/publish')
      .set('Authorization', `Bearer ${users[2]}`)
      .send({})
      .expect(403);
    await request(server)
      .post(preview + '/publish')
      .set('Authorization', `Bearer ${users[0]}`)
      .send({})
      .expect(400);
    await request(server)
      .get('/api/v1/driver/trips/2026-11-23:1:0:0/itinerary')
      .set('Authorization', `Bearer ${users[2]}`)
      .expect(403);
    await request(server)
      .get(
        '/api/v1/driver/trips/2026-11-23:1:0:0/itinerary?driverId=' + users[0],
      )
      .set('Authorization', `Bearer ${users[2]}`)
      .expect(400);
  });
});
