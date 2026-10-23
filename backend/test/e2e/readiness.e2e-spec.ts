import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { createApplication } from '../../src/main';
import { loadLocalEnvironment } from '../../src/config/local-environment';

describe('Readiness HTTP contract', () => {
  let app: INestApplication<Server>;
  afterEach(async () => {
    await app?.close();
  });
  it('reports availability without exposing connection data', async () => {
    app = await createApplication(loadLocalEnvironment('test'));
    await app.init();
    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);
    const body = response.body as { status: unknown; checkedAt: unknown };
    expect(Object.keys(body).sort()).toEqual(['checkedAt', 'status']);
    expect(body.status).toBe('ok');
    expect(body.checkedAt).toEqual(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    );
  });
  it('reports 503 when persistence fails while liveness stays 200', async () => {
    app = await createApplication({
      ...loadLocalEnvironment('test'),
      DB_PASSWORD: 'invalid-synthetic-password',
    });
    await app.init();
    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(503);
    const body = response.body as { status: unknown; checkedAt: unknown };
    expect(Object.keys(body).sort()).toEqual(['checkedAt', 'status']);
    expect(body.status).toBe('unavailable');
    expect(body.checkedAt).toEqual(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    );
    await request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect({ status: 'ok' });
  });
});
