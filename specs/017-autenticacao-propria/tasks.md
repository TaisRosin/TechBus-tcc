# Tasks: B18.1 — autenticação própria

Entrada: [spec](spec.md), [plano](plan.md), [pesquisa](research.md), [dados](data-model.md), [contratos](contracts/auth.md). Implementação autorizada por Taís em 28/10/2026; resultados em [verification.md](verification.md). TDD obrigatório nas regras críticas, uma fatia por vez.

## Fase 1 — Preparação

- [x] T001 Conferir baseline, runtime/lockfile e isolamento sem expor segredos; registrar comandos e resultados em specs/017-autenticacao-propria/verification.md.

## Fase 2 — Fundação

- [x] T002 Escrever testes de constraints, migração/reversão sem perda e preservação dos IDs em backend/test/integration/auth.spec.ts; aplicar literalmente campos/constraints de data-model.md: email obrigatório trim/lowercase 3–254 UNIQUE, versões integer > 0, FKs obrigatórias, enums, timestamptz, token_hash UNIQUE, last_activity_at >= created_at, expires_at > created_at, contador integer >= 0 e nulabilidade condicional da temporária.
- [x] T003 Criar migração aditiva com timestamp único em backend/src/infrastructure/database/migrations/ para as quatro tabelas de data-model.md, todas as constraints de T002 e grants mínimos, sem dados padrão nem exclusão automática; down recusa perda de dados.
- [x] T004 Definir portas/relógio e validação de email/senha em backend/src/access/application/auth.ports.ts e backend/src/access/domain/auth.ts; senha definitiva 15–128 caracteres sem truncar, enum de escopo operation/password-change, temporária gerada pelo servidor.
- [x] T005 Testar e implementar crypto assíncrona em backend/src/access/infrastructure/password-hasher.ts e backend/test/unit/password-hasher.spec.ts; parâmetros/salt/aleatoriedade/limites de fila conforme research.md, comparação segura, medir custo local sem registrar segredos.

## Fase 3 — US1 login, autorização e saída

Objetivo: acesso individual com permissões existentes. Teste independente: conta sintética definitiva preparada por fixture, login/ação permitida/proibida/logout.

- [x] T006 [P] [US1] Escrever testes de fronteiras 1h/12h, sessão restrita, polling passivo, falhas e atividade monotônica em backend/test/unit/auth.spec.ts e backend/test/integration/auth.spec.ts.
- [x] T007 [P] [US1] Escrever contratos HTTP login/logout/session e três perfis em backend/test/e2e/auth.e2e-spec.ts, sem identidade fictícia no runtime.
- [x] T008 [US1] Implementar sessões/revogação/contadores persistidos e revalidação de versão em backend/src/access/infrastructure/postgres-auth-store.ts; testes concorrentes em backend/test/integration/auth.spec.ts, incluindo reset/login e desativação/reativação sem restaurar sessão.
- [x] T009 [US1] Implementar login/logout e limitação de tentativas em backend/src/access/application/auth.service.ts e backend/src/access/http/auth.controller.ts; erro genérico, no-store, 5 falhas/conta e 30 tentativas/origem por 15 minutos, limite de derivação conforme pesquisa.
- [x] T010 [US1] Integrar backend/src/access/infrastructure/session-verifier.ts, backend/src/access/access.module.ts, backend/src/access/application/ports.ts e backend/src/access/http/access.guard.ts; preservar política deny-by-default, subject estável, perfil consultado e cabeçalho passive conforme plan.md. Desativação revoga sessões na transação em backend/src/access/infrastructure/postgres-team-store.ts.

## Fase 4 — US2 criação e troca

Objetivo: admin entrega temporária, pessoa escolhe senha. Teste independente: criar conta e concluir troca antes de usar operação, incluindo temporária vencida e duplicatas.

- [x] T011 [US2] Escrever testes criação por admin, email duplicado concorrente, provisionamento legado e troca única/exata em 24h em backend/test/integration/auth.spec.ts e backend/test/e2e/auth.e2e-spec.ts.
- [x] T012 [US2] Implementar criação/provisionamento e metadados administrativos em backend/src/access/application/auth.service.ts e backend/src/access/infrastructure/postgres-auth-store.ts, com lock B03, revalidação do ator e evento sem segredo.
- [x] T013 [US2] Implementar troca restrita, validade de 10 minutos limitada à temporária, consumo de versão única e revogação em backend/src/access/application/auth.service.ts; senha nova diferente da temporária, exige novo login.
- [x] T014 [US2] Expor contratos users/credentials/password em backend/src/access/http/auth.controller.ts e substituir invitation obsoleto por 410 protegido em backend/src/access/http/access.controller.ts; temporária apenas na resposta de emissão, sem reexposição.

## Fase 5 — US3 recuperação e bootstrap

Objetivo: recuperação sem elevar privilégios e primeiro admin controlado. Teste independente: admin recupera conta, operador é negado e bootstrap concorrente cria uma única conta.

- [x] T015 [US3] Escrever testes reset/troca/login concorrentes, admin desativado durante reset, último admin preservado e CLI restrita em backend/test/integration/auth.spec.ts e backend/test/unit/auth-cli.spec.ts.
- [x] T016 [US3] Implementar reset administrativo com revisão, revogação atômica e auditoria em backend/src/access/application/auth.service.ts, backend/src/access/infrastructure/postgres-auth-store.ts e backend/src/access/http/auth.controller.ts; nunca alterar active/role.
- [x] T017 [US3] Implementar procedimentos interativos locais em backend/src/access/cli/auth-bootstrap.ts e backend/src/access/cli/auth-recover-admin.ts; bootstrap recusa equipe existente, recuperação aceita somente único admin ativo explícito, provisiona email ausente sem substituir subject, nenhum endpoint público.
- [x] T018 [US3] Acrescentar comandos locais em backend/package.json e instruções de uso/recuperação sem senha em argumento/log em specs/017-autenticacao-propria/quickstart.md.

## Fase 6 — Validação e documentação

- [x] T019 Executar quickstart, suites unit/integration/e2e, lint/build e inspeção de segredos/erros; registrar evidência, custo criptográfico e limitações em specs/017-autenticacao-propria/verification.md. Regressão B03/B15 e demais regras não pode perder permissões ou vínculos.
- [x] T020 Atualizar docs/api.md, docs/arquitetura.md, docs/modelo-dados.md, docs/b18-preparacao.md e docs/plano-desenvolvimento.md com resultado real e encaminhamento B19: token só memória, login em abertura/recarga/restauração, polls passivos, CSP/renderização segura e teste de cache; não declarar SC-005 concluído antes do frontend.

## Dependências e paralelismo

T001 → T002–T005 → US1 (T006–T010) → US2 (T011–T014) → US3 (T015–T018) → T019–T020. T002 antes de T003, testes antes da implementação de cada comportamento. T006/T007 são únicos [P], arquivos distintos; implementação compartilhada permanece sequencial. US2: testes HTTP podem ser preparados separadamente dos cenários de banco, sem editar os mesmos arquivos simultaneamente. US3: revisão do procedimento CLI pode ocorrer junto da revisão dos testes, sem presumir autorização para agentes paralelos.

MVP demonstrável: US1 com fixture; entrega autorizável B18.1 inclui as três histórias. Não implantar nem conectar serviços após o ensaio por inferência.

## Cobertura

| Requisito | Tarefas |
| --- | --- |
| FR-001 | T004–T010 |
| FR-002 | T007,T010,T015,T019 |
| FR-003 | T011,T012,T014 |
| FR-004 | T011,T013,T014 |
| FR-005 | T015,T016 |
| FR-006 | T006,T008–T010 |
| FR-007 | T010,T020; validação completa em B19 |
| FR-008 | T015,T017,T018 |
| FR-009 | T005–T010,T019 |
| FR-010 | T002,T003,T011,T012,T017 |
| FR-011 | T003,T012,T016–T019 |
| SC-001–SC-004 | T007,T011,T015,T019 |
| SC-005 | T020; aceite navegador B19 |
