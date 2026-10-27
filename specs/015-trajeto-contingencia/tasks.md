# Tasks — B16
## Preparação
- [x] T001 Registrar Q1/Q2, pesquisa e desenho em specs/015-trajeto-contingencia/{spec.md,plan.md,research.md,data-model.md,contracts/http.md,quickstart.md}.
## Fundamentos
- [x] T002 Testar filtragem/pendência/IDs únicos em backend/test/unit/itinerary.spec.ts e implementar backend/src/itinerary/domain/itinerary.ts (no máximo 1000 locais).
- [x] T003 Testar restrições/privilégios/reversão em backend/test/integration/itinerary-migration.spec.ts e criar backend/src/infrastructure/database/migrations/1793900000000-itineraries.ts: PK/FKs, versões >0, uuid[] sem nulos/duplicados, cardinalidade <=1000, token hexadecimal de 64 caracteres; sem DELETE, reversão protegida.
## US1 — Ordem e publicação
Teste independente: A/B/C filtra A/C, novo local não é inserido; edição concorrente conflita e preview obsoleto não publica.
- [x] T004 [US1] Testar e implementar edição versionada da ordem em backend/test/integration/itinerary.spec.ts e backend/src/itinerary/{application/ports.ts,infrastructure/itinerary-queries.ts,application/itinerary.service.ts}; compor backend/src/registry/{application/ports.ts,infrastructure/postgres-registry-store.ts}.
- [x] T005 [US1] Testar/implementar prévia, publicação explícita completa e revisão em backend/test/integration/itinerary.spec.ts e backend/src/itinerary/application/itinerary.service.ts, preservando demanda/ocupações.
## US2 — Consulta do motorista
Teste independente: só própria atribuição; mudança padrão mantém ordem publicada, cancelamento filtra, plano substituído exige publicação compatível.
- [x] T006 [US2] Reutilizar leitura transacional B15 em backend/src/operation/application/consultation.service.ts e testar/implementar itinerário protegido em backend/src/itinerary/application/itinerary.service.ts e backend/test/integration/itinerary.spec.ts.
- [x] T007 [US2] Testar contratos HTTP em backend/test/e2e/itinerary.e2e-spec.ts e compor backend/src/itinerary/http/itinerary.controller.ts e backend/src/registry/registry.module.ts.
## US3 — Automático preparado
Teste independente: padrão indisponível e resposta externa só aceita permutação exata, sem PII/publicação automática.
- [x] T008 [US3] Testar contrato simulado em backend/test/unit/routing.spec.ts e implementar backend/src/itinerary/application/routing.ts; registrar limitações em specs/015-trajeto-contingencia/research.md.
## Entrega
- [x] T009 Executar regressão, build/lint/tipos, migrações dev/test e registrar evidências em specs/015-trajeto-contingencia/verification.md.
- [x] T010 Atualizar README.md, AGENTS.md, docs/ e specs/015-trajeto-contingencia/tasks.md; conferir links e estado final.
## Dependências e estratégia
T001 → T002/T003 → US1 → US2 → US3 → entrega. TDD em fatias verticais; testes no serviço/HTTP/domínio público e PostgreSQL. US1 é primeiro incremento demonstrável. Pesquisa US3 pode ocorrer em paralelo à análise US1; implementação sequencial conforme preferência da usuária. Dentro de US1 revisão de restrições e contrato é independente; US2 depende da publicação US1; US3 pode ser testada isoladamente sem integração real. Nenhuma aprovação adicional por tarefa.
