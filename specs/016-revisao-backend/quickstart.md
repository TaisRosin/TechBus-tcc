# Quickstart B17
Reutilizar [ambiente B02](../001-base-backend/quickstart.md), PostgreSQL local dev/test e runtime fixado. No backend: npm run build; node node_modules/jest/bin/jest.js --runInBand --testPathPatterns backend-review; regressão completa com node node_modules/jest/bin/jest.js --runInBand; npm run lint; node node_modules/typescript/bin/tsc --noEmit.
Conferir [matriz](coverage.md), migrações sem pendências e dados sintéticos removidos. Sem serviços reais ou resultado acadêmico presumido.
