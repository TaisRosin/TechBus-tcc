# Tarefas B06
Spec/plan/research/data-model/contracts aprovados; execução sequencial, sem commit automático.

## Preparação
- [x] T001 Registrar decisões e artefatos SDD em specs/005-grupos-locais/.
## US1 — Cadastros
- [x] T002 Testar validação em backend/test/unit/locations.spec.ts e implementar backend/src/registry/domain/locations.ts.
- [x] T003 Testar vínculos no PostgreSQL em backend/test/integration/locations.spec.ts; criar migração 1793000000000-local-places.ts.
- [x] T004 Implementar portas, queries e serviço em backend/src/registry/{application/location-ports.ts,application/location.service.ts,infrastructure/location-queries.ts}; integrar RegistryStore.
## US2 — Locais e padrões
- [x] T005 Testar endereço dentro/fora/indeterminado e identidade canônica em test/integration/locations.spec.ts; implementar AddressValidator e resolução sem efeitos em padrão.
- [x] T006 Testar preservação, revisão, origem/consentimento e independência dos sentidos; implementar padrões no LocationService.
- [x] T007 Testar HTTP/RBAC/validador normal indisponível em backend/test/e2e/locations.e2e-spec.ts; integrar controller e módulo.
## US3 — Desativação
- [x] T008 Testar referências inativas, ajuste manual e concorrência em backend/test/integration/locations.spec.ts; implementar avaliação de usabilidade.
## Fechamento
- [x] T009 Validar migração/reversão/permissões, aplicar dev e executar regressão/build/lint/types; registrar specs/005-grupos-locais/verification.md.
- [x] T010 Atualizar README.md, AGENTS.md e docs/; conferir links, dados sintéticos e tarefas.

Dependências: T001 → T002 → T003/T004 → T005 → T006 → T007 → T008 → T009/T010. Teste RED antes de implementação por fatia. Interfaces verificadas: domínio público, serviço com PostgreSQL real e HTTP; banco isolado e fixtures sintéticos, sem serviços reais.
