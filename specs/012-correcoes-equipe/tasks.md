# Tasks — B13
Fontes: [spec](spec.md), [plan](plan.md) e [contrato](contracts/http.md). Execução sequencial e TDD nas interfaces já utilizadas.

## Preparação
- [x] T001 Incorporar Q1/Q2 e verificar constituição, checklist e artefatos em specs/012-correcoes-equipe/.
## Fundamentos
- [x] T002 Testar e implementar contrato/transformação por trecho em backend/test/unit/correction.spec.ts e backend/src/journey/domain/correction.ts.
- [x] T003 Testar e criar migração de origem equipe/registro imutável em backend/test/integration/correction-migration.spec.ts e backend/src/infrastructure/database/migrations/1793600000000-team-corrections.ts.
## US1 — Correção do dia
Teste independente: altera só o trecho selecionado, revalida elegibilidade/locais, identifica origem.
- [x] T004 Testar e implementar CorrectionService, portas e consultas em backend/test/integration/correction.spec.ts e backend/src/journey/{application,infrastructure}/correction*; compor RegistryStore.
- [x] T005 Validar preservação no fechamento, comandos seguintes e cancelamento em backend/src/journey/{application/journey.service.ts,domain/journey.ts,domain/closing.ts} e backend/test/integration/correction.spec.ts.
## US2 — Pendências e concorrência
Teste independente: revisão explícita não perde mensagens novas; mensagem antiga não desfaz correção.
- [x] T006 Testar e implementar revisão de recibos pendentes, idempotência e concorrência em backend/src/journey/application/correction.service.ts e backend/test/integration/correction.spec.ts.
- [x] T007 Verificar rollback de registro/recibos/jornada em backend/test/integration/correction.spec.ts.
## US3 — Planejamento coerente
Teste independente: excesso sinaliza ajuste, bloqueia reconfirmação e preserva ocupações.
- [x] T008 Validar integração B10/B12 e excesso de assentos em backend/test/integration/correction.spec.ts, sem contadores ou notificações extras.
- [x] T009 Expor e testar rotas administrativas em backend/src/journey/http/correction.controller.ts, backend/src/registry/registry.module.ts e backend/test/e2e/correction.e2e-spec.ts.
## Validação final
- [x] T010 Executar build/testes/lint/tipos e migrações dev/test; atualizar verification.md, README.md, AGENTS.md e docs/ pertinentes.

## Dependências e estratégia
T001 → fundamentos → US1 → US2 → US3 → validação. Fatias verticais com teste falhando antes do comportamento. Não há necessidade de agentes ou execução paralela; documentação de US1 e revisão do contrato US2 seriam independentes, mas serão mantidas sequenciais para reduzir coordenação. Nada de nova infraestrutura ou integração real.
