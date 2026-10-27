# Quickstart B11
Reutilizar [B02](../001-base-backend/quickstart.md), Node local e PostgreSQL privados dev/test. Nenhum serviço externo.
Dentro de backend após scripts/use-local-node.ps1:
```powershell
npm run build
node node_modules/jest/bin/jest.js --runInBand --testPathPatterns fleet
node node_modules/jest/bin/jest.js --runInBand
npm run lint
node node_modules/typescript/bin/tsc --noEmit
```
Executar build antes de testes; suítes PostgreSQL sequenciais. Testar cadastro, semana/exceção, ausência de configuração, cobertura parcial, meia-noite, permanência, reuso e autorização. Migração local explícita; fixtures removidas apenas por IDs. Avaliação não equivale a reserva/alocação.
