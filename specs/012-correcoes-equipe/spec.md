# Feature Specification: B13 — correções da equipe

**Feature Branch**: codex/001-base-backend (existente preservada)
**Created**: 2026-10-25
**Status**: Aprovada para implementação
**Input**: Continuar após B12 conforme backlog e fluxo incremental aprovado.

## User Scenarios & Testing

### User Story 1 — Corrigir a jornada do dia (Priority: P1)
Como admin/operador, corrijo os trechos e locais da jornada atual após conferir a informação com o aluno, inclusive após 17h.

**Why this priority**: materializar R11 sem permitir alterações tardias pelo próprio aluno.
**Independent Test**: equipe registra correção após 17h; motorista/aluno não podem executar essa operação; a lista reflete a correção e identifica sua origem.
**Acceptance Scenarios**:
1. Correção administrativa é distinta de comando do aluno e não reabre prazo de autosserviço.
2. Nova confirmação continua exigindo aluno ativo, vigência e operação; retirada de confirmação existente permanece possível mesmo após perda de elegibilidade.
3. Local novo deve ser válido conforme B06; inválido preserva a situação anterior. Alteração diária não altera padrão silenciosamente.
4. Sem local válido, confirmação conta na demanda e exige ajuste antes de confirmar planejamento, conforme B07/B12.
5. Apenas os trechos selecionados são corrigidos; não inferir volta pela inclusão manual de ida.

### User Story 2 — Resolver informação pendente sem sobrescrita (Priority: P1)
Como equipe, resolvo informações que ficaram incompreendidas ou com ordem incerta sem que processamento atrasado desfaça minha decisão.

**Why this priority**: pendências de B07–B09 precisam de tratamento explícito e verificável.
**Independent Test**: correção concorrente com interpretação atrasada conserva a revisão válida, não duplica efeitos e não elimina pendência sem resolução autorizada.
**Acceptance Scenarios**:
1. Correção identifica responsável, instante, origem da equipe e justificativa, preservando registros mínimos sem histórico operacional público.
2. Edição baseada em revisão superada é recusada; repetição da mesma operação não repete efeitos.
3. Pendências anteriores só são encerradas após revisão explícita pela equipe e justificativa. Mensagem comprovadamente antiga não sobrescreve decisão mais recente; ordem incerta não é presumida.
4. Cancelamento posterior de volta pelo aluno permanece permitido antes das 22h, conforme regras existentes.

### User Story 3 — Manter planejamento coerente (Priority: P1)
Como equipe, vejo o impacto da correção na demanda e ajusto a alocação quando necessário.

**Why this priority**: não apresentar planejamento confirmado com demanda superada ou excesso de assentos.
**Independent Test**: correção eleva demanda acima dos assentos; planejamento sinaliza ajuste e não pode ser reconfirmado até resolver o excesso.
**Acceptance Scenarios**:
1. Jornada e sinalização de revisão do planejamento mudam juntas; falha não deixa estado parcial.
2. Ocupações e escolhas anteriores permanecem até substituição válida por B12; sem repartição ou troca automática.
3. Nenhuma correção gera envio automático de WhatsApp.
4. Contagem das sequências B10 acompanha o uso confirmado corrigido, sem transformar confirmação em presença.

### Edge Cases
- Aluno inativo, contrato encerrado ou calendário corrigido com confirmação existente.
- Local desativado, ausência de local e tentativa de corrigir endereço fora da área.
- Duas correções simultâneas, reenvio da mesma operação e interpretação pendente anterior.
- Cancelamento válido após correção; fechamento repetido não desfaz decisão manual explícita.
- Alteração de universidade no cadastro não migra silenciosamente a jornada; manter pendência de contexto até correção explícita compatível.
- Correção excede capacidade de veículo já confirmado; erro de persistência deve preservar estado anterior.

## Requirements

### Functional Requirements
- **FR-001**: Somente admin/operador ativos corrigem jornadas do dia atual; não ampliar acesso do motorista/aluno ou criar histórico consultável.
- **FR-002**: Permitir correções administrativas mesmo após 17h, preservando os prazos e restrições das ações do aluno.
- **FR-003**: Validar novas confirmações e locais conforme B04–B08; não contornar ativação, vigência, operação ou área atendida. Preservar confirmações existentes até correção explícita.
- **FR-004**: Correção manual altera apenas os trechos explicitamente selecionados; não infere volta ao confirmar ida. Preserva o outro trecho; confirmação de ambos é explícita. Decisão Q1 confirmada.
- **FR-005**: Identificar origem da equipe, responsável, instante e justificativa; preservar padrões salvo ação explícita do fluxo B10.
- **FR-006**: Equipe pode encerrar pendências anteriores mediante revisão explícita e justificativa. Processamento posterior dessas mensagens não desfaz a correção; novo cancelamento válido continua permitido. Decisão Q2 confirmada.
- **FR-007**: Proteger contra revisões superadas, repetição e concorrência com comandos/fechamento; falha preserva situação anterior.
- **FR-008**: Atualizar demanda e necessidade de revisão do planejamento junto com a correção; impedir reconfirmação com excesso, falta de local ou conflito. Preservar ocupações até substituição válida.
- **FR-009**: Não gerar WhatsApp automático, agrupamento, recomendação local ou alterações automáticas de veículos.
- **FR-010**: Manter coerência das sequências B10 e leitura atual B12, sem acrescentar presença, financeiro, integrações reais ou novas decisões de infraestrutura.

### Key Entities
- Correção da equipe: decisão administrativa identificada e justificada sobre a jornada atual.
- Jornada atual: intenções e locais por trecho, origem e revisão.
- Pendência de interpretação: informação que depende de resolução explícita.
- Planejamento confirmado: escolhas/ocupações preservadas com indicação de ajuste quando a demanda muda.

## Success Criteria
- **SC-001**: Todos os casos de correção autorizada refletem a informação escolhida e sua origem na consulta atual.
- **SC-002**: Nenhum caso aceita correção por aluno/motorista ou nova confirmação inelegível.
- **SC-003**: Nenhuma repetição ou interpretação antiga desfaz a decisão válida; falhas não deixam efeitos parciais.
- **SC-004**: Excesso de capacidade e locais pendentes impedem reconfirmação; zero mensagens automáticas ou trocas de veículo causadas pela correção.

## Assumptions
Fontes: [R11 e regras relacionadas](../../docs/requisitos.md), [decisões](../../docs/decisoes.md), [fluxos](../../docs/fluxos.md), [backlog B13](../../docs/backlog.md) e [B12](../011-alocacao-planejamento/spec.md). AGENTS.md e constituição prevalecem.
Reutilizar dia atual e autorização existentes. Registro de origem/justificativa é detalhamento de rastreabilidade mínima, sem nova tela de histórico. Limite de 22h pertence ao aluno, não é imposto como novo limite à equipe. Correções manuais não são aprovação tardia de solicitações do aluno. Q1/Q2 confirmadas por Taís em 25/10/2026; seguir plan → tasks → implement sem aprovação por tarefa, conforme fluxo autorizado.
