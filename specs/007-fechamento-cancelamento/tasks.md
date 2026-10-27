# Tasks — B08
## Preparação
- [x] T001 Incorporar confirmação e concluir spec/plano/dados/contratos em specs/007-fechamento-cancelamento/.
## Fundação
- [x] T002 Criar teste crítico de fechamento em backend/test/unit/journey-closing.spec.ts, observar falha e implementar regras em backend/src/journey/domain/closing.ts.
- [x] T003 Criar migração aditiva backend/src/infrastructure/database/migrations/1793200000000-journey-closing.ts: closed_sequence/cancel_sequence integer nullable >0; closure_base_state nullable em sem_resposta/indeciso; closure_issue text nullable; cancel_requested boolean NOT NULL DEFAULT false; ampliar somente volta com cancelado/padrao_fechamento. Verificar preservação/reversão segura em backend/test/integration/journey-closing-migration.spec.ts.
## US1 — Fechamento
Teste independente: somente ida confirmada elegível recebe padrão; repetir não muda resultado.
- [x] T004 [US1] Testar e implementar close por jornada, elegibilidade e lote paginado em backend/test/integration/journey-closing.spec.ts e backend/src/journey/{application/journey.service.ts,application/ports.ts,infrastructure/journey-queries.ts}.
## US2 — Cancelamento
Teste independente: somente volta confirmada sai da demanda no intervalo [17h,22h), ida preservada.
- [x] T005 [US2] Testar e implementar cancel_return e cortes duráveis em backend/test/unit/journey-closing.spec.ts, backend/test/integration/journey-closing.spec.ts e backend/src/journey/{domain/journey.ts,application/journey.service.ts}.
## US3 — Conciliação
Teste independente: interpretação tempestiva atrasada e fechamento em ambas as ordens produzem mesmo estado; cancelamento nunca é revertido.
- [x] T006 [US3] Testar e implementar estado anterior ao padrão, sequências independentes e cancelamento aguardando interpretação em backend/test/integration/journey-closing.spec.ts e backend/src/journey/application/journey.service.ts.
- [x] T007 [US3] Verificar concorrência e pendências de recibos sem interpretação em backend/test/integration/journey-closing.spec.ts e backend/src/journey/infrastructure/journey-queries.ts.
## Integração e entrega
- [x] T008 Preparar orientação fiel sobre padrão/cancelamento em backend/src/journey/domain/closing.ts e leitura administrativa existente; ajustar testes B07 afetados pela evolução B08 em backend/test/integration/journey.spec.ts e validar HTTP em backend/test/e2e/journey.e2e-spec.ts.
- [x] T009 Executar migrações dev/test locais, suíte completa/build/lint/tipos; registrar evidências em specs/007-fechamento-cancelamento/verification.md.
- [x] T010 Atualizar README.md, AGENTS.md, docs/{requisitos,fluxos,decisoes,backlog,api,modelo-dados,plano-desenvolvimento}.md e conferir links/progresso em specs/007-fechamento-cancelamento/tasks.md.

## Dependências e execução
T001 → T002 → T003 → US1 → US2 → US3 → T008 → T009 → T010. Ciclos teste falhando → implementação → teste passando por comportamento, execução sequencial autorizada. MVP técnico US1; entrega completa inclui US2/US3. Documentação pode ser revisada independentemente de testes após contratos estáveis; sem necessidade de agentes paralelos. Sem novas dependências, serviços reais, scheduler instalado ou commit automático.
