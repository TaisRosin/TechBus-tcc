# Tasks — B14
Fontes: [spec](spec.md), [plan](plan.md), [contrato](contracts/http.md). Sequencial, sem agentes ou serviços externos.
## Preparação
- [x] T001 Incorporar Q1/Q2 e elaborar artefatos em specs/013-mensagens-agendamentos/; verificar constituição/ignores.
## Fundamentos
- [x] T002 Testar e implementar slots/pendências/textos em backend/test/unit/messages.spec.ts e backend/src/messaging/domain/messages.ts.
- [x] T003 Testar e criar migração, portas/consultas e marcador de extra em backend/test/integration/messages-migration.spec.ts, backend/src/infrastructure/database/migrations/1793700000000-messages.ts, backend/src/messaging/{application/ports.ts,infrastructure/message-queries.ts} e backend/src/journey/.
## US1 — Preparação pertinente
Teste independente: só slot mais recente, elegíveis e trechos pendentes; extras iniciados e não jornadas manuais.
- [x] T004 Testar e implementar preparação/rotina em backend/test/integration/messages.spec.ts e backend/src/messaging/application/message.service.ts.
## US2 — Envio e falhas
Teste independente: concorrência não duplica; falha preserva jornada e retry revalida.
- [x] T005 Testar e implementar claim, porta simulável e finalização em backend/test/integration/messages.spec.ts e backend/src/messaging/application/.
- [x] T006 Validar reenvio versionado, falhas de persistência e resultado incerto em backend/test/integration/messages.spec.ts.
## US3 — Rotina integrada
Teste independente: fechar repetidamente não duplica aviso nem restaura cancelamento.
- [x] T007 Integrar fechamento B08 e validar aviso atual/cancelamento em backend/src/messaging/application/message.service.ts e backend/test/integration/messages.spec.ts.
- [x] T008 Expor leitura/retry administrativo e testar autorização em backend/src/messaging/http/message.controller.ts, backend/src/registry/registry.module.ts e backend/test/e2e/messages.e2e-spec.ts.
## Finalização
- [x] T009 Executar build, testes completos, lint, tipos e migrações dev/test; registrar verification.md e atualizar README.md, AGENTS.md e docs/.
## Dependências
T001 → T002/T003 → US1 → US2 → US3 → T009. Testes antes do comportamento de cada fatia. Revisão do contrato e casos puros seriam independentes, mas execução permanece sequencial para reduzir coordenação. Sem pesquisa de versões novas ou decisões arquiteturais adicionais.
