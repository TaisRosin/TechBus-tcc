# Quickstart — B10
Reutilizar [ambiente B02](../001-base-backend/quickstart.md), Node local e PostgreSQL test 55433/dev 55432. Dados sintéticos somente; sem serviços remotos.
Dentro de backend, após ativar scripts/use-local-node.ps1:
```powershell
npm run build
node node_modules/jest/bin/jest.js --runInBand --testPathPatterns patterns
node node_modules/jest/bin/jest.js --runInBand
npm run lint
node node_modules/typescript/bin/tsc --noEmit
```
Build antes dos testes, nunca simultâneo. Aplicar migração pelo procedimento local existente; fixtures removidas por IDs. Esperado: quarta utilização sugere, recusa não repete, local desconhecido suspende, revisão/cancelamento recalcula, aceite/pedido alteram apenas padrão, concorrência não duplica. Sem entrega de WhatsApp.
