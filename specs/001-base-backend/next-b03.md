Registro histórico anterior à B03. O resultado vigente está na [especificação implementada](../002-autorizacao-equipe/spec.md).

# Entrada para a próxima especificação — B03

Preparação documental; B03 não implementada nem ativada como feature. Usar esta entrada no próximo speckit-specify, seguido de plan/tasks, aproveitando [requisitos R20](../../docs/requisitos.md), [backlog](../../docs/backlog.md) e [decisões](../../docs/decisoes.md).

Objetivo: autorizar comandos conforme identidade válida, usuário ativo, papel e atribuição. Admin gerencia usuários/perfis/permissões/configurações; admin/operador gerenciam operação; motorista somente lê viagens atribuídas com telefones, sem edição. Sem autocadastro público.

Testar: identidade ausente/inválida recusada; desativado recusado mesmo com token válido; operador não promove a si mesmo nem convida usuários; motorista não consulta viagem alheia nem altera dados; admin acessa ações exclusivas. Negação antes do efeito operacional.

Supabase Auth permanece aprovado, e-mail/senha, convite exclusivo do admin, senha definida pelo usuário e recuperação por e-mail. B03 prepara contratos e testes com substitutos restritos a testes; nenhum bypass em execução normal. Integração real/SMTP/credenciais somente em B18 e com autorização correspondente.

Definir representação mínima da equipe/permissões sem antecipar B04/B15. Expiração/inatividade, admin inicial, reenvio e troca de e-mail continuam refinamentos pendentes: não inventar valores. Reutilizar relógio, configuração local e migrações explícitas de B02. Apresentar spec/plan/tasks para revisão antes de implementar B03.
