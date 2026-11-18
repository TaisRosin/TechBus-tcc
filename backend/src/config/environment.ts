import { readEvolutionConfig, type EvolutionConfig } from '../whatsapp/config';
import { readGeminiConfig, type GeminiConfig } from '../interpretation/gemini';
export class ConfigurationError extends Error {
  constructor(field: string) {
    super(`CONFIG_INVALID: ${field}`);
  }
}
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}
export interface Environment {
  mapsKey?: string;
  schedulerEnabled?: boolean;
  evolution?: EvolutionConfig;
  gemini?: GeminiConfig;
  mode: 'development' | 'test';
  port: number;
  database: DatabaseConfig;
}
export function readSchedulerEnabled(raw: NodeJS.ProcessEnv): boolean {
  const value = raw.OPERATIONS_SCHEDULER_ENABLED;
  if (value !== undefined && value !== 'true' && value !== 'false')
    throw new ConfigurationError('OPERATIONS_SCHEDULER_ENABLED');
  return value === 'true';
}
export function readEnvironment(raw: NodeJS.ProcessEnv): Environment {
  const invalid = (field: string): never => {
    throw new ConfigurationError(field);
  };
  const mode = raw.APP_ENV;
  if (mode !== 'development' && mode !== 'test') invalid('APP_ENV');
  if (raw.DATABASE_URL !== undefined) invalid('DATABASE_URL');
  if (raw.DB_HOST !== '127.0.0.1') invalid('DB_HOST');
  const expectedPort = mode === 'test' ? '55433' : '55432';
  const database = mode === 'test' ? 'techbus_test' : 'techbus_dev';
  if (raw.DB_PORT !== expectedPort) invalid('DB_PORT');
  if (raw.DB_NAME !== database) invalid('DB_NAME');
  if (raw.DB_USER !== `${database}_app`) invalid('DB_USER');
  if (!raw.DB_PASSWORD?.trim()) invalid('DB_PASSWORD');
  if (
    !raw.PORT ||
    !/^\d+$/.test(raw.PORT) ||
    Number(raw.PORT) < 1 ||
    Number(raw.PORT) > 65535
  )
    invalid('PORT');
  const evolution = readEvolutionConfig(raw);
  const gemini = readGeminiConfig(raw);
  return {
    schedulerEnabled: readSchedulerEnabled(raw),
    ...(raw.GOOGLE_MAPS_API_KEY?.trim()
      ? { mapsKey: raw.GOOGLE_MAPS_API_KEY.trim() }
      : {}),
    ...(evolution ? { evolution } : {}),
    ...(gemini ? { gemini } : {}),
    mode: mode as Environment['mode'],
    port: Number(raw.PORT),
    database: {
      host: '127.0.0.1',
      port: Number(expectedPort),
      database,
      user: raw.DB_USER!,
      password: raw.DB_PASSWORD!,
    },
  };
}
