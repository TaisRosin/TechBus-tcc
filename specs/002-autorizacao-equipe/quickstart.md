# Verificação — B03

Pré-requisitos e ferramentas: [quickstart B02](../001-base-backend/quickstart.md). Mesmas versões e clusters, sem credenciais externas. PowerShell: se política local bloquear scripts, usar `Set-ExecutionPolicy -Scope Process Bypass` somente na sessão; não alterar política da máquina.

Na raiz: carregar scripts/use-local-node.ps1 e iniciar clusters dev/test com scripts/local-postgres.ps1. Em backend:

```powershell
npm run migration:run -- --env dev
npm run migration:run -- --env test
npm run build
npm run lint
npm test
npm run test:integration
npm run test:e2e
```

Integração instala migração no test quando pendente, prepara somente membros sintéticos identificados e os remove ao final. Testes de migração usam ciclo reversível apenas com tabela vazia no cluster test; recusam desfazer se encontrarem membros preexistentes. Dev não recebe seeds nem alterações de acesso dos testes.

Esperado: bloqueio de identidade inválida/desativado, matriz por perfil, campos extras e perfil forjado recusados; revisão antiga e perda do último admin recusadas; disputa entre dois admins mantém um ativo; driver só lê recurso atribuído. Guard global cobre rotas sem política.

Em execução normal, health continua disponível. `/api/v1/session` sem Bearer retorna 401; com Bearer retorna 503 enquanto verificador real não estiver conectado. Não há token mágico nem login simulado fora da suíte. Testes usam overrideProvider e fixtures em test/, excluídos do build.

Encerrar os dois clusters usando stop ao terminar. Não repetir npm ci se lockfile não mudou e as dependências de B02 estão presentes. Resultados em verification.md.
