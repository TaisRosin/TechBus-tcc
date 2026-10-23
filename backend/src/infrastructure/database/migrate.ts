import { loadLocalEnvironment } from '../../config/local-environment';
import { ConfigurationError } from '../../config/environment';
import { createMigrationDataSource } from './data-source';

async function main() {
  const [action, flag, mode, ...extra] = process.argv.slice(2);
  if (
    !['show', 'run', 'revert'].includes(action) ||
    flag !== '--env' ||
    !['dev', 'test'].includes(mode) ||
    extra.length
  ) {
    throw new ConfigurationError(
      'migration arguments: show|run|revert --env dev|test',
    );
  }
  const source = createMigrationDataSource(
    loadLocalEnvironment(mode as 'dev' | 'test'),
  );
  try {
    await source.initialize();
    if (action === 'show')
      console.log(`Pending migrations: ${await source.showMigrations()}`);
    if (action === 'run')
      console.log(
        `Applied migrations: ${(await source.runMigrations()).length}`,
      );
    if (action === 'revert') {
      await source.undoLastMigration();
      console.log('Migration revert completed');
    }
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}
void main().catch((error: unknown) => {
  console.error(
    error instanceof ConfigurationError ? error.message : 'MIGRATION_FAILED',
  );
  process.exitCode = 1;
});
