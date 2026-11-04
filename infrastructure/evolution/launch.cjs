// Provider logs can contain payloads/secrets. No persistent stdout/stderr in local MVP.
// Keep the API in this process so the guarded PID in local-evolution.ps1 owns it.
process.stdout.write = () => true;
process.stderr.write = () => true;
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const report = (error) => {
  // Only error classification; never persist error messages, payloads or stack locals.
  writeFileSync(join(process.cwd(), '../evolution-runtime/startup-error.json'), JSON.stringify({
    name: typeof error?.name === 'string' ? error.name : 'UnknownError',
    code: typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code) ? error.code : null,
  }));
};
process.on('unhandledRejection', report);
process.on('uncaughtExceptionMonitor', report);
require(require('node:path').join(process.cwd(), 'dist/main.js'));
