# Feature Specification: B17 — revisão integrada do backend
**Feature Branch**: codex/001-base-backend (preservada)
**Created**: 2026-10-26
**Status**: Autorizada pelo pedido de iniciar B17; sem nova decisão de negócio
**Input**: Revisar backend B02–B16 antes das integrações reais.
## User Scenarios & Testing
### User Story 1 — Demonstrar a operação integrada (Priority: P1)
Como equipe, quero verificar que a mesma informação permanece coerente desde o contato até as listas e itinerários.
**Why this priority**: testes isolados não bastam para demonstrar os efeitos entre módulos.
**Independent Test**: cenário sintético contínuo atravessa mensagens, recebimento durável, fechamento, planejamento e consulta sem serviços reais.
**Acceptance Scenarios**:
1. Falha de envio aparece na visão administrativa sem modificar a confirmação; sem resposta nunca aumenta demanda.
2. Resposta recebida antes das 17h e interpretada depois mantém o recebimento autoritativo, volta padrão e origem coerentes; reentrega não duplica efeitos.
3. Planejamento confirmado publica passageiros por trecho; correção exige revisão e novo local sem ordem impede itinerário completo, sem excluir a demanda.
4. Cancelamento recebido antes das 22h e interpretado depois retira volta e parada vazia, preserva ida e alocação; comando recebido às 22h é rejeitado.
### User Story 2 — Verificar limites e permissões (Priority: P1)
Como responsável pelo sistema, quero evidências de que concorrência, perfis e pendências não contornam regras já aprovadas.
**Why this priority**: integrações futuras não podem ampliar acesso ou reabrir prazos.
**Independent Test**: suíte existente e casos adicionais identificados na revisão negam edições e leituras indevidas, preservam revisões e impedem duplicações.
**Acceptance Scenarios**:
1. Cobertura de último admin, identidade ativa, acesso do motorista, vínculos e publicação fica rastreada.
2. Serviços externos indisponíveis permanecem explícitos, sem bypass de autenticação, validação de área ou envio real.
3. Defeito comprovado recebe teste de regressão e correção limitada às decisões vigentes; lacuna de negócio bloqueante é encaminhada à usuária.
### User Story 3 — Conhecer prontidão e lacunas (Priority: P1)
Como Taís, quero saber quais regras estão verificadas localmente e o que ainda falta para integrar o sistema.
**Why this priority**: conclusão local não significa produto em produção.
**Independent Test**: matriz cobre R01–R22/O01 com evidências existentes, novos casos e limites por requisito.
**Acceptance Scenarios**:
1. Cada requisito tem referência verificável e classificação local/integração futura; não inventar resultado acadêmico.
2. Backend local só é considerado revisado quando regressão/build/tipos/lint passam e não resta defeito bloqueante conhecido dentro desse escopo.
3. Supabase Auth, WhatsApp/IA, geografia, agendador real, infraestrutura, frontend e avaliação acadêmica permanecem explicitamente separados.
### Edge Cases
Interpretação após cortes; reentrega concorrente; falha/incerteza de envio; correção após confirmação; local novo não ordenado; substituição do plano; motorista revogado; operação anterior ainda vigente; dados sintéticos preservados/limpos com segurança.
## Requirements
### Functional Requirements
- **FR-001**: Rastrear R01–R22/O01 a código/testes e limites sem duplicar especificações anteriores.
- **FR-002**: Exercitar integração entre mensagens, jornada, fechamento, planejamento, consultas e itinerários com dados sintéticos.
- **FR-003**: Verificar permissões, concorrência e prazos a partir das decisões aprovadas, reutilizando regressão existente.
- **FR-004**: Corrigir defeitos comprovados com teste, sem alterar regras arquiteturais ou conectar serviços reais.
- **FR-005**: Registrar pendências de B18/B19/B20 e critérios de prontidão local honestos.
### Key Entities
Matriz de cobertura, evidência de validação, ocorrência técnica e pendência de integração; nenhuma nova entidade operacional presumida.
## Success Criteria
- **SC-001**: Todos os 23 itens R01–R22/O01 classificados com evidência e limite explícito.
- **SC-002**: Fluxo contínuo mantém contagens/listas coerentes, inclusive sob reentrega e cancelamento tardio de interpretação.
- **SC-003**: Todos os testes relevantes passam, sem defeitos bloqueantes conhecidos no escopo local ao concluir.
- **SC-004**: Nenhum serviço real é utilizado e os dados sintéticos são removidos sem perda de registros anteriores.
## Assumptions
Fontes: [requisitos](../../docs/requisitos.md), [decisões](../../docs/decisoes.md), [backlog](../../docs/backlog.md), constituição e verificações B02–B16. O pedido autoriza revisão, testes e correções dentro das decisões vigentes. Não há nova dúvida de negócio inicial; encontrar uma não autoriza inventar regra. Prontidão local não comprova integração externa, carga de produção ou resultado acadêmico.
