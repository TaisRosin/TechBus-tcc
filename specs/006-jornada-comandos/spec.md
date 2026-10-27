# Feature Specification: B07 — Jornada e comandos explícitos

**Created**: 2026-10-23
**Feature directory**: specs/006-jornada-comandos
**Status**: Aprovada por Taís em 23/10/2026; implementação integral autorizada.
**Input**: Dar continuidade após B06, reutilizando as decisões aprovadas.

## User Scenarios & Testing

### US1 — Informar intenção por trecho (Priority: P1)
O aluno elegível informa ida e volta para o dia, sem que silêncio seja interpretado como confirmação.
**Why this priority**: Produzir demanda correta por sentido.
**Independent Test**: Aplicar comandos a uma jornada sem resposta e conferir estados e origens.
**Acceptance Scenarios**:
1. “Vou” confirma ida e volta, com volta derivada da ida na ausência de recusa explícita.
2. “Só ida” confirma ida e recusa volta; “só volta” recusa ida e confirma volta.
3. “Não vou” recusa ambos, salvo informação explícita de só volta.
4. Indecisão de ida não confirma ida; ida confirmada e volta indecisa preservam essa distinção até o fechamento B08.
5. Sem resposta nunca conta; confirmação é intenção, não presença.

### US2 — Revisar informação válida (Priority: P1)
O aluno revisa sua jornada antes de 17:00:00; incompreensão não apaga resposta válida.
**Why this priority**: Evitar confirmações presumidas e sobrescritas indevidas.
**Independent Test**: Aplicar sequências de respostas e conferir estados, origens e revisão.
**Acceptance Scenarios**:
1. Última informação explícita válida prevalece nos trechos a que se refere.
2. Mensagem ambígua, como “só vou” isoladamente, pede esclarecimento sem confirmar nem apagar resposta anterior.
3. Incompreensão persistente gera pendência para a equipe; não inventar quantidade de tentativas nesta etapa.
4. Recebimento durável antes do corte mantém esse instante mesmo com interpretação posterior; chegada a partir das 17h não autoriza alteração ordinária.
5. “Só ida” seguido de “vou” preserva a recusa de volta até mudança explícita desse trecho.

### US3 — Associar locais do dia (Priority: P2)
A jornada utiliza locais válidos; alteração diária não modifica padrões automaticamente.
**Why this priority**: Preparar listas coerentes com os locais B06.
**Independent Test**: Usar padrões, trocar local diário e verificar preservação do padrão e do local anterior diante de endereço inválido.
**Acceptance Scenarios**:
1. Embarque exige ponto pré-cadastrado ativo; desembarque exige validação de área e vínculo a região/grupo.
2. Fora da área ou validação indisponível não substituem local válido anterior.
3. Troca diária preserva padrão; pedido explícito/consentimento continua obrigatório para mudar padrão.
4. Confirmação sem local válido conta na demanda e sinaliza pendência de local; resolver antes de concluir planejamento operacional.

### Edge Cases
Recusa anterior seguida de confirmação genérica; intenção sem local válido; local desativado; aluno inativo; vigência encerrada; calendário corrigido; dia extra; incompreensão após confirmação; chegada exatamente às 17h; interpretação atrasada; revisão antiga ou ordem incerta.

## Requirements
### Functional Requirements
- **FR-001**: Manter uma jornada por aluno/data operacional e estados independentes por sentido, com origem e revisão da informação válida.
- **FR-002**: Aplicar comandos e estados R05/R06/R08; silêncio nunca confirma.
- **FR-003**: Revalidar cadastro, vigência e operação nas novas confirmações conforme B05; mudanças cadastrais/calendário não apagam confirmações existentes.
- **FR-004**: Reutilizar regras de locais B06; não confiar em alegações de área feitas pela IA ou cliente.
- **FR-005**: Respeitar recebimento durável e cortes em America/Sao_Paulo; evento comprovadamente antigo não substitui revisão recente e ordem incerta vira pendência. O plano deve distinguir proteções mínimas necessárias em B07 da cobertura ampliada B09.
- **FR-006**: Incompreensão preserva informação válida e indica esclarecimento ou atendimento da equipe, sem confirmação presumida.
- **FR-007**: Confirmado: “vou” após “só ida” preserva a recusa da volta até mudança explícita desse trecho.
- **FR-008**: Confirmado: intenção explícita sem local válido confirma e conta na demanda, sinalizando pendência sem inventar endereço; resolver antes de concluir planejamento operacional.
- **FR-009**: Identificação do aluno e autorização não podem ser contornadas; integrações reais permanecem futuras.

### Key Entities
Jornada diária; resposta por sentido; comando recebido e resultado; local do dia; pendência de esclarecimento/ajuste. Reutilizar aluno, universidade, vigência, calendário e locais, preservando registros mínimos sem exclusão automática.

## Success Criteria
- **SC-001**: Todos os cenários explícitos produzem estados e origens esperados por sentido.
- **SC-002**: Nenhum silêncio ou incompreensão confirma; nenhum comando inválido apaga informação válida.
- **SC-003**: Alterações diárias preservam padrões; locais inválidos nunca são apresentados como validados.
- **SC-004**: Novas confirmações inelegíveis e alterações ordinárias recebidas a partir das 17h são rejeitadas sem apagar confirmações existentes.
- **SC-005**: “Só ida” seguido de “vou” preserva recusa; confirmação sem local conta uma vez no trecho e indica ajuste.

## Assumptions e limites
Fontes: [requisitos R05–R12](../../docs/requisitos.md), [fluxos](../../docs/fluxos.md), [decisões](../../docs/decisoes.md), [modelo proposto](../../docs/modelo-dados.md), [backlog](../../docs/backlog.md) e [constituição](../../.specify/memory/constitution.md).

B07 depende de B06. Fechamento/cancelamento após 17h ficam em B08; aprofundamento de idempotência/concorrência em B09; sugestões em B10; correções da equipe em B13; mensagens e integrações reais depois. A divisão não dispensa invariantes da constituição nas operações expostas. Sem escolha de provedores, alteração de infraestrutura ou cadastro público. FR-007/FR-008 foram confirmadas por Taís em 23/10/2026.
