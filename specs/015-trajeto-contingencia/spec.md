# Feature Specification: B16 — trajeto e contingência

**Feature Branch**: codex/001-base-backend (preservada)
**Created**: 2026-10-26
**Status**: Aprovada para implementação em 26/10/2026
**Input**: Continuar após B15, respeitando R21/O01 e o fluxo incremental aprovado.

## User Scenarios & Testing

### User Story 1 — Manter ordem de locais por grupo/sentido (Priority: P1)
Como admin/operador, quero cadastrar a ordem dos pontos de coleta e dos endereços de distribuição para preparar a contingência manual.
**Why this priority**: o plano B depende de ordem explícita da empresa, não de uma sequência inventada pelo sistema.
**Independent Test**: cadastrar A/B/C no grupo e consultar somente A/C confirmados, mantendo essa ordem.
**Acceptance Scenarios**:
1. Ordem pertence ao grupo e ao seu sentido; locais de outro grupo, repetidos ou inválidos são rejeitados.
2. Filtrar locais sem passageiros confirmados sem reorganizar os restantes; cancelamento não restaura passageiros.
3. Novo endereço válido continua na demanda e aparece como pendência quando não possui posição.
4. Q1 aprovada: a equipe insere manualmente o novo local na ordem; enquanto houver local confirmado sem posição, impedir a publicação de itinerário completo, preservando passageiros e alocações.

### User Story 2 — Consultar itinerário das próprias atribuições (Priority: P1)
Como motorista, quero ver a sequência dos locais dos passageiros dos meus trechos confirmados, distinguindo uma orientação completa de uma pendência.
**Why this priority**: entregar uma sequência coerente com as listas protegidas da B15.
**Independent Test**: motoristas distintos acessam apenas seus trechos; cancelar passageiro retira a parada se não houver outro confirmado nela.
**Acceptance Scenarios**:
1. Reutilizar autorização, janela operacional e associações inequívocas B15; não publicar rascunhos como aprovados.
2. Preservar ordem relativa dos locais restantes quando houver cancelamento; não mudar veículo ou grupo.
3. Q2 aprovada: alterações na ordem padrão exigem publicação explícita da equipe para atualizar o itinerário do dia; manter a última ordem publicada com alerta e refletir cancelamentos imediatamente.
4. Não apresentar distâncias, tempos calculados, mapa ou otimização como resultados do plano B.

### User Story 3 — Preparar cálculo automático sem presumir integração (Priority: P1)
Como equipe, quero manter o cálculo automático prioritário e saber quais dependências faltam para utilizá-lo.
**Why this priority**: O01 é prioritário, e a contingência não representa abandono definitivo do automático.
**Independent Test**: indisponibilidade de cálculo é indicada explicitamente e não produz um percurso fictício nem altera grupos/veículos.
**Acceptance Scenarios**:
1. Avaliar viabilidade técnica, entradas e limitações durante B16; distinguir preparação/simulação de integração real.
2. Preservar grupos manuais e alocações, sem agrupamento, equilíbrio ou recomendação local automática.
3. Mapas, validação geográfica e serviço real permanecem pendentes de escolha e autorização; registrar impedimentos e retomada em B18.

### Edge Cases
Local compartilhado por vários alunos; nenhum confirmado; todos cancelados; endereço novo; grupo/local desativado ou transferido; alteração de ordem concorrente; mudança de planejamento/motorista; revisão após publicação; operação atravessa meia-noite; cálculo indisponível.

## Requirements

### Functional Requirements
- **FR-001**: Equipe mantém ordem explícita por grupo/sentido, com validação dos locais e proteção de alterações concorrentes.
- **FR-002**: Contingência filtra locais dos confirmados preservando ordem, sem presumir presença ou otimização.
- **FR-003**: Local ainda sem posição não é descartado, não recebe posição automática e permanece pendente conforme Q1.
- **FR-004**: Motorista consulta somente itinerários de suas atribuições confirmadas, respeitando B15; atualização da ordem publicada segue Q2.
- **FR-005**: Cancelamentos e associações ambíguas seguem B15; nenhuma alteração de itinerário redistribui passageiros ou libera ocupações.
- **FR-006**: Método e completude do itinerário devem ser explícitos; contingência não promete tempo/distância.
- **FR-007**: Preparar e testar limites do cálculo automático e registrar sua viabilidade condicionada, sem serviços reais nesta etapa.
- **FR-008**: Preservar jornadas, padrões de aluno, prazos e decisões arquiteturais; não incluir interface visual, navegação em tempo real ou histórico pesquisável.

### Key Entities
- Ordem do grupo: sequência mantida pela equipe para locais de um sentido.
- Itinerário operacional: locais confirmados associados ao trecho, método e situação de completude/publicação.
- Pendência de ordenação: local confirmado ainda sem posição conhecida, preservado para resolução explícita.

## Success Criteria
- **SC-001**: Todos os cenários de filtragem preservam ordem relativa e excluem locais sem passageiros confirmados.
- **SC-002**: Nenhum cenário perde um endereço sem ordem ou o apresenta como ordenado automaticamente.
- **SC-003**: Todos os acessos alheios, revogados ou fora da janela são negados.
- **SC-004**: Alterações/cancelamentos seguem as decisões Q1/Q2 sem modificar confirmações, alocações ou grupos.
- **SC-005**: Viabilidade do automático documenta entradas necessárias, dependências ausentes e critérios de validação futura, sem declarar integração concluída.

## Assumptions
Fontes: [R21/O01](../../docs/requisitos.md), [escopo](../../docs/escopo.md), [fluxos](../../docs/fluxos.md), [decisões](../../docs/decisoes.md), [backlog B16](../../docs/backlog.md), [modelo conceitual](../../docs/modelo-dados.md) e [B15](../014-consultas-operacionais/spec.md). Reutilizar cadastros B06, alocação B12 e consultas B15. Ordem local considera pontos na coleta e endereços validados na distribuição; não inventar origem/fiscalização/universidade georreferenciadas. Contratos internos e testes simulados não comprovam trajeto viário real. Q1/Q2 confirmadas conjuntamente por Taís em 26/10/2026; implementação integral autorizada.
