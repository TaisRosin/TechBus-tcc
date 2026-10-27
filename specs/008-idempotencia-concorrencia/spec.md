# Feature Specification: B09 — Idempotência e concorrência da jornada
**Created**: 2026-10-24
**Feature directory**: specs/008-idempotencia-concorrencia
**Status**: Sem novas dúvidas de negócio; continuidade autorizada, decisões existentes preservadas.
**Input**: Continuar após B08, consolidando proteções e preenchendo lacunas reais.

## User Scenarios & Testing
### US1 — Reentregar sem repetir efeitos (Priority: P1)
Aluno/equipe mantêm a informação válida mesmo que uma mensagem seja reentregue ou uma tentativa falhe.
**Why this priority**: Falhas não podem consumir comandos sem salvar a resposta nem duplicar efeitos.
**Independent Test**: Reentregar o mesmo recibo antes/depois dos cortes e simular falha durante sua aplicação.
**Acceptance Scenarios**:
1. Recebimento durável repetido conserva identidade, sequência e instante original; reentrega após o corte não altera sua tempestividade.
2. Recebimento que falhou antes da conclusão não existe como fato durável; nova tentativa usa seu próprio instante, sem retroagir prazo.
3. Falha entre alteração da jornada e registro do resultado desfaz ambos; retry aplica uma única vez.
4. Falha na conciliação de cancelamento pendente preserva o comando anterior e a intenção de cancelar para retomada íntegra.

### US2 — Concorrer sem sobrescrever informação válida (Priority: P1)
Reentregas/processamentos simultâneos preservam revisão válida e cancelamento, sem depender da velocidade da interpretação.
**Why this priority**: Consolidar invariantes já implementadas em B07/B08.
**Independent Test**: Processar duplicatas e revisões em conexões independentes, com relógio controlado.
**Acceptance Scenarios**:
1. Mesma identidade concorrente cria um recebimento e um efeito.
2. Evento interno comprovadamente anterior não vence revisão ordinária posterior; fechamento não restaura volta cancelada.
3. Entrada cuja ordem não foi comprovada fica pendente; ordem de chegada não é apresentada como prova de ordem do provedor.
4. Reentrega não promove recibo de ordem desconhecida para conhecido.

### US3 — Retomar fechamento com pendências visíveis (Priority: P2)
Equipe distingue execução do lote, falha técnica e necessidade de ajuste, sem tomar lote processado como planejamento concluído.
**Why this priority**: Impedir falsa conclusão quando há mensagens não interpretadas ou problema técnico isolado.
**Independent Test**: Executar lote com uma falha e outra jornada pendente, repetir após remover a falha.
**Acceptance Scenarios**:
1. Uma jornada com falha não impede processamento das demais; resultado identifica falha sem expor detalhe interno.
2. Resultado por jornada informa pendências e necessidade de ajuste; processamento não significa demanda definitivamente resolvida.
3. Reexecução após falha completa trabalho sem duplicar confirmações/cancelamentos.

### Edge Cases
Queda antes do commit de recebimento; falha entre gravações; concorrência de chaves iguais e distintas; reentrega após 17h/22h; ordem desconhecida; cancelamento aguardando interpretação; falha parcial de lote; repetição após perda da resposta ao chamador.

## Requirements
### Functional Requirements
- **FR-001**: Preservar atomicidade entre jornada, resultado e conciliação de cancelamento; resultado durável e estado aplicado não divergem após falha.
- **FR-002**: Deduplicar pelo identificador interno do evento/aluno e conservar instante durável original; manter contrato B07/B08 de primeira interpretação efetivada.
- **FR-003**: Proteger revisão mais recente e cancelamento sob concorrência e reexecução, respeitando cortes aprovados.
- **FR-004**: Oferecer entrada interna explícita de ordem desconhecida, sempre pendente até tratamento autorizado; sem presumir prova externa pela sequência local ou alegação da IA.
- **FR-005**: Informar resultado do lote por jornada com status de processamento/falha, necessidade de ajuste e pendências; não declarar planejamento confirmado.
- **FR-006**: Validar em armazenamento isolado real com falhas controladas e dados sintéticos; preservar registros mínimos e autorização atual.

### Key Entities
Reutilizar jornada, recibo durável, resultado e marcas de fechamento/cancelamento B07/B08. Sem nova entidade operacional ou decisão de retenção.

## Success Criteria
- **SC-001**: Todos os cenários de falha e retomada mantêm estado e resultado consistentes, sem efeito parcial.
- **SC-002**: Todas as reentregas concorrentes de uma identidade geram uma sequência e um efeito.
- **SC-003**: Nenhum cenário de ordem desconhecida cria confirmação ou elimina confirmação válida.
- **SC-004**: Lotes distinguem falhas/pendências e podem ser repetidos sem alterar indevidamente o resultado.

## Assumptions e limites
Fontes: [backlog B09](../../docs/backlog.md), [requisitos](../../docs/requisitos.md), [decisões](../../docs/decisoes.md), [constituição](../../.specify/memory/constitution.md), [B07](../006-jornada-comandos/spec.md) e [B08](../007-fechamento-cancelamento/spec.md).
B07/B08 já entregaram o núcleo de deduplicação/serialização; B09 não o reinicia. Backend primeiro, sem conexão real. Identidade externa, assinatura de webhook, namespace/chaves do provedor, prova real de ordenação e política de reinterpretação externa exigem desenho/verificação em B18; a entrada sem prova permanece conservadora. Não criar endpoint público de personificação, fila externa, agendador, retenção automática ou alteração de infraestrutura. Nenhuma nova regra de negócio é necessária.
