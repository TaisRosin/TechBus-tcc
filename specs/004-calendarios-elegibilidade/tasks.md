# Tarefas B05
Fonte: spec, plan, research, data-model, contracts/http. Execução sequencial autorizada por Taís. Sem paralelismo necessário.

## Preparação
- [x] T001 Fechar decisão/checklist e preparar artefatos Spec Kit em specs/004-calendarios-elegibilidade/.
## US1 — Calendário
- [x] T002 Testar precedência e validação em backend/test/unit/calendar.spec.ts, implementar domínio em backend/src/registry/domain/calendar.ts.
- [x] T003 Testar manutenção/revisões no PostgreSQL em backend/test/integration/calendar.spec.ts; criar migração 1792900000000-university-calendar.ts.
- [x] T004 Implementar portas, adaptador e CalendarService em backend/src/registry/{application,infrastructure}/.
- [x] T005 Testar e integrar HTTP protegido em backend/test/e2e/calendar.e2e-spec.ts e backend/src/registry/{http,registry.module.ts}.
## US2 — Elegibilidade
- [x] T006 Testar avaliação habitual/extra, cadastro, datas e horário em backend/test/unit/calendar.spec.ts; implementar função de domínio.
- [x] T007 Integrar EligibilityService transacional e Clock em backend/src/registry/application/eligibility.service.ts; verificar dados reais em test/integration/calendar.spec.ts.
## US3 — Correções
- [x] T008 Testar correção imediata, revisão concorrente semana/exceção e preservação dos dados em backend/test/integration/calendar.spec.ts.
## Finalização
- [x] T009 Verificar migração, permissões, regressão completa/build/lint/types e registrar specs/004-calendarios-elegibilidade/verification.md.
- [x] T010 Atualizar docs/decisoes.md, requisitos, fluxos, API, dados, backlog, plano, README.md e AGENTS.md; conferir links e tarefas.

Dependências: T001 → T002 → T003/T004 → T005 → T006/T007 → T008 → T009/T010. RED antes de cada fatia; execução conjunta dos pares indica teste antes do código, sem implementação paralela. Sem commit/push automático.
