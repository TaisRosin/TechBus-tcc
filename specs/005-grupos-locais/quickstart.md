# Verificação B06
Reutilizar ferramentas/credenciais locais de [B05](../004-calendarios-elegibilidade/quickstart.md). Nenhuma dependência nova.
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
HTTP de teste substitui identidade e, quando necessário, AddressValidator. Runtime retorna indisponibilidade para validação real, sem fingir que texto comprova cobertura geográfica. [Evidências](verification.md).
