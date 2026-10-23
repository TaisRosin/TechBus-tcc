# Tasks: B03 — Autorização da equipe

Input: [spec](spec.md), [plan](plan.md), [dados](data-model.md), [contratos](contracts/access.md). Autorizada integralmente após três respostas de negócio em 22/10/2026. Status: 13/13 concluídas; resultados em [verification.md](verification.md). TDD nas fronteiras de casos/HTTP/persistência, conforme direção aprovada; sem nova confirmação de detalhes técnicos.

## Phase 1 — Setup
- [X] T001 Consolidar três decisões aceitas e artefatos SDD em specs/002-autorizacao-equipe/, preservando docs/ e B02.
## Phase 2 — Foundational
- [X] T002 Definir portas de equipe/identidade/atribuição e erros seguros em backend/src/access/application/ports.ts e domain/access.ts, sem Nest no domínio.
## Phase 3 — US1: vínculo e perfis (P1)
Teste independente: identidade/vínculo atual e matriz fixa antes de efeitos.
- [X] T003 [US1] Escrever e observar teste falhando de autorização em backend/test/unit/access.spec.ts; completar matriz, desconhecido/inativo e papel forjado incrementalmente.
- [X] T004 [US1] Implementar autorização por perfil único e consulta atual em backend/src/access/application/access.service.ts.
- [X] T005 [US1] Escrever testes HTTP em backend/test/e2e/access.e2e-spec.ts; implementar guard global, sessão, filtro e integração em backend/src/access/http/, access.module.ts e app.module.ts; health público explícito, sem simulador no runtime.
## Phase 4 — US2: gestão preserva admin (P1)
Teste independente: alterar acesso autorizado, negar operador e impedir perda sequencial/concorrente do último admin.
- [X] T006 [US2] Testar alteração/revisão/último admin em backend/test/unit/access.spec.ts e implementar changeAccess em backend/src/access/application/access.service.ts, com comando exato e revalidação do ator na transação.
- [X] T007 [US2] Escrever RED de persistência real em backend/test/integration/access-store.spec.ts; criar migração em backend/src/infrastructure/database/migrations/1792700000000-team-access.ts com id UUID PK, subject UUID UNIQUE NOT NULL, role CHECK admin/operator/driver NOT NULL, active boolean NOT NULL, version integer DEFAULT 1 NOT NULL CHECK > 0; grants SELECT/INSERT/UPDATE específicos sem DELETE/DDL.
- [X] T008 [US2] Implementar repositório TypeORM transacional em backend/src/access/infrastructure/postgres-team-store.ts; provar rollback, persistência e disputa entre duas conexões, mantendo pelo menos um admin ativo e sem alterar dev.
- [X] T009 [US2] Conectar PATCH /api/v1/users/:id/access e contrato indisponível de convites em backend/src/access/http/access.controller.ts; testar admin/operador, corpo inválido, revisão e desativação em backend/test/e2e/access.e2e-spec.ts.
## Phase 5 — US3: atribuições (P2)
Teste independente: motorista lê somente atribuição comprovada, sem edição.
- [X] T010 [US3] Escrever RED de leitura própria/alheia/ausente e edição em backend/test/unit/access.spec.ts; implementar porta/checagem de atribuição em backend/src/access/application/access.service.ts sem tabela de viagem.
- [X] T011 [US3] Validar política de recurso no guard em backend/test/e2e/access.e2e-spec.ts com controller/atribuições exclusivos de teste; manter adaptador indisponível no runtime em backend/src/access/access.module.ts.
## Phase 6 — Polish
- [X] T012 Executar migrações explícitas em dev/test, regressão B02+B03, build/lint/tipos; registrar resultados reais e limitações em specs/002-autorizacao-equipe/verification.md.
- [X] T013 Atualizar decisões/R20/fluxos/README/AGENTS/backlog/plano e contratos em docs/ sem repetir documentação, conferir links e manter B04 não iniciada.

## Dependencies & Strategy
T001 → T002 → US1 → US2 → US3 → T012 → T013. Dentro de cada história: teste → comportamento mínimo → validação; não escrever todas as suítes antes do código. Sem paralelismo de agentes/tarefas solicitado: execução sequencial evita disputa de banco. US1 é menor incremento verificável; entrega B03 exige as três histórias. Total: 13 tarefas; US1=3, US2=4, US3=2, setup/fundação=2, finalização=2.
