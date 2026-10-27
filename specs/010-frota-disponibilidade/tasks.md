# Tasks B11
## Preparação
- [x] T001 Registrar decisões e artefatos em specs/010-frota-disponibilidade/spec.md, plan.md, research.md, data-model.md, contracts/http.md e quickstart.md.
## Fundação
- [x] T002 Testar/implementar faixas semiabertas e cobertura em backend/test/unit/fleet.spec.ts e backend/src/fleet/domain/fleet.ts: start inteiro 0..2879; end>start e <=2880; etapas collection/intermunicipal/distribution; máximo 30 faixas; semana sete dias.
## US1 — Cadastros
Critério: cadastro válido, duplicatas/assentos inválidos rejeitados, desativação preserva registro.
- [x] T003 [US1] Testar/implementar migração backend/src/infrastructure/database/migrations/1793400000000-fleet.ts em backend/test/integration/fleet-migration.spec.ts: identificação/placa únicas, assentos >0, versão >0, FKs e JSON validado, sem DELETE/DDL; reversão preserva dados.
- [x] T004 [US1] Testar/implementar cadastros em backend/test/integration/fleet.spec.ts e backend/src/fleet/application/fleet.service.ts, application/ports.ts, infrastructure/fleet-queries.ts com RegistryTransaction.
## US2 — Disponibilidade
Critério: semana/exceção, ausência de configuração, cobertura parcial e versão concorrente.
- [x] T005 [US2] Testar/implementar semana e exceções em backend/test/integration/fleet.spec.ts e backend/src/fleet/application/fleet.service.ts; exceção vazia bloqueia, null herda semana, uma versão por veículo.
## US3 — Etapas e motorista
Critério: mesmo veículo intermunicipal, permanência ocupada, reuso posterior e motoristas distintos.
- [x] T006 [US3] Testar/implementar propostas locais/intermunicipais em backend/test/unit/fleet.spec.ts e backend/src/fleet/domain/fleet.ts, com ciclos cronológicos válidos.
- [x] T007 [US3] Testar/implementar avaliação de disponibilidade, grupos/motoristas ativos e conflitos do lote em backend/test/integration/fleet.spec.ts e backend/src/fleet/application/fleet.service.ts, sem reservar/alocar.
## Integração e entrega
- [x] T008 Testar/implementar contratos HTTP protegidos em backend/test/e2e/fleet.e2e-spec.ts e backend/src/fleet/http/fleet.controller.ts; registrar providers em backend/src/registry/registry.module.ts.
- [x] T009 Executar migrações dev/test, regressão completa, build/lint/tipos e limpeza; registrar specs/010-frota-disponibilidade/verification.md.
- [x] T010 Atualizar README.md, AGENTS.md, docs/decisoes.md, docs/requisitos.md, docs/api.md, docs/modelo-dados.md, docs/backlog.md e docs/plano-desenvolvimento.md; conferir links/tarefas.
## Dependências e estratégia
T001 → T002 → US1 → US2 → US3 → HTTP → entrega. TDD por fatias em interfaces públicas já adotadas. MVP US1; autorização cobre incremento inteiro. Testes de banco sequenciais; documentação pode ser conferida durante testes, sem delegação. Sem commit automático.
