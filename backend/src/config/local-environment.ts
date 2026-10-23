import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { ConfigurationError } from './environment';

export function loadLocalEnvironment(mode: 'dev' | 'test'): NodeJS.ProcessEnv {
  const file = resolve(
    __dirname,
    '../../',
    mode === 'dev' ? '.env' : '.env.test',
  );
  const raw = parseEnv(readFileSync(file, 'utf8'));
  if (raw.APP_ENV !== (mode === 'dev' ? 'development' : 'test'))
    throw new ConfigurationError('APP_ENV');
  return raw;
}
