# Tasks: B02 — Base verificável do backend

**Input**: [spec](spec.md), [plan](plan.md), [research](research.md), [dados](data-model.md), [contratos](contracts/base.md), [guia](quickstart.md).
**Status**: implementação autorizada por Taís em 22/10/2026; 18/18 tarefas concluídas; evidências em [verification.md](verification.md). Testes de comportamento solicitados; não criar testes que apenas espelhem configuração.

## Phase 1: Setup
- [X] T001 Preparar Git próprio na raiz (`.git/`) e `.gitignore` para node_modules, .env, .local, build e cobertura; criar branch `codex/001-base-backend` sem remoto/push, preservando docs/ e skills.
- [X] T002 Verificar/atualizar Node 24.22.1 e npm 11.17.0, conferir engines e registrar pins em `backend/.node-version` e evidências em `specs/001-base-backend/verification.md`; não modificar PRM.
- [X] T003 Gerar `backend/` com Nest CLI 11.0.10 sem instalação automática/novo Git, fixar dependências de research.md em `backend/package.json`, conferir versões auxiliares Jest/lint/ts-jest e pares, gerar `backend/package-lock.json`, comprovar npm ci/build sem conflito. Se incompatibilidade real aparecer, corrigir e registrar a matriz antes de código funcional.

## Phase 2: Foundational
- [X] T004 Definir scripts build/lint/test/test:integration/test:e2e e migrações com ambiente explícito em `backend/package.json`; preparar exemplos sem segredo em `backend/.env.example` e `backend/.env.test.example`, conforme contratos/base.md.

## Phase 3: US1 — Base reproduzível (P1)
**Goal**: iniciar base local e diagnosticar configuração inválida sem serviços reais.
**Independent Test**: instalação repetida por lockfile, bootstrap e GET /health/live; configuração inválida falha sem segredo.
- [X] T005 [US1] Escrever testes primeiro em `backend/test/e2e/bootstrap.e2e-spec.ts` para live=200, bind local e falha de configuração ausente/inválida sem revelar segredo; observar falha antes da implementação.
- [X] T006 [US1] Implementar validação em `backend/src/config/environment.ts`, bootstrap em `backend/src/main.ts` e `backend/src/app.module.ts`; distinguir development/test e vincular HTTP a loopback nesta etapa.
- [X] T007 [US1] Implementar módulo/controller técnico em `backend/src/health/health.module.ts` e `backend/src/health/http/health.controller.ts` com GET /health/live conforme contrato; executar testes de US1 e build.

## Phase 4: US2 — Persistência isolada (P1)
**Goal**: prover desenvolvimento/teste independentes e demonstrar executor de migrações.
**Independent Test**: aplicar/repetir/desfazer/reaplicar fixture e comprovar dev intacto, com recusa de alvo externo/dev antes da conexão.
- [X] T008 [US2] Preparar `scripts/local-postgres.ps1` e instruções no quickstart para ZIP PostgreSQL 17.11 verificado, clusters `.local/postgres/dev-data/` e `.local/postgres/test-data/`, loopback 55432/55433, SCRAM e credenciais distintas; validar caminhos/portas, sem serviços globais nem apagar dados existentes.
- [X] T009 [US2] Escrever teste comportamental em `backend/test/unit/test-database.spec.ts` cobrindo aceitação exclusiva de 127.0.0.1:55433/techbus_test/usuário de teste e rejeição de alvos externos/dev antes de qualquer conexão ou reset; observar falha.
- [X] T010 [US2] Implementar proteção em `backend/test/support/test-database.ts` e DataSource em `backend/src/infrastructure/database/data-source.ts`, com synchronize=false, migrationsRun=false, conexão por ambiente explícito e migrações de domínio separadas das fixtures.
- [X] T011 [US2] Criar `backend/test/integration/migrations.spec.ts` e fixture mínima reversível em `backend/test/fixtures/migrations/`, lendo a skill PostgreSQL antes de definir SQL; validar aplicar/repetir/desfazer/reaplicar, metadados e dev intacto, executando somente no cluster test.
- [X] T012 [US2] Executar/verificar inicialização e encerramento dos dois clusters via `scripts/local-postgres.ps1`, conferir privilégios restritos, executar testes seriais de US2 e registrar resultados em `specs/001-base-backend/verification.md`.

## Phase 5: US3 — Contratos e relógio (P2)
**Goal**: completar fatia entrada → caso de uso → portas → adaptadores, com tempo controlado.
**Independent Test**: caso de uso com relógio/probe substituídos, ready 200/503 e conversão de data explícita.
- [X] T013 [P] [US3] Escrever testes primeiro em `backend/test/unit/check-readiness.spec.ts` para instante fixo/repetição e probe disponível/indisponível; fornecer `backend/test/support/fixed-clock.ts` e testar conversão de data em `backend/test/unit/operational-date.spec.ts` nos instantes do quickstart.
- [X] T014 [P] [US3] Escrever testes primeiro em `backend/test/e2e/readiness.e2e-spec.ts` para GET /health/ready=200/503, checkedAt ISO UTC, ausência de segredo e liveness preservada; em `backend/test/integration/postgres-probe.spec.ts`, testar indisponibilidade e timeout/liberação de recursos.
- [X] T015 [US3] Implementar `backend/src/shared/time/clock.ts`, `system-clock.ts`, `operational-date.ts`, porta em `backend/src/health/application/ports/database-probe.ts` e caso em `backend/src/health/application/check-readiness.ts`; sem importar Nest/TypeORM no caso/portas, fazer testes unitários passarem.
- [X] T016 [US3] Implementar adaptador em `backend/src/infrastructure/database/postgres-probe.ts` com timeout 2s e inicialização preguiçosa, ligar injeção/rota ready no módulo/controller de saúde e executar testes unitários/integração/e2e; banco indisponível não impede live=200.

## Phase 6: Polish & Cross-Cutting Concerns
- [X] T017 Executar integralmente `specs/001-base-backend/quickstart.md`, npm ci/build/lint/testes; registrar versões efetivas, resultados, isolamento e limitações em `specs/001-base-backend/verification.md`, sem alegar integração real.
- [X] T018 Atualizar `README.md`, `docs/backlog.md`, `docs/decisoes.md` e `docs/plano-desenvolvimento.md` com evidências reais, conferir links e marcar esta lista apenas conforme execução; preparar próxima especificação B03 sem implementá-la automaticamente.

## Dependencies & Execution Order
T001 → T002 → T003 → T004 → US1 (T005–T007) → US2 (T008–T012) → US3 (T013–T016) → T017 → T018.
US3 precisa dos recursos de US2 para integração, mas seus unitários são verificáveis com substitutos. US1 é entrega mínima útil; B02 exige as três histórias. Em US2, T009 precede T010; T011 valida executor já configurado, sem criar esquema de negócio. Em US3, observar falhas dos testes T013/T014 antes de T015/T016.

## Parallel Execution Examples
US1: manter sequência teste → implementação; sem paralelismo útil. US2: manter sequência para não compartilhar clusters durante preparação. US3: T013 e T014 podem ser escritos em paralelo, em arquivos distintos, após US2; execução de testes que alteram banco permanece serial. Não requer múltiplos agentes.

## Implementation Strategy
Começar pela US1; revisar resultado executável antes de avançar. Completar persistência e contratos sem antecipar B03–B20. B02 não comprova autenticação nem regras operacionais. Total: 18 tarefas (setup/fundação 4, US1 3, US2 5, US3 4, finalização 2).
