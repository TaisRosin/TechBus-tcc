# Tarefas — agendador operacional

## Phase 1: Setup
- [X] T001 Conferir decisões B08/B14 e registrar spec/plan/research/data-model/contracts em specs/023-agendador-operacional/ (FR001–FR006).

## Phase 2: Foundation
- [X] T002 Escrever testes de lifecycle, ativação, concorrência e falhas em backend/test/unit/operational-scheduler.spec.ts antes da implementação (FR003–FR005).
- [X] T003 Implementar executor em backend/src/messaging/application/operational-scheduler.ts com portas existentes e falhas isoladas (FR001/FR003/FR005).

## Phase 3: US1 — consultas e lembretes
Aceite: último horário pertinente, elegibilidade e uma tentativa, inclusive sob concorrência/reinício.
- [X] T004 Escrever integração com banco isolado em backend/test/integration/messages.spec.ts para horários, recuperação, falta de resposta, allowlist e falhas (FR001–FR004/SC001–SC003).
- [X] T005 Isolar preparação por aluno em backend/src/messaging/application/message.service.ts e testar continuidade após falha (FR005/SC001).

## Phase 4: US2 — fechamento
Aceite: fecha após17h, informa volta padrão, não confirma silêncio nem restaura cancelamento.
- [X] T006 Verificar fechamento e retomada sem restaurar cancelamento na suíte integration/messages.spec.ts, reutilizando B08 (FR002/FR003/SC002).

## Phase 5: US3 — controle
Aceite: configuração estrita desativada por padrão, launcher isolado, nenhuma nova API pública.
- [X] T007 Integrar flag/provider em config/environment.ts, app.module.ts, registry/registry.module.ts e scripts/panel-backend.cjs; documentar exemplos de ambiente (FR004/SC003).

## Phase 6: validação
- [X] T008 Executar tipos/lint/build/regressão; registrar verification.md e atualizar estado/AGENTS/README/docs pertinentes (FR006/SC004).
- [X] T009 Conferir análise e convergência Spec Kit; preservar ensaio real e hospedagem como próximos passos (FR001–FR006).

Dependências: T001→T002→T003; T004→T005→T006; T007→T008→T009. Testes antes das mudanças de comportamento. Trabalho sequencial por compartilhar serviços e banco; sem agentes delegados. Documentação pode ser revisada enquanto verificações sem mutação executam.
