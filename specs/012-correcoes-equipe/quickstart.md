# Quickstart B13
Reusar [ambiente B02](../001-base-backend/quickstart.md). Iniciar os dois clusters locais antes da regressão completa; usar scripts/use-local-node.ps1.
No backend: npm run build; node node_modules/jest/bin/jest.js --runInBand --testPathPatterns correction; node node_modules/jest/bin/jest.js --runInBand; npm run lint; node node_modules/typescript/bin/tsc --noEmit.
Casos: trechos independentes, revisão explícita, interpretação antiga, concorrência/repetição, cancelamento posterior, fechamento, elegibilidade/locais, rollback e excesso de assentos. Somente fixtures sintéticas; nenhum serviço externo.
