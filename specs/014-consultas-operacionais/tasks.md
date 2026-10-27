# Tasks — B15
## Preparação
- [x] T001 Registrar Q1/Q2 e preparar artefatos em specs/014-consultas-operacionais/.
## Fundamentos
- [x] T002 Testar janela e associação por sentido em backend/test/unit/consultation.spec.ts e implementar backend/src/operation/domain/consultation.ts.
- [x] T003 Testar persistência em backend/test/integration/consultation-migration.spec.ts e criar backend/src/infrastructure/database/migrations/1793800000000-operational-queries.ts: user_id PK, driver_id nullable UNIQUE, version>0; manifesto PK(date,version), members array, sem DELETE e reversão protegida.
## US3 — Vínculo de acesso
Teste independente: apenas admin associa; concorrência não duplica motorista; revogação impede novas leituras.
- [x] T004 [US3] Testar e implementar vínculo em backend/test/integration/consultation.spec.ts e backend/src/operation/{application/consultation-ports.ts,infrastructure/consultation-queries.ts,application/consultation.service.ts}.
## US1 — Visão administrativa
Teste independente: contagens, origens, pendências e comunicação coerentes, com janela Q1.
- [x] T005 [US1] Testar consulta consolidada em backend/test/integration/consultation.spec.ts e implementar visão transacional em backend/src/operation/application/{operation.service.ts,consultation.service.ts}.
## US2 — Atribuições e passageiros
Teste independente: lista confirmada por sentido; cancelado excluído; grupo alterado não transfere automaticamente; sem acesso alheio.
- [x] T006 [US2] Registrar manifesto na confirmação e testar compatibilidade com planos anteriores em backend/src/operation/application/operation.service.ts e backend/test/integration/consultation.spec.ts.
- [x] T007 [US2] Testar/implementar leitura do motorista e janela em backend/src/operation/application/consultation.service.ts e backend/test/integration/consultation.spec.ts.
## Contratos e entrega
- [x] T008 Testar HTTP/autorização em backend/test/e2e/consultation.e2e-spec.ts e compor backend/src/operation/http/consultation.controller.ts e backend/src/registry/registry.module.ts.
- [x] T009 Executar regressão, build/lint/tipos, migrações dev/test; atualizar specs/014-consultas-operacionais/{tasks.md,verification.md}, README.md, AGENTS.md e docs/.
## Dependências e estratégia
T001 → T002/T003 → US3 → US1 → US2 → HTTP → T009. Executar fatias teste/comportamento sequencialmente. Casos puros e revisão de contrato poderiam ocorrer independentemente; sem agentes para evitar coordenação. Primeiro vínculo e visão administrativa verificáveis; depois publicar listas filtradas. Mesmas interfaces de teste dos incrementos anteriores, nenhuma aprovação adicional por tarefa.
