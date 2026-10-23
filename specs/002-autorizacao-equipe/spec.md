# Feature Specification: B03 — Autorização da equipe

**Created**: 2026-10-22
**Status**: implementada e validada localmente após aprovação das três decisões por Taís.
**Input**: B03 do [backlog](../../docs/backlog.md), R20 e três recomendações aceitas em 22/10/2026.

## User Scenarios & Testing

### User Story 1 — Acesso conforme vínculo atual (P1)
Como membro da equipe, acesso somente ações permitidas ao meu perfil e vínculo ativo.
**Why**: evita acesso indevido antes de acrescentar módulos operacionais.
**Independent Test**: apresentar identidades válidas/inválidas e verificar autorização sem executar efeitos recusados.
**Acceptance**:
1. Identidade ausente, inválida ou expirada não libera acesso; identidade válida sem vínculo ativo também não.
2. Perfil informado pelo solicitante não altera permissões; valem os dados atuais da equipe.
3. Administrador gerencia acessos/configurações; administrador e operador gerenciam operação; motorista não edita.
4. Há exatamente um dos três perfis fixos por usuário, sem permissões personalizadas.

### User Story 2 — Alterar acesso sem perder administração (P1)
Como administrador, altero perfil e ativação de membros, preservando pelo menos um administrador ativo.
**Why**: permite gestão de acessos sem bloquear a administração da empresa.
**Independent Test**: alterar acesso, tentar autoelevação como operador e tentar retirar os últimos administradores simultaneamente.
**Acceptance**:
1. Só administrador ativo altera perfil/ativação; operador não promove a si próprio.
2. Mais de um administrador é permitido; retirar/desativar o último é recusado, inclusive por ele mesmo e sob concorrência.
3. Alteração baseada em revisão antiga é recusada; alteração confirmada vale na próxima solicitação, mesmo usando a mesma identidade válida.
4. Usuários desativados permanecem registrados e não são reativados por recuperação de senha.

### User Story 3 — Restringir leitura do motorista (P2)
Como motorista, leio somente viagens atribuídas a mim, sem editar nem consultar viagens de outros motoristas.
**Why**: protege dados dos alunos e mantém responsabilidade por atribuição.
**Independent Test**: consultar recurso atribuído, alheio e inexistente com o mesmo motorista.
**Acceptance**: somente atribuído é autorizado; alheio/inexistente não revela dados; nenhuma edição é autorizada. Atribuições são consultadas a cada autorização, não presumidas pelo solicitante.

### Edge Cases
Token válido com usuário desativado; papel forjado; perda de acesso durante disputa de alteração; duas remoções concorrentes de administradores; serviço de identidade indisponível; atribuição ausente; rota sem política declarada; revisão repetida/desatualizada.

## Requirements
- **FR-001**: validar identidade e vínculo ativo antes de ações protegidas; negar por padrão.
- **FR-002**: atribuir um único perfil fixo admin/operador/motorista, conforme R20; sem permissões individuais.
- **FR-003**: reservar gestão de usuários/convites/perfis/configurações ao admin; operação a admin/operador.
- **FR-004**: verificar atribuição para leitura do motorista e impedir edição.
- **FR-005**: preservar último admin ativo em alterações sequenciais/concorrentes; permitir múltiplos admins.
- **FR-006**: validar comando/revisão e autorização atual antes de persistir; sem exclusão automática de registros.
- **FR-007**: testar decisões com dados sintéticos sem conectar serviços reais; simulação não equivale a login ou envio de convite entregue.

### Key Entities
Membro da equipe: identificador, vínculo de identidade, perfil único, estado ativo e revisão. Atribuição de viagem: contrato de consulta pertencente aos módulos operacionais futuros, sem criar viagem nesta etapa.

## Success Criteria
- **SC-001**: todos os cenários de autorização aceitos e negados têm testes passando; nenhuma tentativa recusada modifica acesso.
- **SC-002**: duas tentativas concorrentes não deixam a empresa sem administrador ativo.
- **SC-003**: desativação/perda de perfil confirmada impede a próxima ação protegida.
- **SC-004**: provas de leitura do motorista não expõem recurso alheio; zero chamadas a provedores reais nos testes.

## Assumptions and Boundaries
Fontes: [decisões](../../docs/decisoes.md), [R20](../../docs/requisitos.md), [constituição](../../.specify/memory/constitution.md). Login por convite/e-mail e senha permanece decisão aprovada. B03 implementa autorização e persistência mínima da equipe; validação real de identidade, SMTP, convites e recuperação reais ficam em B18. Sem interface, cadastros operacionais ou consultas reais de viagens de B15. Primeiro admin por procedimento controlado, nunca cadastro público; dados sintéticos preparados exclusivamente em testes nesta etapa. Expiração/inatividade da sessão e procedimentos externos permanecem pendentes para integração, sem valores inventados.
