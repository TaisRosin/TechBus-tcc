import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { ConfigurationError, readEnvironment } from '../../config/environment';
import { loadLocalEnvironment } from '../../config/local-environment';
import { createMigrationDataSource } from '../../infrastructure/database/data-source';
import { PostgresAuthStore } from '../infrastructure/postgres-auth-store';
import { PasswordHasher } from '../infrastructure/password-hasher';
import { AuthService } from '../application/auth.service';
import { AccessError } from '../domain/access';

export function parseAuthCli(args: string[]): 'dev' | 'test' {
  if (
    args.length !== 2 ||
    args[0] !== '--env' ||
    !['dev', 'test'].includes(args[1])
  )
    throw new ConfigurationError('auth arguments: --env dev|test');
  return args[1] as 'dev' | 'test';
}
export async function runAuthCli(
  action: 'bootstrap' | 'recover-admin',
): Promise<void> {
  const mode = parseAuthCli(process.argv.slice(2));
  if (!stdin.isTTY || !stdout.isTTY)
    throw new ConfigurationError('interactive terminal required');
  const raw = loadLocalEnvironment(mode);
  // Technical procedures require the local maintenance credential, not just app credentials.
  const maintenance = createMigrationDataSource(raw);
  try {
    await maintenance.initialize();
  } finally {
    if (maintenance.isInitialized) await maintenance.destroy();
  }
  const store = new PostgresAuthStore(readEnvironment(raw).database);
  const auth = new AuthService(store, new PasswordHasher());
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    console.log(
      `Procedimento local ${action}, ambiente ${mode}. Não grave/transmita este terminal.`,
    );
    const result =
      action === 'bootstrap'
        ? await auth.bootstrap({
            email: await prompt.question('E-mail do primeiro admin: '),
          })
        : await auth.recoverAdmin(
            (await prompt.question('ID do único admin ativo: ')).trim(),
            (
              await prompt.question(
                'E-mail somente se ainda não provisionado (senão Enter): ',
              )
            ).trim() || undefined,
          );
    console.log(
      `Conta: ${result.id}\nSenha temporária (entrega manual): ${result.temporaryPassword}\nValidade: ${result.temporaryExpiresAt}\nTroca obrigatória no primeiro acesso.`,
    );
  } finally {
    prompt.close();
    await store.close();
  }
}
export function reportAuthCliError(error: unknown): void {
  console.error(
    error instanceof AccessError
      ? error.code
      : error instanceof ConfigurationError
        ? error.message
        : 'AUTH_MAINTENANCE_FAILED',
  );
  process.exitCode = 1;
}
