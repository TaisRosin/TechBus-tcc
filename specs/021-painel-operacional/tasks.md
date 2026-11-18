# Tarefas — painel operacional antecipado

Entrada: [spec.md](spec.md), [plan.md](plan.md). Autorização 04/11/2026. As tarefas B18.4 não bloqueiam este incremento; não marcá-las concluídas.

## Preparação
- [X] T001 Registrar corte de escopo e nova ordem em docs/ e specs/020-contexto-conversa/; conferir contratos reais de backend/src/.
- [X] T002 Criar frontend/package.json, lockfile, Vite/TypeScript/Tailwind e componentes base em frontend/src/components/ui/.

## US1 — acesso
- [X] T003 Escrever testes de sessão/recarga/401/perfil em frontend/test/panel.spec.ts e implementar frontend/src/lib/api.ts e frontend/src/App.tsx.

## US2 — preparação operacional
- [X] T004 Implementar formulários de alunos/vigências/locais padrão em frontend/src/pages/students.tsx e calendários em calendar.tsx; validar requests/erros no navegador.
- [X] T005 Implementar grupos/pontos/regiões e frota/motoristas/disponibilidade em frontend/src/pages/catalogs.tsx, com versões e referências por seleção.

## US3 — operação
- [X] T006 Implementar visão do dia, filtros e correção com revisão explícita em frontend/src/pages/operation.tsx; testar payload, conflito e nenhuma gravação em carregamento falho.

## US4 — planejamento e consultas
- [X] T007 Implementar planejamento/manual, mensagens e viagens do motorista em frontend/src/pages/; não habilitar retry incerto ou publicação com pendência.

## Validação
- [X] T008 Executar tipos/build e testes de navegador desktop/mobile, verificar proxy com backend isolado e registrar evidências em verification.md.
- [X] T009 Entregar scripts locais, frontend/README.md e atualizar estado/tarefas com limites e próximas fatias, sem afirmar fluxo WhatsApp completo.

Ordem: T001 → T002 → T003 → T004/T005 → T006/T007 → T008 → T009. Preparação de telas independentes pode ocorrer após estabilizar contratos; mesmo agente, sem execução paralela de testes no banco. MVP: login + cadastros + operação; expansão incremental de planejamento, sem esperar automações restantes. TDD nas fronteiras críticas conforme constituição.
