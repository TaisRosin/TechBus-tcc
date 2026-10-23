# Dados — B03

`app.team_users`: id UUID PK, subject UUID UNIQUE NOT NULL (identidade externa, sem FK para serviço remoto), role texto NOT NULL com CHECK em admin/operator/driver, active boolean NOT NULL, version integer NOT NULL DEFAULT 1 CHECK > 0. Um campo role representa exatamente um papel. Sem senha, token, e-mail redundante ou dados operacionais.

Alterar role/active incrementa version e exige expectedVersion atual. Não excluir membro; estado inativo preserva vínculo. Múltiplos admins permitidos; nenhuma mutação de acesso reduz admins ativos para zero. Revalidar ator ativo/admin dentro da mesma transação serializada. Usuário desconhecido/inativo nunca ganha acesso automaticamente.

Migração versionada explícita, synchronize=false e migrationsRun=false. Papel da aplicação recebe somente SELECT/INSERT/UPDATE nessa tabela, sem DELETE/DDL. INSERT reservado ao futuro procedimento controlado; B03 não expõe criação de usuário. Primeiro admin e demais membros sintéticos só em fixture de testes, removida pelos IDs da fixture. Não criar tabela de viagem/atribuição antes de seus módulos.
