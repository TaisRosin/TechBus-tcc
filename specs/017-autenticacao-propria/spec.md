# Feature Specification: B18.1 — autenticação própria

**Feature Branch**: sem criação de branch nesta preparação documental; diretório independente.
**Created**: 2026-10-27
**Status**: backend implementado e verificado localmente em 28/10/2026; SC-005 depende de B19. [Evidências](verification.md).
**Input**: decisões de Taís na entrevista B18 e aprovação de preparar os artefatos Spec Kit.

Primeiro incremento da B18, apoiado na autorização B03. Fontes: [preparação B18](../../docs/b18-preparacao.md), [R20](../../docs/requisitos.md) e [decisões](../../docs/decisoes.md). Não altera regras operacionais nem conecta serviços externos.

## User Scenarios & Testing

### User Story 1 — Entrar e sair com acesso individual (Priority: P1)

Como integrante da equipe, quero entrar com meu e-mail e senha e acessar somente as funções do meu perfil.

**Why this priority**: estabelece identidade real para a autorização já existente.
**Independent Test**: com conta sintética preparada, entrar, consultar a própria sessão, executar ação permitida, tentar ação proibida e sair. TDD nas regras de acesso e tempo.

**Acceptance Scenarios**:
1. Dada conta ativa com senha definitiva, login válido libera apenas seu perfil atual; credencial inválida não revela se o e-mail existe.
2. Dada sessão válida, desativar a conta impede a próxima ação; mudar perfil faz valer as permissões atuais.
3. Ao atingir exatamente 1 hora sem uso ou 12 horas desde login, acesso é negado; atividade anterior não ultrapassa o limite absoluto.
4. Após sair, reapresentar a sessão é negado. Abrir, recarregar ou restaurar o painel exige novo login, sem lembrar acesso.
5. Motorista vê somente próprias atribuições confirmadas, sem edição; operador não administra contas.

### User Story 2 — Criar conta e definir senha (Priority: P1)

Como admin, quero cadastrar uma conta individual e entregar uma senha temporária; a pessoa escolhe sua senha antes de operar.

**Why this priority**: permite novos acessos sem cadastro público nem e-mail automático.
**Independent Test**: admin cria conta fictícia, entrega senha temporária, pessoa troca a senha e entra; repetir troca ou usar senha vencida falha.

**Acceptance Scenarios**:
1. Somente admin ativo cria conta com e-mail único e exatamente um perfil admin/operator/driver.
2. Senha temporária não permite operação; exige nova senha diferente, escolhida pela pessoa.
3. Ao completar 24 horas desde emissão, temporária deixa de valer. Nova emissão invalida a anterior.
4. Duas criações simultâneas do mesmo e-mail resultam em uma conta; duas trocas simultâneas consomem a credencial uma única vez.

### User Story 3 — Recuperar acesso e iniciar a equipe (Priority: P1)

Como admin, quero recuperar acesso de integrantes; como responsável técnico, preciso iniciar a equipe e recuperar o único admin por procedimento local restrito.

**Why this priority**: evita dependência de provedor externo e perda permanente de administração.
**Independent Test**: reset administrativo, revogação das sessões antigas, troca obrigatória, bootstrap concorrente e recuperação local sem ativação indevida.

**Acceptance Scenarios**:
1. Admin ativo emite nova temporária; senha anterior e sessões anteriores deixam de funcionar. Operador não pode executar esse fluxo.
2. Recuperação não ativa usuário inativo, muda perfil ou substitui vínculo motorista.
3. Bootstrap cria somente primeiro admin; repetição com equipe existente é recusada, inclusive concorrente.
4. Responsável técnico recupera único admin ativo pelo procedimento restrito, sem criar perfil técnico na aplicação; exige nova senha.
5. Desativação/rebaixamento concorrentes nunca removem último admin ativo; perda de autorização do ator antes do reset impede alteração.

### Edge Cases

E-mail com diferença de caixa/espaços externos; conta antiga sem credencial; falha de persistência; resposta de criação perdida; reset concorrente com troca/login; relógio controlado nos limites; tentativa repetida de senha; restauração de aba com dados antigos; nunca registrar segredos em logs.

## Requirements

### Functional Requirements

- **FR-001**: autenticar por e-mail individual único e senha, sem cadastro público, usando conta e perfil atuais.
- **FR-002**: preservar autorização B03, proteção do último admin ativo e restrição por atribuição do motorista, inclusive em concorrência.
- **FR-003**: permitir criação somente por admin ativo, com senha temporária gerada e entregue manualmente, sem e-mails automáticos.
- **FR-004**: limitar temporária a 24 horas; exigir senha nova antes da operação; troca única e nova emissão invalidam credenciais anteriores.
- **FR-005**: permitir recuperação somente pelo admin, revogando senha/sessões anteriores sem reativar ou mudar perfil do alvo.
- **FR-006**: expirar sessão com 1 hora sem uso ou 12 horas desde login, o que ocorrer primeiro, e permitir saída explícita com revogação.
- **FR-007**: exigir login ao abrir, recarregar ou restaurar painel. Sem opção lembrar acesso; comportamento completo será validado com frontend B19.
- **FR-008**: oferecer bootstrap restrito e recuperação técnica do único admin, sem rota pública nem novo perfil de aplicação.
- **FR-009**: proteger senhas/sessões contra exposição, limitar tentativas de autenticação e negar acesso em falhas de validação/persistência.
- **FR-010**: preservar IDs, vínculos e dados existentes; conta sem credencial permanece sem login até provisionamento explícito, nunca senha padrão.
- **FR-011**: registrar eventos mínimos de criação, troca, recuperação e revogação sem segredos; não excluir registros automaticamente nesta etapa.

### Key Entities

- Conta da equipe: identidade estável, e-mail, perfil único e situação ativa.
- Credencial: prova de acesso, condição temporária/definitiva, validade e revisão.
- Sessão: acesso emitido, última utilização, limite absoluto e revogação.
- Evento de acesso: ação administrativa ou de credencial, ator/alvo, instante e resultado sem segredo.

## Success Criteria

### Measurable Outcomes

- **SC-001**: todos os cenários de acesso permitido/proibido dos três perfis passam sem ampliar permissões B03.
- **SC-002**: nenhum acesso operacional ocorre com temporária, sessão vencida/revogada ou usuário inativo nos testes de fronteira.
- **SC-003**: cenários concorrentes preservam um único cadastro por e-mail, consumo único e ao menos um admin ativo.
- **SC-004**: fluxo sintético criação → troca → login → saída → recuperação → troca é concluído sem provedor externo ou envio de e-mail.
- **SC-005**: abrir/recarregar/restaurar não retoma acesso sem login na validação do painel B19; B18.1 entrega contrato e testes de sessão, sem declarar essa experiência pronta.

## Assumptions

- Ambiente local isolado, dados fictícios; frontend completo e validação de navegação ficam em B19.
- E-mail identifica conta, não comprova posse da caixa postal; recuperação automática futura fora do incremento.
- Taís confirmou login também ao recarregar em 27/10/2026. Navegação interna sem recarga pode manter sessão dentro dos limites.
- Sem alteração de e-mail pelo usuário, MFA, serviços Google/WhatsApp, hospedagem ou contratação nesta etapa.
