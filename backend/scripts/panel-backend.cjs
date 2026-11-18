// Starts only the local panel API. Never enables external providers from .env.
const { loadLocalEnvironment } = require('../dist/config/local-environment');
const { startApplication } = require('../dist/main');
const { ConfigurationError } = require('../dist/config/environment');
const raw = loadLocalEnvironment('dev');
startApplication({ ...raw, PORT: '3000', OPERATIONS_SCHEDULER_ENABLED: 'false', EVOLUTION_ENABLED: 'false', EVOLUTION_PROCESS_ENABLED: 'false', EVOLUTION_SEND_ENABLED: 'false', GEMINI_ENABLED: 'false' })
  .then(()=>console.log('Painel: API em http://127.0.0.1:3000. WhatsApp e Gemini desativados neste processo.'))
  .catch(error=>{console.error(error instanceof ConfigurationError?error.message:'PANEL_START_FAILED');process.exitCode=1;});
