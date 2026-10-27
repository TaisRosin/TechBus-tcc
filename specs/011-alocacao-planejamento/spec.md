# Feature Specification: B12 — recomendação e confirmação da alocação
**Feature Branch**: codex/001-base-backend (existente preservada)
**Created**: 2026-10-25
**Status**: Aprovada para implementação
**Input**: Continuar após B11, implementando B12 do backlog sem reabrir regras aprovadas.

## User Scenarios & Testing
### User Story 1 — Consultar demanda e opções intermunicipais (Priority: P1)
Como admin/operador, consulto demanda por universidade e as menores opções disponíveis suficientes.
**Why this priority**: apoiar escolha correta sem somar ida e volta ou dividir alunos automaticamente.
**Independent Test**: ida 30/volta 40 recomenda veículos de 44 quando forem os menores suficientes; dois de 44 aparecem equivalentes.
**Acceptance Scenarios**:
1. Demanda é max(ida,volta), nunca soma; silêncio/indecisão não confirmada não contam.
2. Confirmação sem local válido continua na demanda, mas gera impedimento para confirmar planejamento.
3. Veículo deve cobrir ida/permanência/retorno e não ter ocupação simultânea já confirmada.
4. Insuficiência gera alerta para decisão manual, sem repartição automática ou recomendação local.

### User Story 2 — Preparar planejamento manual (Priority: P1)
Como equipe, seleciono veículos e motoristas por trecho e preparo alocações locais e intermunicipais.
**Why this priority**: escolhas são da empresa e precisam ser revisadas antes da confirmação.
**Independent Test**: salvar rascunho não confirma planejamento; grupos locais permanecem manuais.
**Acceptance Scenarios**:
1. Cada universidade usa o mesmo veículo na ida/permanência/retorno; motorista pode variar por trecho.
2. Grupos de coleta/distribuição permanecem distintos; veículo local é escolhido manualmente.
3. Revisão desatualizada não sobrescreve edição recente; rascunho não comprova disponibilidade reservada.

### User Story 3 — Confirmar sem conflito (Priority: P1)
Como equipe, confirmo o planejamento somente com capacidade, locais, motoristas e disponibilidade válidos.
**Why this priority**: impedir dupla alocação e confirmação com informação superada.
**Independent Test**: duas confirmações concorrentes não reservam o mesmo veículo em períodos sobrepostos.
**Acceptance Scenarios**:
1. Revalidar demanda e cadastros ao confirmar; impedir confirmação com locais pendentes, capacidade insuficiente, recurso inativo ou conflito.
2. Veículo ocupado inclui permanência intermunicipal; reuso posterior sem sobreposição é permitido, incluindo datas adjacentes após meia-noite.
3. Repetir confirmação não duplica ocupação; erro não deixa reserva parcial.
4. Cancelar volta não troca automaticamente veículo já escolhido/em Pato Branco; mudanças relevantes sinalizam necessidade de ajuste.

### Edge Cases
- Demanda zero: não inventar necessidade de veículo.
- Mesmo veículo indicado para universidades com horários simultâneos; motorista com trechos sobrepostos.
- Alteração de grupo/local, calendário, elegibilidade ou frota depois do rascunho.
- Fechamento com interpretação pendente; demanda desatualizada; tentativa de confirmação durante concorrência.
- Alterar rascunho de plano já confirmado não libera silenciosamente ocupação vigente; substituição só ocorre após validação bem-sucedida.

## Requirements
### Functional Requirements
- **FR-001**: Consolidar intenções confirmadas por universidade/trecho e grupos locais, respeitando B07–B10 e locais pendentes.
- **FR-002**: Recomendar somente intermunicipal, menor disponível suficiente para max(ida,volta); capacidades iguais são equivalentes.
- **FR-003**: Preservar seleção local manual, ciclo intermunicipal único e motorista por trecho; sem agrupamento, equilíbrio ou repartição automática.
- **FR-004**: Persistir rascunho e confirmação distinguindo estados; revalidar versões, capacidade, cobertura da demanda, locais e disponibilidade ao confirmar.
- **FR-005**: Prevenir sobreposição de veículo/motorista e efeitos duplicados, inclusive concorrência e datas adjacentes; falha preserva planejamento/ocupação anterior válidos.
- **FR-006**: Consultas e rascunhos antes das 17h; confirmar somente após o fechamento das 17h, com pendências resolvidas.
- **FR-007**: Empresa pode escolher manualmente veículo maior que o recomendado, desde que disponível e suficiente. Destacar o menor adequado, sem bloquear maior.
- **FR-008**: Insuficiência alerta e permanece para ajuste manual; não confirmar excesso nem repartir automaticamente em vários veículos.
- **FR-009**: Admin/operador gerenciam planejamento; não expor histórico operacional público ou mutação ao motorista/aluno. Reutilizar consulta do dia atual; janela além disso não é ampliada nesta etapa.
- **FR-010**: Não antecipar correções de aluno pela equipe B13, notificações B14, visão do motorista B15 ou trajetos B16. Nenhum serviço real ou mudança de infraestrutura.

### Key Entities
- Demanda atual: contagens, locais/grupos e pendências derivadas das jornadas.
- Planejamento: escolhas em rascunho, revisão e situação da confirmação.
- Alocação: veículo ligado à universidade ou grupo, períodos ocupados e motoristas dos trechos.
- Ocupação: efeito da confirmação usado para impedir simultaneidade, preservando reuso posterior.

## Success Criteria
### Measurable Outcomes
- **SC-001**: Exemplo ida 30/volta 40 produz demanda 40 e todas as menores opções equivalentes disponíveis.
- **SC-002**: Nenhum cenário aceito confirma com falta de capacidade/local/recurso ou sobreposição.
- **SC-003**: Confirmações repetidas/concorrentes não duplicam ocupações; falha não deixa efeitos parciais.
- **SC-004**: Rascunho, pendências e confirmação são distinguíveis e verificáveis sem recomendar automaticamente veículos locais.

## Assumptions
Fontes: [R15–R18](../../docs/requisitos.md), [backlog B12](../../docs/backlog.md), [decisões](../../docs/decisoes.md), [fluxos](../../docs/fluxos.md) e [contrato B11](../010-frota-disponibilidade/contracts/http.md).
Não reabrir max(ida,volta), equivalência, menor suficiente, decisões locais manuais, disponibilidade semanal/exceções ou infraestrutura. B11 fornece cadastros/avaliação; B12 acrescenta ocupação persistida e revalidação na confirmação. FR-006/007 confirmados por Taís em 25/10/2026; implementação integral autorizada.
