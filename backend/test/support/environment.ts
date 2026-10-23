export const syntheticEnvironment: NodeJS.ProcessEnv = {
  APP_ENV: 'test',
  PORT: '3001',
  DB_HOST: '127.0.0.1',
  DB_PORT: '55433',
  DB_NAME: 'techbus_test',
  DB_USER: 'techbus_test_app',
  DB_PASSWORD: 'synthetic-only',
};
