export interface EvolutionConfig {
  baseUrl: string;
  instance: string;
  apiKey: string;
  webhookSecret: string;
  sendEnabled: boolean;
  processEnabled?: boolean;
  testPhones: string[];
}

export function readEvolutionConfig(
  raw: NodeJS.ProcessEnv,
): EvolutionConfig | undefined {
  const invalid = (): never => {
    throw new Error('CONFIG_INVALID: EVOLUTION');
  };
  if (raw.EVOLUTION_ENABLED === undefined || raw.EVOLUTION_ENABLED === 'false')
    return undefined;
  if (raw.EVOLUTION_ENABLED !== 'true') return invalid();
  const {
    EVOLUTION_BASE_URL: baseUrl,
    EVOLUTION_INSTANCE: instance,
    EVOLUTION_API_KEY: apiKey,
    EVOLUTION_WEBHOOK_SECRET: webhookSecret,
  } = raw;
  if (
    baseUrl !== 'http://127.0.0.1:8085' ||
    !instance ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(instance) ||
    !apiKey ||
    !webhookSecret ||
    apiKey.length < 32 ||
    webhookSecret.length < 32 ||
    apiKey === webhookSecret
  )
    return invalid();
  if (
    raw.EVOLUTION_SEND_ENABLED !== undefined &&
    !['true', 'false'].includes(raw.EVOLUTION_SEND_ENABLED)
  )
    return invalid();
  const testPhones = raw.EVOLUTION_TEST_PHONES
    ? raw.EVOLUTION_TEST_PHONES.split(',').map((p) => p.trim())
    : [];
  if (testPhones.some((p) => !/^\+[1-9]\d{7,14}$/.test(p))) return invalid();
  const sendEnabled = raw.EVOLUTION_SEND_ENABLED === 'true';
  if (
    raw.EVOLUTION_PROCESS_ENABLED !== undefined &&
    !['true', 'false'].includes(raw.EVOLUTION_PROCESS_ENABLED)
  )
    return invalid();
  if (sendEnabled && !testPhones.length) return invalid();
  return {
    baseUrl,
    instance,
    apiKey,
    webhookSecret,
    sendEnabled,
    testPhones,
    processEnabled: raw.EVOLUTION_PROCESS_ENABLED === 'true',
  };
}
