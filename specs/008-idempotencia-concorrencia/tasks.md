# Tasks — B09
## Preparação
- [x] T001 Consolidar requisitos existentes e desenho em specs/008-idempotencia-concorrencia/spec.md, plan.md, research.md, data-model.md e contracts/internal.md.
## Fundação
- [x] T002 Preparar fixture isolada e injeção de falhas na porta RegistryStore em backend/test/integration/journey-resilience.spec.ts, sem simular o banco ou alterar esquema.
## US1 — Falhas e reentrega
Critério independente: falha reverte tentativa; retry aplica uma vez e conserva apenas tempo efetivamente durável.
- [x] T003 [US1] Validar rollback de recebimento, aplicação e conciliação de cancelamento em backend/test/integration/journey-resilience.spec.ts; corrigir backend/src/journey/application/journey.service.ts apenas se houver falha de invariantes.
## US2 — Concorrência e ordem
Critério independente: duplicatas não duplicam efeito; recibo antigo não vence revisão; desconhecido permanece pendente.
- [x] T004 [US2] Testar e implementar receiveUnordered em backend/src/journey/application/journey.service.ts com teste falhando em backend/test/integration/journey-resilience.spec.ts.
- [x] T005 [US2] Validar conexões independentes, reentrega após cortes e ordem invertida em backend/test/integration/journey-resilience.spec.ts.
## US3 — Retomada do lote
Critério independente: falha isolada não impede outras jornadas; resposta mostra pendências e retry é seguro.
- [x] T006 [US3] Testar e implementar status processed/failed e pendências por item em backend/test/integration/journey-resilience.spec.ts e backend/src/journey/application/journey.service.ts.
## Entrega
- [x] T007 Executar suíte completa/build/lint/tipos e conferir limpeza local, registrando resultados em specs/008-idempotencia-concorrencia/verification.md.
- [x] T008 Atualizar README.md, AGENTS.md e docs/backlog.md, docs/decisoes.md, docs/api.md, docs/plano-desenvolvimento.md; conferir links e tarefas.

## Dependências e estratégia
T001 → T002 → US1 → US2 → US3 → T007 → T008. Execução sequencial; teste primeiro nas mudanças, verificação pública das invariantes existentes. MVP US1; entrega autorizada inclui as três histórias. Documentação pode ser conferida independentemente das validações; sem delegação necessária. Sem nova migração, benchmark, integração real ou commit automático.
