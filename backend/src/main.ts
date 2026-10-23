import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { AppModule } from './app.module';
import { ConfigurationError, readEnvironment } from './config/environment';

export async function createApplication(
  raw: NodeJS.ProcessEnv = process.env,
): Promise<INestApplication<Server>> {
  const config = readEnvironment(raw);
  return NestFactory.create<INestApplication<Server>>(
    AppModule.register(config),
    { logger: false },
  );
}
export async function startApplication(
  raw: NodeJS.ProcessEnv = process.env,
): Promise<INestApplication<Server>> {
  const config = readEnvironment(raw);
  const app = await createApplication(raw);
  app.enableShutdownHooks();
  try {
    await app.listen(config.port, '127.0.0.1');
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}
if (require.main === module) {
  void startApplication().catch((error: unknown) => {
    console.error(
      error instanceof ConfigurationError ? error.message : 'BOOTSTRAP_FAILED',
    );
    process.exitCode = 1;
  });
}
