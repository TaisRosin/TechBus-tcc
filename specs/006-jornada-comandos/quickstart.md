# Quickstart — B07

Reutilizar [ambiente B02](../001-base-backend/quickstart.md). Sem serviços externos ou novas dependências. Na raiz, habilitar scripts apenas no processo e carregar scripts/use-local-node.ps1. Iniciar clusters locais dev/test com scripts/local-postgres.ps1 somente se necessário. Em backend:

```powershell
npm run migration:run -- --env test
node node_modules/jest/bin/jest.js --runInBand --testPathPatterns journey
npm run migration:run -- --env dev
node node_modules/jest/bin/jest.js --runInBand
npm run build
npm run lint
node node_modules/typescript/bin/tsc --noEmit
```

Esperado: comandos explícitos corretos, recusa preservada, local pendente contando demanda, alteração diária sem mudar padrão, elegibilidade revalidada, recebimento anterior às 17h preservado, duplicatas sem repetição, pendência de ordem incerta e leitura HTTP protegida. Testes criam dados sintéticos e removem somente seus registros. Validação real de endereço/Auth/WhatsApp continua indisponível, sem token de teste no runtime. Ver [contratos](contracts/internal-http.md) e evidências ao concluir.
