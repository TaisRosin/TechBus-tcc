# Quickstart — B09
Reutilizar [ambiente B02](../001-base-backend/quickstart.md), scripts/use-local-node.ps1 e PostgreSQL test 55433. Não instalar dependências nem alterar segredos. Dentro de backend:
```powershell
npm run build
node node_modules/jest/bin/jest.js --runInBand --testPathPatterns journey-resilience
node node_modules/jest/bin/jest.js --runInBand
npm run lint
node node_modules/typescript/bin/tsc --noEmit
```
Executar build antes dos testes, nunca simultaneamente: a suíte de bootstrap utiliza dist/main.js.
Fixtures sintéticas removidas por IDs. Falhas injetadas somente nos testes; não desligar banco para simular incidente. Esperado: recibo/jornada/resultado atômicos, duplicatas sem novo efeito, instante durável preservado e resultado de lote com pendências explícitas. Sem benchmark, serviço real ou migração B09.
