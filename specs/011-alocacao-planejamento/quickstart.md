# Quickstart B12
Reutilizar [ambiente B02](../001-base-backend/quickstart.md), scripts/use-local-node.ps1 e PostgreSQL privados locais.
Dentro de backend:
```powershell
npm run build
node node_modules/jest/bin/jest.js --runInBand --testPathPatterns operation
node node_modules/jest/bin/jest.js --runInBand
npm run lint
node node_modules/typescript/bin/tsc --noEmit
```
Build antes dos testes; bancos sequenciais. Dados sintéticos por IDs. Casos: demanda max, equivalência, ausência de recomendação local, maior manual, fechamento/locais pendentes, versão superada, concorrência e rollback, reuso e conflitos entre datas. Não usar serviços reais.
