# Verificação local B04
Reutilizar [B02](../001-base-backend/quickstart.md), sem copiar segredos ou instalar dependências novas.

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
HTTP substitui apenas verificador de identidade, com PostgreSQL real isolado. Aplicação normal mantém Auth indisponível até integração autorizada. Evidências: [verification.md](verification.md).
