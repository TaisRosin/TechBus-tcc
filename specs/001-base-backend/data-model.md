# Dados — B02

Nenhuma tabela de negócio é definida. O [modelo conceitual](../../docs/modelo-dados.md) continua proposta a detalhar por módulo.

- Configuração local: host literal `127.0.0.1`, portas distintas 55432/55433, bancos `techbus_dev`/`techbus_test`, usuários/segredos distintos, ambiente development/test; campos obrigatórios validados antes da conexão. Segredos ficam em arquivos locais ignorados, exemplos sem valores reais.
- Estado técnico: prontidão disponível/indisponível e instante UTC em ISO 8601. Não é registro operacional de aluno.
- Registro de migrações: metadados gerenciados pelo TypeORM, sem expor pela API. `synchronize: false`, `migrationsRun: false`, execução explícita.
- Fixture de migração: alteração técnica reversível só em `backend/test/fixtures/migrations/`; nenhum dado pessoal ou tabela de domínio. Deve ser descoberta apenas pelo DataSource de teste. Fixture mínima com id inteiro e marcador textual, revisada durante implementação com a skill de PostgreSQL.

Sem retenção automática, seed real, esquema de autenticação, senha de usuário do produto ou definição antecipada das entidades de B03/B04.
