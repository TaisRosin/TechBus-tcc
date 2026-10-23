import type { INestApplication } from '@nestjs/common';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { spawnSync } from 'node:child_process';
import request from 'supertest';
import { createApplication, startApplication } from '../../src/main';
import { syntheticEnvironment } from '../support/environment';

async function reservePort(): Promise<Server> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}
async function closeServer(server: Server) {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
describe('Local bootstrap', () => {
  let app: INestApplication<Server> | undefined;
  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('reports a live process without a database connection or secrets', async () => {
    app = await createApplication(syntheticEnvironment);
    await app.init();
    await request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect({ status: 'ok' });
  });
  it.each([
    ['APP_ENV', undefined],
    ['DB_HOST', 'external.invalid'],
    ['DB_PORT', '55432'],
    ['DB_NAME', 'techbus_dev'],
    ['DB_USER', 'postgres'],
    ['DB_PASSWORD', ''],
    ['PORT', 'NaN'],
  ])('rejects invalid %s before opening connections', async (field, value) => {
    await expect(
      createApplication({ ...syntheticEnvironment, [field]: value }),
    ).rejects.toThrow(`CONFIG_INVALID: ${field}`);
  });
  it('prints only the invalid field at process startup', () => {
    const result = spawnSync(process.execPath, ['dist/main.js'], {
      windowsHide: true,
      encoding: 'utf8',
      timeout: 10000,
      env: {
        SystemRoot: process.env.SystemRoot,
        ...syntheticEnvironment,
        DB_HOST: 'external.invalid',
        DB_PASSWORD: 'never-print-this-secret',
      },
    });
    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe('CONFIG_INVALID: DB_HOST');
    expect(result.stdout).toBe('');
  });
  it('binds the real bootstrap only to loopback', async () => {
    const reserved = await reservePort();
    const port = (reserved.address() as AddressInfo).port;
    await closeServer(reserved);
    app = await startApplication({
      ...syntheticEnvironment,
      PORT: String(port),
    });
    expect((app.getHttpServer().address() as AddressInfo).address).toBe(
      '127.0.0.1',
    );
    await request(`http://127.0.0.1:${port}`).get('/health/live').expect(200);
  });
  it('refuses an occupied port without interrupting its owner', async () => {
    const reserved = await reservePort();
    try {
      const port = (reserved.address() as AddressInfo).port;
      await expect(
        startApplication({ ...syntheticEnvironment, PORT: String(port) }),
      ).rejects.toMatchObject({ code: 'EADDRINUSE' });
      expect(reserved.listening).toBe(true);
    } finally {
      await closeServer(reserved);
    }
  });
});
