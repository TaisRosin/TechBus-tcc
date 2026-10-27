# Feature Specification: B08 — Fechamento e cancelamento

**Created**: 2026-10-24
**Feature directory**: specs/007-fechamento-cancelamento
**Status**: Aprovada por Taís em 24/10/2026; implementação integral autorizada.
**Input**: Continuar após a B07, preservando regras e implementação existentes.

## User Scenarios & Testing

### US1 — Consolidar a jornada às 17h (Priority: P1)
A empresa conhece a demanda consolidada; o aluno com ida confirmada e volta indecisa tem a volta incluída por padrão, com origem identificada.
**Why this priority**: Completar a demanda usada no planejamento.
**Independent Test**: Fechar jornadas com ida confirmada, recusada, indecisa e sem resposta; conferir volta, origem e contagens.
**Acceptance Scenarios**:
1. Ida confirmada e volta indecisa tornam a volta confirmada por padrão às 17h, com origem padrao_fechamento.
2. Recusa explícita de volta é preservada. Quem não respondeu ou não confirmou ida não recebe confirmação presumida.
3. Volta já confirmada mantém sua origem; fechamento não duplica contagem.
4. Local ausente/inválido não elimina a confirmação aplicável: mantém contagem e pendência conforme B07, sem inventar endereço.
5. Repetir fechamento não altera uma volta cancelada nem apaga registros.
6. Perda de elegibilidade bloqueia nova volta padrão, preserva confirmações existentes e sinaliza ajuste manual.

### US2 — Cancelar somente a volta confirmada (Priority: P1)
Após 17h, o aluno pode cancelar sua volta confirmada mediante recebimento anterior às 22h, mantendo a ida e os padrões cadastrados.
**Why this priority**: Evitar demanda de retorno indevida, respeitando os limites aprovados.
**Independent Test**: Cancelar volta explícita, implícita da ida e padrão de fechamento, verificando estados e contagens.
**Acceptance Scenarios**:
1. Cancelamento recebido às 21:59:59 é válido; às 22:00:00 é rejeitado. Instante autoritativo é o recebimento durável, ainda que interpretado depois.
2. Cancelamento afeta apenas volta confirmada; não transforma ausência de resposta ou indecisão em confirmação.
3. Repetição do mesmo cancelamento não repete efeitos; fechamento repetido não restaura a volta.
4. A partir das 17h, novas confirmações e trocas de local recebidas do aluno são rejeitadas, mesmo se o executor de fechamento atrasar.
5. Cancelar uma confirmação existente não exige nova elegibilidade; desativação posterior não impede retirar essa intenção. Não admitir nova confirmação por esse caminho.

### US3 — Conciliar interpretação atrasada (Priority: P1)
Uma resposta recebida no prazo não perde validade por atraso da interpretação, e comandos antigos não apagam revisões mais recentes.
**Why this priority**: Fechamento não pode depender da velocidade da IA.
**Independent Test**: Registrar resposta antes de 17h, executar fechamento e depois interpretar; repetir a sequência com cancelamento posterior já registrado.
**Acceptance Scenarios**:
1. Resposta ordinária recebida às 16:59:59 e interpretada depois das 17h é conciliada com o fechamento; não constitui aprovação tardia.
2. Recusa explícita tempestiva prevalece sobre volta padrão aplicada antes da interpretação.
3. Cancelamento posterior válido não é desfeito por interpretação antiga nem por novo fechamento.
4. Ordem incerta gera pendência para equipe; não inventar intenção nem ordenação.
5. Recebimentos ainda não interpretados ficam identificados como pendentes; não são tratados como silêncio definitivo nem bloqueiam indefinidamente outras jornadas.

### Edge Cases
Instantes exatos de 17h/22h; fechamento executado com atraso; repetição e concorrência entre fechamento/resposta/cancelamento; recibo tempestivo ainda pendente; interpretação após mudança de data; ida sem volta explícita; recusa anterior; retorno já cancelado; perda de elegibilidade; local ausente ou desativado; inexistência de jornada; ordem incerta.

## Requirements
### Functional Requirements
- **FR-001**: Aplicar fechamento a partir de 17:00:00 em America/Sao_Paulo, sem antecipar conversão de indecisão.
- **FR-002**: Confirmar volta por padrão apenas quando ida está confirmada e não existe recusa/cancelamento de volta; preservar origem de confirmações anteriores e distinguir padrao_fechamento.
- **FR-003**: Excluir sem resposta e ida indecisa das confirmações presumidas; não criar jornadas confirmadas para alunos que não responderam.
- **FR-004**: Cancelamento tempestivo de volta confirmada produz estado cancelado e contagem zero somente na volta, sem alterar ida, locais padrão ou outras jornadas.
- **FR-005**: Validar cortes em cada comando pelo recebimento durável; atraso do executor não reabre prazos.
- **FR-006**: Conciliar respostas tempestivas com fechamento sem sobrescrever informação explícita mais recente. Repetições e concorrência não duplicam efeitos nem desfazem cancelamentos.
- **FR-007**: Expor origem, contagens e pendências na leitura administrativa atual, preservando autorização e ausência de histórico operacional consultável.
- **FR-008**: Confirmado: perda de elegibilidade antes do fechamento impede nova volta padrão. Preservar ida e demais confirmações existentes; manter volta indecisa e sinalizar ajuste manual.
- **FR-009**: Preparar informação fiel ao aluno sobre volta padrão e prazo de cancelamento, sem declarar mensagem entregue nem conectar WhatsApp real. Envio/agendamento pertence a B14/B18.
- **FR-010**: Preservar registros mínimos e pendências de local B07; falta de local não remove intenção da demanda nem autoriza concluir planejamento operacional.

### Key Entities
Jornada/respostas por sentido e recebimentos duráveis B07; resultado de fechamento; origem de confirmação; cancelamento de volta; pendências de interpretação/ajuste. Nenhum novo cadastro de aluno, veículo ou serviço externo.

## Success Criteria
- **SC-001**: Todos os cenários de fechamento distinguem volta explícita, derivada da ida, padrão, recusada e cancelada, com contagem individual correta.
- **SC-002**: Nenhuma repetição ou ordem concorrente testada duplica contagem ou restaura volta cancelada.
- **SC-003**: Cortes exatos e interpretação atrasada respeitam o recebimento durável em todos os cenários de aceitação.
- **SC-004**: Nenhum não respondente recebe confirmação automática; nenhuma chegada tardia reabre a janela ordinária.
- **SC-005**: Aluno inativo, sem vigência ou sem operação não recebe nova volta padrão; confirmações existentes são preservadas com ajuste sinalizado.

## Assumptions e limites
Fontes: [requisitos R07/R09/R10 e limites temporais](../../docs/requisitos.md), [fluxos](../../docs/fluxos.md), [decisões](../../docs/decisoes.md), [arquitetura de fechamento](../../docs/arquitetura.md), [backlog](../../docs/backlog.md), [B07](../006-jornada-comandos/spec.md) e [constituição](../../.specify/memory/constitution.md).

Reutilizar o serviço interno e a identificação confiável futura B07, sem criar endpoint público de personificação. Detalhes de serialização, reconciliação e execução local serão resolvidos no plano técnico, sem nova rodada de decisões de arquitetura. B09 amplia provas de concorrência/ordenação externa; B13 trata correções da equipe; B14/B18 conectam agendamento e mensagens. Sem mudança de PostgreSQL/Supabase, credenciais reais ou contratação. Alterações B07 ainda sem commit serão preservadas. FR-008 confirmada por Taís em 24/10/2026.
