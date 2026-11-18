# Tarefas B18.4 — contexto de conversa

**Repriorização autorizada em 04/11/2026:** [painel B19.1](../021-painel-operacional/tasks.md) e pontos fixos foram antecipados e concluídos. B18.4 retomado em 05/11 com esclarecimentos explícitos e pendências conservadoras. Cálculo automático de rotas e sugestão da quarta utilização foram retirados desta entrega.

Entrada: [spec.md](spec.md), [plan.md](plan.md). Gerado em 04/11/2026 pelo fluxo speckit-tasks. Retomado em 05/11 após aprovação de uma pergunta e depois equipe. Nenhum extensions.yml/hook registrado. Organização ajustada: preparação/encerramento em context-store.ts; testes de cadeia e despacho reunidos em conversation-context.spec.ts; HTTP reaproveita interpretation.e2e-spec.ts. Isso evita duplicação de fixtures, preservando os cenários de aceite.

## Phase 1: Setup

- [X] T001 Investigar evidência de resposta citada no conector/projeção e registrar suporte, limites e exemplos sintéticos em specs/020-contexto-conversa/research.md (FR001/FR002).
- [X] T002 Definir vínculo causal, estados, prazo de validade e encerramento do esclarecimento em specs/020-contexto-conversa/contracts/context.md; reunir decisões de negócio faltantes em uma mensagem antes do trabalho dependente, atualizar spec.md/plan.md e detalhar data-model.md sem presumir prova pelo último envio (FR001–FR007).

## Phase 2: Foundational

- [X] T003 Escrever testes de persistência/rollback/unicidade em backend/test/integration/conversation-context.spec.ts antes da implementação, usando PostgreSQL isolado e a skill de dados (FR001/FR005/FR008).
- [X] T004 Implementar migração versionada em backend/src/infrastructure/database/migrations/ e portas/persistência em backend/src/interpretation/context-store.ts conforme contrato T002; preservar registros existentes e documentar o nome exato da migração em data-model.md (FR001/FR005).

## Phase 3: US1 — resposta vinculada (P1, MVP)

Teste independente: sim/não sem vínculo não altera jornada; resposta vinculada atua somente no trecho perguntado e não passa por cima de prazo, ordem ou revisão.

- [X] T005 [US1] Escrever casos públicos em backend/test/unit/conversation-context.spec.ts para ausência de vínculo, pergunta correta/incorreta, outro aluno/instância/dia, pergunta superada e ida/volta distintas (FR001–FR004; SC001/SC003).
- [X] T006 [US1] Projetar e persistir somente evidência autenticada de resposta em backend/src/whatsapp/domain.ts e backend/src/whatsapp/store.ts; testar conflito/reentrega sem modificar received_at nem promover ordenação por citação (FR001/FR002/FR003).
- [X] T007 [US1] Implementar resolução conservadora em backend/src/interpretation/context.ts e conectar backend/src/interpretation/service.ts, preservando regras antes de Gemini e comando validado completo (FR002/FR003/FR004/FR007).
- [X] T008 [US1] Verificar aplicação em backend/test/integration/conversation-context.spec.ts: resposta após prazo, interpretação atrasada, virada de dia, revisão anterior e duplicata; registrar resultados em specs/020-contexto-conversa/verification.md (SC001/SC003).

## Phase 4: US2 — esclarecimento (P1)

Teste independente: ambiguidade prepara pergunta objetiva uma vez, pedido claro não reconfirma, envio incerto não se repete e resposta suficiente resolve somente o pedido validado.

- [X] T009 [US2] Escrever cenários em backend/test/unit/conversation-context.spec.ts e backend/test/integration/conversation-context.spec.ts para ambiguidade, pergunta já aberta, contexto alterado, concorrência, timeout e interrupção (FR004/FR005; SC002).
- [X] T010 [US2] Implementar preparação/encerramento da pergunta em backend/src/interpretation/context-store.ts conforme T002, preservando jornada válida e encaminhando dúvida persistente sem ciclos infinitos (FR004/FR005).
- [X] T011 [US2] Integrar despacho persistente ao módulo backend/src/whatsapp/whatsapp.module.ts por backend/src/whatsapp/clarification-dispatcher.ts, seguindo o padrão de reserva do despachante de recibos, com contrato próprio de pergunta, revalidação/allowlist e sem retry incerto (FR005; SC002).
- [X] T012 [US2] Conectar resposta de esclarecimento em backend/src/interpretation/processor.ts, sem retroagir recebimento nem resolver mensagens antigas indiscriminadamente; verificar cadeia com transporte substituto em backend/test/integration/conversation-context.spec.ts (FR003–FR005).

## Phase 5: US3 — revisão da equipe (P1)

Teste independente: equipe autorizada consulta/revisa pendência com justificativa; motorista é bloqueado; correção não produz envio e cancelamento posterior válido permanece aceito.

- [X] T013 [US3] Escrever cenários de autorização/diagnóstico em backend/test/e2e/interpretation.e2e-spec.ts e revisão em backend/test/integration/conversation-context.spec.ts (FR006; SC003).
- [X] T014 [US3] Expor estado/motivo da conversa nas consultas do dia em backend/src/whatsapp/service.ts e integrar revisão explícita aos serviços existentes em backend/src/journey/, preservando evidências e silêncio de correções administrativas (FR006).

## Phase 6: Polish e validação

- [X] T015 Executar tipos, lint, build e testes unitários/integration/e2e isolados; registrar totais, falhas e limites em specs/020-contexto-conversa/verification.md, sem chamadas reais ou reapresentar ensaio antigo como atual (FR008; SC004).
- [X] T016 Executar speckit-analyze e, após implementação, speckit-converge sobre specs/020-contexto-conversa/; conferir rastreabilidade FR001–FR008/SC001–SC004 e atualizar README.md, AGENTS.md e docs/ pertinentes, mantendo B18.3/T019 e os testes manuais adiados abertos.

## Dependências e estratégia

T001 → T002 → T003 → T004 → US1 (T005–T008) → US2 (T009–T012) → US3 (T013–T014) → T015 → T016. Dentro de cada fatia: teste falhando → implementação mínima → refatoração. Migração criada após contrato e leitura da skill PostgreSQL; esquema físico em data-model.md.

Casos US1/US2 reunidos em conversation-context.spec.ts; HTTP US3 reaproveita interpretation.e2e-spec.ts. Implementações e testes de banco sequenciais. Não houve delegação de agentes.

## Depois deste incremento

1. Respostas para rejeições/inelegibilidade/mídia, conforme diagnóstico dos fluxos restantes.
2. Alterações de padrões pela conversa ficam para evolução posterior; geografia e quarta utilização foram retiradas da entrega. Resolução de nomes de pontos fixos está incluída neste incremento.
3. Executor dos horários e fechamento, com recuperação segura.
4. Retomar casos manuais de Taís e B18.3/T019 antes de declarar integração concluída.
5. Hospedagem e avaliação B20, conforme docs/plano-desenvolvimento.md. Painel e itinerário manual já existem; cálculo automático de rotas foi retirado da entrega.

## Phase 7: Convergence

- [X] T017 Completar testes de vínculo entre instâncias e reentrega com citação alterada em backend/test/integration/conversation-context.spec.ts, verificando recebimento original e conflito sem aplicar jornada (FR001/FR002/FR003; partial).
- [X] T018 Atualizar referências históricas de planejamento e caminho do despachante em tasks.md; consolidar evidências finais e cobertura FR/SC em verification.md (T016; partial).
