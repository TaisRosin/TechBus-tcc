# Validação B05
Mesmas ferramentas e bancos de [B04](../003-cadastros-vigencias/quickstart.md); nenhum serviço real ou dependência nova.
```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
. ./scripts/use-local-node.ps1
./scripts/local-postgres.ps1 -Action start -Environment test
./scripts/local-postgres.ps1 -Action start -Environment dev
Set-Location backend
npm run migration:run -- --env test
npm run migration:run -- --env dev
node node_modules/jest/bin/jest.js --runInBand
npm run build
npm run lint
node node_modules/typescript/bin/tsc --noEmit
Set-Location ..
./scripts/local-postgres.ps1 -Action stop -Environment test
./scripts/local-postgres.ps1 -Action stop -Environment dev
```
HTTP substitui somente identidade nos testes. Calendários sintéticos são restaurados após testes; nenhum dia real é configurado. Resultados em [verification.md](verification.md).
