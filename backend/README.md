# TechBus — backend

Base B02 e autorização B03: perfis fixos, vínculo ativo, gestão de acesso e proteção do último admin. [Guia B03](../specs/002-autorizacao-equipe/quickstart.md). Demais regras seguem o [backlog](../docs/backlog.md).

## Ferramentas locais

Da raiz do projeto, no PowerShell:

```powershell
. ./scripts/use-local-node.ps1
node --version
npm --version
```

O script seleciona Node 24.22.1 e npm 11.17.0 privados em `.local/`. Não modifica versões globais. Dependências exatas estão em package.json/package-lock.json. Consulte o [guia B02](../specs/001-base-backend/quickstart.md) e o [registro de execução](../specs/001-base-backend/verification.md) para o estado de validação.

## Banco local

O script `scripts/local-postgres.ps1` usa binários PostgreSQL 17.11 em `.local/postgres/17.11/pgsql/bin`, sem serviço Windows. `init` cria um cluster novo, gera credenciais locais e escreve `.env` ou `.env.test`; recusa sobrescrever arquivos/diretórios existentes. `start`, `status` e `stop` exigem o marcador do cluster TechBus. Não existe ação de remoção/reset de diretórios.

```powershell
./scripts/local-postgres.ps1 -Action init -Environment dev
./scripts/local-postgres.ps1 -Action init -Environment test
./scripts/local-postgres.ps1 -Action start -Environment dev
./scripts/local-postgres.ps1 -Action start -Environment test
```

Desenvolvimento: 127.0.0.1:55432/techbus_dev. Testes: 127.0.0.1:55433/techbus_test. Credenciais distintas; usuário da aplicação sem DDL/superusuário. Migrações usam usuário próprio. Arquivos de segredos são ignorados pelo Git e nunca devem ser compartilhados.

## Validação

Após selecionar as ferramentas locais, em `backend/`:

```powershell
npm ci
npm run migration:run -- --env dev
npm run migration:run -- --env test
npm run build
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run start:dev
```

Integração requer o cluster de testes. A verificação de isolamento também consulta somente metadados de desenvolvimento, sem alterar dados. Rotas técnicas: GET /health/live e /health/ready. Nenhuma rota de negócio/autenticação está entregue em B02.

Migrações são explícitas: `npm run migration:show -- --env dev`, `migration:run` ou `migration:revert`, usando `--env dev` ou `--env test`. Sem synchronize e sem migrações automáticas no bootstrap. Fixtures não fazem parte das migrações da aplicação.

B03 aplica guard global, sessão/perfil atual e alteração de acesso transacional. A execução normal recusa identidades enquanto Supabase Auth não está conectado; tokens sintéticos existem apenas nos testes. Convites não são enviados: contrato reservado ao admin informa indisponibilidade. Regras de atribuição usam porta, com consultas reais de viagens previstas em B15. Ver contratos/limites no guia B03.
