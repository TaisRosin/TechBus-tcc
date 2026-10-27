# Quickstart — B08
Reutilizar [ambiente B02](../001-base-backend/quickstart.md). Carregar scripts/use-local-node.ps1 após habilitar scripts somente no processo. Iniciar PostgreSQL local dev/test se necessário. Dentro de backend:
```powershell
npm run migration:run -- --env test
node node_modules/jest/bin/jest.js --runInBand --testPathPatterns journey-closing
npm run migration:run -- --env dev
node node_modules/jest/bin/jest.js --runInBand
npm run build
npm run lint
node node_modules/typescript/bin/tsc --noEmit
```
Validar fechamento, inelegibilidade, locais pendentes, cancelamento 17h/22h, repetição/concorrência e interpretação atrasada nas duas ordens. Sem serviços reais. O lote é método interno testado; agendador real permanece futuro. Migração reversível somente sem estados B08 incompatíveis; não descartar cancelamentos para reverter.
