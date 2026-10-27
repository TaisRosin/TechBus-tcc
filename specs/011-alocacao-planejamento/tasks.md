# Tasks — B12: alocação e planejamento

Fontes: [spec](spec.md), [plan](plan.md), [contracts](contracts/http.md). Execução sequencial, TDD nas regras críticas, somente PostgreSQL local.

## Preparação
- [x] T001 Reutilizar decisões e aprovações em spec.md, plan.md, research.md, data-model.md e contracts/http.md; verificar constituição e ignores.

## Fundamentos
- [x] T002 Testar e implementar demanda máxima, equivalência, cobertura e conversão temporal em backend/test/unit/operation.spec.ts e backend/src/operation/domain/operation.ts.
- [x] T003 Testar e criar migração de planos/ocupações, restrições e invalidação em backend/test/integration/operation-migration.spec.ts e backend/src/infrastructure/database/migrations/1793500000000-operation-planning.ts.
- [x] T004 Integrar portas/consultas transacionais em backend/src/operation/application/ports.ts, backend/src/operation/infrastructure/operation-queries.ts e backend/src/registry/; reutilizar avaliação de frota e barreira no recebimento de jornadas.

## US1 — Demanda e opções (P1)
Teste independente: max(ida,volta), menores equivalentes, locais inválidos continuam contando, indisponibilidade e insuficiência.
- [x] T005 [US1] Escrever cenários de snapshot e recomendação em backend/test/integration/operation.spec.ts.
- [x] T006 [US1] Implementar snapshot consistente e opções intermunicipais em backend/src/operation/application/operation.service.ts.

## US2 — Rascunho (P1)
Teste independente: persistir escolhas manuais sem reservar e rejeitar revisão/token superados.
- [x] T007 [US2] Testar e implementar rascunhos versionados preservando confirmação anterior em backend/test/integration/operation.spec.ts e backend/src/operation/application/operation.service.ts.

## US3 — Confirmação (P1)
Teste independente: após fechamento, capacidade/cobertura válidas, sem sobreposição e sem efeitos parciais.
- [x] T008 [US3] Escrever testes de fechamento, capacidade, pendências, concorrência, repetição e rollback em backend/test/integration/operation.spec.ts.
- [x] T009 [US3] Implementar confirmação atômica e revalidação de ocupações inclusive datas adjacentes em backend/src/operation/application/operation.service.ts.
- [x] T010 [US3] Validar cancelamento e alteração posterior sem liberar veículo automaticamente em backend/test/integration/operation.spec.ts.
- [x] T011 [US3] Expor API administrativa e validar autorização/contratos em backend/src/operation/http/operation.controller.ts, backend/src/registry/registry.module.ts e backend/test/e2e/operation.e2e-spec.ts.

## Validação e documentação
- [x] T012 Executar build, testes completos, lint, tipos, migração dev/test; registrar evidências em verification.md e atualizar README.md, AGENTS.md e docs/ pertinentes.

## Dependências e estratégia
T001 → T002 → T003 → T004 → US1 → US2 → US3 → T012. Cada fatia começa por teste falhando, termina com validação. Sem agentes paralelos. Exemplos independentes possíveis: regras puras de US1 e revisão dos contratos de US2; nesta execução permanecem sequenciais para reduzir coordenação. Nenhuma infraestrutura ou integração real adicional.
