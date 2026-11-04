# Tarefas B18.4 — contexto de conversa

Entrada: [spec.md](spec.md), [plan.md](plan.md). Gerado em 04/11/2026 pelo fluxo speckit-tasks, com setup-tasks.ps1 -Json e template local. Nenhum extensions.yml/hook registrado. Todas as tarefas abaixo estão pendentes; este pedido preparou o planejamento, não implementou conversa.

## Phase 1: Setup

- [ ] T001 Investigar evidência de resposta citada no conector/projeção e registrar suporte, limites e exemplos sintéticos em specs/020-contexto-conversa/research.md (FR001/FR002).
- [ ] T002 Definir vínculo causal, estados, prazo de validade e encerramento do esclarecimento em specs/020-contexto-conversa/contracts/context.md; reunir decisões de negócio faltantes em uma mensagem antes do trabalho dependente, atualizar spec.md/plan.md e detalhar data-model.md sem presumir prova pelo último envio (FR001–FR007).

## Phase 2: Foundational

- [ ] T003 Escrever testes de persistência/rollback/unicidade em backend/test/integration/conversation-context.spec.ts antes da implementação, usando PostgreSQL isolado e a skill de dados (FR001/FR005/FR008).
- [ ] T004 Implementar migração versionada em backend/src/infrastructure/database/migrations/ e portas/persistência em backend/src/interpretation/context-store.ts conforme contrato T002; preservar registros existentes e documentar o nome exato da migração em data-model.md (FR001/FR005).

## Phase 3: US1 — resposta vinculada (P1, MVP)

Teste independente: sim/não sem vínculo não altera jornada; resposta vinculada atua somente no trecho perguntado e não passa por cima de prazo, ordem ou revisão.

- [ ] T005 [US1] Escrever casos públicos em backend/test/unit/conversation-context.spec.ts para ausência de vínculo, pergunta correta/incorreta, outro aluno/instância/dia, pergunta superada e ida/volta distintas (FR001–FR004; SC001/SC003).
- [ ] T006 [US1] Projetar e persistir somente evidência autenticada de resposta em backend/src/whatsapp/domain.ts e backend/src/whatsapp/store.ts; testar conflito/reentrega sem modificar received_at nem promover ordenação por citação (FR001/FR002/FR003).
- [ ] T007 [US1] Implementar resolução conservadora em backend/src/interpretation/context.ts e conectar backend/src/interpretation/service.ts, preservando regras antes de Gemini e comando validado completo (FR002/FR003/FR004/FR007).
- [ ] T008 [US1] Verificar aplicação em backend/test/integration/conversation-context.spec.ts: resposta após prazo, interpretação atrasada, virada de dia, revisão anterior e duplicata; registrar resultados em specs/020-contexto-conversa/verification.md (SC001/SC003).

## Phase 4: US2 — esclarecimento (P1)

Teste independente: ambiguidade prepara pergunta objetiva uma vez, pedido claro não reconfirma, envio incerto não se repete e resposta suficiente resolve somente o pedido validado.

- [ ] T009 [US2] Escrever cenários em backend/test/unit/clarification.spec.ts e backend/test/integration/clarification.spec.ts para ambiguidade, pergunta já aberta, contexto alterado, concorrência, timeout e interrupção (FR004/FR005; SC002).
- [ ] T010 [US2] Implementar preparação/encerramento da pergunta em backend/src/interpretation/clarification.ts conforme T002, preservando jornada válida e encaminhando dúvida persistente sem ciclos infinitos (FR004/FR005).
- [ ] T011 [US2] Integrar despacho persistente ao módulo backend/src/whatsapp/whatsapp.module.ts e à infraestrutura de backend/src/whatsapp/acknowledgement-dispatcher.ts, com contrato próprio de pergunta, reserva/revalidação/allowlist e sem retry incerto (FR005; SC002).
- [ ] T012 [US2] Conectar resposta de esclarecimento em backend/src/interpretation/processor.ts, sem retroagir recebimento nem resolver mensagens antigas indiscriminadamente; verificar cadeia com transporte substituto em backend/test/integration/clarification.spec.ts (FR003–FR005).

## Phase 5: US3 — revisão da equipe (P1)

Teste independente: equipe autorizada consulta/revisa pendência com justificativa; motorista é bloqueado; correção não produz envio e cancelamento posterior válido permanece aceito.

- [ ] T013 [US3] Escrever cenários de autorização/diagnóstico em backend/test/e2e/conversation-context.e2e-spec.ts e revisão em backend/test/integration/conversation-context.spec.ts (FR006; SC003).
- [ ] T014 [US3] Expor estado/motivo da conversa nas consultas do dia em backend/src/whatsapp/service.ts e integrar revisão explícita aos serviços existentes em backend/src/journey/, preservando evidências e silêncio de correções administrativas (FR006).

## Phase 6: Polish e validação

- [ ] T015 Executar tipos, lint, build e testes unitários/integration/e2e isolados; registrar totais, falhas e limites em specs/020-contexto-conversa/verification.md, sem chamadas reais ou reapresentar ensaio antigo como atual (FR008; SC004).
- [ ] T016 Executar speckit-analyze e, após implementação, speckit-converge sobre specs/020-contexto-conversa/; conferir rastreabilidade FR001–FR008/SC001–SC004 e atualizar README.md, AGENTS.md e docs/ pertinentes, mantendo B18.3/T019 e os testes manuais adiados abertos.

## Dependências e estratégia

T001 → T002 → T003 → T004 → US1 (T005–T008) → US2 (T009–T012) → US3 (T013–T014) → T015 → T016. Dentro de cada fatia: teste falhando → implementação mínima → refatoração. Não criar migração antes do contrato e da leitura da skill PostgreSQL. Não há schema físico definitivo nesta fase.

Oportunidades independentes após T002: preparação de casos unitários US1 em conversation-context.spec.ts e US2 em clarification.spec.ts; casos HTTP US3 podem ser preparados contra contrato estabilizado. Implementações e testes de banco permanecem sequenciais. Não foram marcadas tarefas inteiras com [P] por compartilharem contratos/persistência; não há delegação de agentes.

## Depois deste incremento

1. Respostas para rejeições/inelegibilidade/mídia, conforme diagnóstico dos fluxos restantes.
2. Resolução de locais e geografia real; ligação de padrões/quarta utilização à conversa.
3. Executor dos horários e fechamento, com recuperação segura.
4. Retomar casos manuais de Taís e B18.3/T019 antes de declarar integração concluída.
5. Rotas reais ou contingência aprovada, painel B19 e avaliação B20, conforme docs/plano-desenvolvimento.md. A pesquisa de geografia/rotas deve começar cedo; esta lista não constitui implementação desses incrementos.
