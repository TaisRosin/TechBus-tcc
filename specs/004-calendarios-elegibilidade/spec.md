# Feature Specification: B05 — Calendários e elegibilidade

**Feature directory**: specs/004-calendarios-elegibilidade
**Created**: 2026-10-23
**Status**: Aprovada para implementação após confirmação de Taís.
**Input**: Continuar após B04, seguindo fluxo SDD e decisões existentes.

## User Scenarios & Testing

### US1 — Manter calendário de cada universidade (Priority: P1)
Admin/operador define semana habitual e exceções por data de Unimater/Unidep. Cada universidade tem calendário independente. Prioridade: operação é requisito para qualquer elegibilidade.
**Independent Test**: definir semana, suspender uma data normalmente ativa e habilitar uma data normalmente sem operação; conferir precedência da exceção.
**Acceptance Scenarios**:
1. Dada semana cadastrada, consultar data sem exceção retorna operação conforme seu dia da semana.
2. Dada exceção explícita, sua decisão de operar/não operar prevalece sobre a semana, somente naquela universidade/data.
3. Motorista e usuário não autorizado não alteram calendário. Edição desatualizada não sobrescreve correção mais recente.
4. Sem informação de operação cadastrada, não presumir funcionamento nem importar feriados automaticamente.

### US2 — Avaliar consulta habitual e pedido extra (Priority: P1)
Determinar se aluno pode ser consultado ou iniciar pedido naquela data, reutilizando identificação, ativação e vigência da B04. Prioridade: concluir o primeiro bloco do backlog sem confirmar uso por presunção.
**Independent Test**: comparar mesmo aluno/data com operação ativa/inativa, dia habitual/extra e vigência válida/encerrada.
**Acceptance Scenarios**:
1. Consulta habitual exige aluno conhecido/ativo, contrato vigente inclusivo, dia habitual e operação da universidade.
2. Pedido iniciado pelo aluno em dia extra dispensa dia habitual, mas exige cadastro ativo, vigência, operação e recebimento antes de 17:00:00 em America/Sao_Paulo.
3. Aluno com zero dias habituais nunca é selecionado para consulta habitual; pode ser elegível para pedido extra.
4. Desconhecido, inativo, contrato fora da vigência ou ausência de operação bloqueiam elegibilidade com motivo explícito; nenhum resultado confirma uma viagem.
5. Às 17:00:00 o pedido já é tardio. Atraso na interpretação não altera instante durável recebido; a infraestrutura de recepção será entregue nos incrementos próprios.

### US3 — Corrigir calendário sem efeitos implícitos (Priority: P2)
Equipe corrige semana/exceção com efeito previsível na operação. Prioridade: evitar alterações silenciosas em jornadas já registradas.
**Independent Test**: corrigir operação de uma data e comparar nova avaliação; confirmações existentes são preservadas conforme decisão aprovada, com integração às jornadas nos incrementos próprios.
**Acceptance Scenarios**:
1. Confirmado por Taís: correções valem imediatamente nas novas avaliações; confirmações existentes permanecem para ajuste manual, sem mensagens automáticas.
2. Nunca reabrir prazo do aluno por alteração administrativa de calendário.

### Edge Cases
Exceção em dia sem operação semanal; exceção de outra universidade; nenhuma semana configurada; semana vazia; aluno sem dias habituais; virada de dia local; limites inclusivos da vigência; recebimento exatamente às 17h; edição concorrente; calendário alterado após consulta prévia.

## Requirements
### Functional Requirements
- **FR-001**: Admin/operador mantém semana e exceções por universidade; demais papéis sem acesso administrativo.
- **FR-002**: Exceção única por universidade/data prevalece sobre semana; preservar motivo e informação suficiente para correção controlada.
- **FR-003**: Não inventar dias de funcionamento nem feriados; ausência de configuração não autoriza operação.
- **FR-004**: Consulta habitual combina cadastro ativo, vigência inclusiva, dia habitual e operação.
- **FR-005**: Pedido extra combina cadastro ativo, vigência, operação e prazo estrito; não exige dia habitual.
- **FR-006**: Decisão retorna motivo de bloqueio ou elegibilidade, sem criar confirmação, enviar mensagem ou registrar presença.
- **FR-007**: Rejeitar edição baseada em revisão antiga; futura execução de comandos deve revalidar condições atuais, não reutilizar avaliação anterior como autorização definitiva.
- **FR-008**: Correção vale imediatamente para novas avaliações; preservar confirmações existentes para ajuste manual, sem envio automático.

### Key Entities
Calendário semanal por universidade; exceção por data com decisão de operação e motivo; avaliação de elegibilidade do aluno/data/modalidade. Aluno, universidade e vigência reutilizados da B04.

## Success Criteria
- **SC-001**: Todos os cenários de semana/exceção e combinações de elegibilidade têm resultado verificável.
- **SC-002**: Nenhum caso sem operação, cadastro ativo ou vigência é autorizado; zero dias habituais nunca gera consulta habitual.
- **SC-003**: Limites de data e horário são demonstrados sem depender da hora de execução do teste.
- **SC-004**: Correções concorrentes não sobrescrevem revisões recentes; nenhuma avaliação provoca confirmação ou envio.

## Assumptions e limites
Fontes: [R03 e regras temporais](../../docs/requisitos.md), [fluxos](../../docs/fluxos.md), [backlog B05](../../docs/backlog.md), [modelo proposto](../../docs/modelo-dados.md), [decisões B04](../../docs/decisoes.md) e [constituição](../../.specify/memory/constitution.md). Não reiniciar levantamento.
Elegibilidade é preparada para consumidores futuros: jornada B07/B08, recebimento/deduplicação B09 e agendamentos B14. B05 não implementa agenda de mensagens, confirmações, locais B06 ou serviços reais. Semana sem dias é representável como ausência de operação habitual; exceção explícita pode habilitar data. Não semear segunda–sexta por suposição. Correção de calendário não decide política de retenção nem cria histórico operacional consultável.
