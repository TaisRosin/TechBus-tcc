# Feature Specification: B15 — consultas operacionais e motorista

**Feature Branch**: codex/001-base-backend (existente preservada)
**Created**: 2026-10-26
**Status**: Aprovada para implementação em 26/10/2026
**Input**: Continue para a B15, reutilizando B03–B14 e decisões vigentes.

## User Scenarios & Testing

### User Story 1 — Consultar a situação operacional (Priority: P1)
Como admin/operador, quero consultar respostas, contagens, locais, pendências e falhas para acompanhar a operação vigente.
**Why this priority**: consolidar informações já produzidas sem criar regras paralelas de confirmação.
**Independent Test**: respostas e cancelamentos aparecem corretamente por universidade, sentido, grupo e local, distinguindo origem e pendências.
**Acceptance Scenarios**:
1. Exibir sem resposta, indecisão, confirmação explícita/implícita/padrão/equipe, recusa e cancelamento sem confundir confirmação com presença.
2. Não respondentes e indecisos não aumentam contagem de confirmados; confirmado sem local válido conta e sinaliza ajuste.
3. Exibir falhas e incerteza de comunicação separadamente da jornada; reenvio continua seguindo B14.
4. Distinguir rascunho, planejamento confirmado e necessidade de revisão, preservando ocupações B12.
5. Q1 confirmada: data atual e operação anterior somente enquanto houver trecho confirmado ainda não encerrado pelo horário previsto, sem pesquisa histórica ou reabertura dos comandos.

### User Story 2 — Consultar somente as próprias atribuições (Priority: P1)
Como motorista, quero ler veículo, horários, sentido, nomes, locais e telefones dos alunos dos trechos atribuídos a mim.
**Why this priority**: tornar útil a autorização B03 sem expor dados de viagens alheias.
**Independent Test**: dois motoristas atribuídos a trechos diferentes não acessam listas ou telefones um do outro, inclusive manipulando identificadores.
**Acceptance Scenarios**:
1. Conta ativa, perfil motorista, cadastro operacional ativo e vínculo explícito são necessários; ausência de vínculo não concede acesso.
2. Apenas atribuições confirmadas são publicadas; rascunhos não autorizam consulta do motorista.
3. Coleta/distribuição usam o grupo e sentido; intermunicipal usa universidade e ida/volta já explicitadas nas atribuições B11/B12.
4. Motorista não edita dados, acessa pendências administrativas, reenvia mensagens ou consulta outras atribuições.
5. Revogação da conta/vínculo ou substituição confirmada de motorista impede acesso nas novas consultas.
6. Q2 confirmada: manter veículo/trecho confirmado com alerta, retirar cancelados imediatamente e exibir os demais confirmados atuais apenas quando seu vínculo com aquele trecho for inequívoco; informação ambígua fica pendente para a equipe, sem reassociação automática.

### User Story 3 — Vincular o acesso ao motorista cadastrado (Priority: P1)
Como admin, quero associar uma conta existente de motorista ao cadastro operacional correspondente.
**Why this priority**: cadastro B11 não cria login; vínculo precisa ser explícito e autorizado.
**Independent Test**: operador e motorista não podem conceder acesso; conta sem associação não enxerga viagens.
**Acceptance Scenarios**:
1. Só admin gerencia associação de identidade, conforme exclusividade de gestão de usuários B03; atribuição de trechos continua operacional.
2. Uma conta identifica um motorista e um motorista não tem contas simultâneas compartilhadas; impedir associações concorrentes incompatíveis.
3. Não inferir identidade por nome/telefone, criar conta automaticamente ou conectar autenticação real nesta entrega.

### Edge Cases
- Viagem cruza meia-noite; final da janela consultável; ausência de planejamento.
- Troca de motorista no rascunho versus substituição confirmada.
- Cancelamento, alteração manual, perda de elegibilidade ou local inválido depois da confirmação.
- Conta desativada/rebaixada, cadastro de motorista inativo e vínculo revogado durante acesso.
- Motoristas diferentes na ida e na volta intermunicipal; aluno só ida ou só volta.
- Mensagem falha/incerta sem alteração da confirmação do aluno.

## Requirements

### Functional Requirements
- **FR-001**: Expor consulta administrativa das respostas e contagens por universidade, sentido, grupo e local, incluindo origens, cancelamentos, pendências e comunicação.
- **FR-002**: Reutilizar estados e regras B05–B14; não confirmar viagem, reabrir prazo, trocar alocação ou enviar mensagem durante leitura.
- **FR-003**: Aplicar janela operacional Q1, sem histórico pesquisável nem exclusão automática de registros.
- **FR-004**: Motorista lê somente atribuições confirmadas e os dados necessários dos alunos de seus trechos; filtrar no servidor, inclusive acesso direto por identificador.
- **FR-005**: Aplicar Q2 quando planejamento exigir revisão, sem apresentar rascunho ou informação ambígua como lista aprovada.
- **FR-006**: Vínculo entre conta e motorista deve ser explícito, exclusivo, administrado somente por admin e revalidado a cada acesso junto ao perfil/estado ativo.
- **FR-007**: Preservar regras de alocação, ocupações e cancelamento existentes; motorista permanece somente leitura.
- **FR-008**: Entregar consultas de backend verificadas localmente. Interface visual B19, trajeto/ordenação B16 e fornecedores B18 permanecem fora do incremento.

### Key Entities
- Visão operacional: respostas, contagens, origens, locais e pendências da operação vigente.
- Atribuição confirmada: veículo, motorista, etapa, sentido e horários publicados pela equipe.
- Vínculo de acesso: associação explícita entre usuário e motorista operacional.
- Estado de revisão: indicação de divergências que exigem atuação da equipe.

## Success Criteria
- **SC-001**: Todos os cenários de respostas/cancelamentos reproduzem as contagens e origens já validadas, sem efeitos de escrita na consulta.
- **SC-002**: Todos os testes de motorista alheio, sem vínculo, inativo ou sem permissão negam acesso aos dados protegidos.
- **SC-003**: Testes de meia-noite e revisão demonstram Q1/Q2 sem histórico, reassociação automática ou restauração de cancelamentos.
- **SC-004**: Testes de concorrência e regressão preservam B03–B14; nenhuma integração real é utilizada.

## Assumptions
Fontes: [R19/R20/R22](../../docs/requisitos.md), [backlog B15](../../docs/backlog.md), [decisões](../../docs/decisoes.md), [API](../../docs/api.md), constituição e artefatos B03/B11–B14. A exclusividade administrativa do vínculo decorre da gestão de usuários já aprovada; não altera perfis ou cria permissões personalizadas. Sentidos intermunicipais já existem na entrada do planejamento; reutilizar essa informação, sem nova decisão de negócio.

Q1/Q2 confirmadas conjuntamente por Taís em 26/10/2026; plano, tarefas e implementação integral autorizados, sem aprovação por tarefa. Nenhuma decisão de PostgreSQL, Supabase ou infraestrutura será alterada.
