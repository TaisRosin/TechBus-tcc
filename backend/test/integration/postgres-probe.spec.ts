import { createServer, type Socket, type AddressInfo } from 'node:net';
import { PostgresProbe } from '../../src/infrastructure/database/postgres-probe';
import { readEnvironment } from '../../src/config/environment';
import { loadLocalEnvironment } from '../../src/config/local-environment';

describe('PostgreSQL probe boundary', () => {
  const config = () => readEnvironment(loadLocalEnvironment('test')).database;
  it('queries the test cluster and closes its resources', async () => {
    const probe = new PostgresProbe(config());
    try {
      expect(await probe.check()).toBe(true);
    } finally {
      await probe.close();
    }
    expect(await probe.check()).toBe(false);
  });
  it('reports invalid credentials as unavailable without leaking them', async () => {
    const probe = new PostgresProbe({
      ...config(),
      password: 'invalid-synthetic-password',
    });
    try {
      expect(await probe.check()).toBe(false);
    } finally {
      await probe.close();
    }
  });
  it('times out a nonresponding local peer and releases the socket', async () => {
    const sockets = new Set<Socket>();
    const server = createServer((socket) => {
      sockets.add(socket);
      socket.resume(); // Drain incoming bytes so the test peer observes the client FIN.
      socket.on('close', () => sockets.delete(socket));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const probe = new PostgresProbe({
      ...config(),
      port: (server.address() as AddressInfo).port,
    });
    try {
      const started = Date.now();
      expect(await probe.check()).toBe(false);
      expect(Date.now() - started).toBeLessThan(4000);
      await probe.close();
      // Closing the server must finish without forcibly dropping any client.
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Probe leaked its socket')),
          2000,
        );
        server.close(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } finally {
      await probe.close();
      for (const socket of sockets) socket.destroy();
      if (server.listening)
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
