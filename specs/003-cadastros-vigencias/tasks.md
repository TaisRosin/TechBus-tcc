# Tarefas B04
Entrada: spec.md, plan.md, research.md, data-model.md, contracts/http.md. Execução sequencial autorizada; TDD nas regras críticas. Cada história tem cenário independente e utiliza base compartilhada.

## Preparação
- [x] T001 Registrar decisões e artefatos SDD em specs/003-cadastros-vigencias/ e selecionar .specify/feature.json.
## US1 — Cadastros (P1)
- [x] T002 [US1] Testar primeiro validação cadastral em backend/test/unit/registry.spec.ts.
- [x] T003 [US1] Implementar domínio/validação em backend/src/registry/domain/registry.ts.
- [x] T004 [US1] Escrever testes de persistência/atomicidade/telefone em backend/test/integration/registry.spec.ts.
- [x] T005 [US1] Criar migração backend/src/infrastructure/database/migrations/1792800000000-student-registry.ts e adaptar regressão de migrações B03.
- [x] T006 [US1] Implementar portas/serviço e adaptador em backend/src/registry/{application,infrastructure}/.
- [x] T007 [US1] Testar HTTP e autorização em backend/test/e2e/registry.e2e-spec.ts e integrar módulo/controller em backend/src/registry/ e backend/src/app.module.ts.
## US2 — Vigências (P1)
- [x] T008 [US2] Testar datas inclusivas, inversão, edição e concorrência em backend/test/{unit,integration}/registry.spec.ts.
- [x] T009 [US2] Implementar renovação/edição com lock e revisão em backend/src/registry/{application,infrastructure}/ e rotas em http/.
## US3 — Bloqueios cadastrais (P2)
- [x] T010 [US3] Testar relógio, inatividade e zero dias em backend/test/unit/registry.spec.ts e persistência sem remoção em test/integration/registry.spec.ts.
- [x] T011 [US3] Expor verificação interna com Clock em backend/src/registry/application/enrollment-gate.ts.
## Finalização
- [x] T012 Validar migração/reversão segura no PostgreSQL test e aplicar em dev; executar regressão/build/lint/types e registrar em specs/003-cadastros-vigencias/verification.md.
- [x] T013 Atualizar README.md, AGENTS.md e docs/{decisoes,requisitos,modelo-dados,api,backlog,plano-desenvolvimento}.md com resultado e limites; verificar links.

Dependências: T001 → T002–T007 → T008–T009 → T010–T011 → T012–T013. T005 contém estrutura compartilhada de contratos necessária para cadastro atômico; US2 amplia manutenção de vigências. Sem trabalho paralelo necessário. Testes de cada fatia falham antes de sua implementação; evidências em verification.md.
