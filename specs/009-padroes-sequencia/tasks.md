# Tasks — B10
## Preparação
- [x] T001 Registrar decisões confirmadas e artefatos em specs/009-padroes-sequencia/spec.md, plan.md, research.md, data-model.md, contracts/internal-http.md e quickstart.md.
## Fundação
- [x] T002 Testar e implementar cálculo de sequência em backend/test/unit/patterns.spec.ts e backend/src/journey/domain/patterns.ts (uma data/trecho, quarta utilização, suspensão).
## US1 — Reconhecer recorrência
Critério: três usos não sugerem, quatro sugerem; sentido independente, sem mudar padrão.
- [x] T003 [US1] Testar leitura pública em backend/test/integration/patterns.spec.ts e implementar backend/src/journey/application/pattern.service.ts, pattern-ports.ts e infrastructure/pattern-queries.ts com RegistryStore.
- [x] T004 [US1] Testar migração em backend/test/integration/patterns-migration.spec.ts e implementar backend/src/infrastructure/database/migrations/1793300000000-place-patterns.ts: direction pickup/dropoff, action accept/refuse/request, sequence > 0, default_version >= 0; suggestion_key varchar(64) obrigatório para accept/refuse e nulo para request; exatamente um point_id/location_id por direction, FKs e privilégios SELECT/INSERT sem DELETE/UPDATE/DDL.
## US2 — Revisões e recuperação
Critério: cancelamento/revisão recalculam; duplicatas não contribuem duas vezes.
- [x] T005 [US2] Cobrir cancelamento, revisão, ausência de local, resolução e interpretação atrasada em backend/test/integration/patterns.spec.ts, ajustando pattern.service.ts conforme necessário.
## US3 — Decidir padrão
Critério: recusa preserva e não repete; aceite/pedido validado muda somente padrão.
- [x] T006 [US3] Testar/implementar comandos restritos, recusa persistente e nova sequência em backend/test/integration/patterns.spec.ts, backend/src/journey/domain/patterns.ts e application/pattern.service.ts.
- [x] T007 [US3] Testar/implementar aceite e pedido com evidência, validação e versão em backend/test/integration/patterns.spec.ts e backend/src/journey/application/pattern.service.ts.
- [x] T008 [US3] Verificar concorrência, reentrega, ordem incerta, prazos e rollback em backend/test/integration/patterns.spec.ts.
- [x] T009 [US1] Testar leitura HTTP protegida em backend/test/e2e/patterns.e2e-spec.ts e implementar backend/src/journey/http/pattern.controller.ts com composição em backend/src/registry/registry.module.ts.
## Entrega
- [x] T010 Executar migração dev/test locais, suíte completa, build/lint/tipos; registrar em specs/009-padroes-sequencia/verification.md.
- [x] T011 Atualizar README.md, AGENTS.md, docs/requisitos.md, docs/fluxos.md, docs/decisoes.md, docs/backlog.md, docs/api.md, docs/modelo-dados.md e docs/plano-desenvolvimento.md; conferir links, limpeza e tarefas.
## Dependências e estratégia
T001 → T002 → US1 → US2 → US3 → HTTP → entrega. Fatias verticais: teste falhando, mínimo necessário, regressão. MVP US1; autorização abrange todas as histórias. Sem paralelismo de testes PostgreSQL: fixtures compartilhadas. Conferência de documentação pode ocorrer enquanto testes rodam; nenhuma delegação necessária. Sem commit automático.
