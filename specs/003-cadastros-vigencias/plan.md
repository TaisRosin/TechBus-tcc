# Plano técnico B04

## Resumo e contexto técnico
Módulo NestJS registry, domínio independente de HTTP e adaptador PostgreSQL via TypeORM. Reutilizar guarda/filtro B03 e relógio B02. Sem novas dependências: Node 24.22.1, npm 11.17.0, Nest 11.2.7, TypeScript 5.8.3, TypeORM 0.3.31, pg 8.16.3 e PostgreSQL local 17.11 já verificados em B02/B03 e fixados no lockfile. Nenhuma mudança em Supabase ou infraestrutura.

## Constitution Check
Aprovado antes e depois do desenho: domínio existente, TDD das regras críticas, autorização no backend, isolamento local, datas inclusivas e preservação de registros. Aprovação do incremento recebida com as duas respostas de Taís. Sem desvios.

## Estrutura e execução
`backend/src/registry/{domain,application,infrastructure,http}` mais módulo; migração em `src/infrastructure/database/migrations`; testes em `test/{unit,integration,e2e}`. Critérios em [spec.md](spec.md); desenho em [data-model.md](data-model.md), [contrato HTTP](contracts/http.md) e [pesquisa](research.md).
Transações READ COMMITTED: revalidar e bloquear compartilhado o usuário executor; antes de qualquer alteração de vigência bloquear aluno, depois consultar sobreposição. Ordem executor → aluno → vigência. UNIQUE protege telefone. expectedVersion protege edições. Erros seguros reutilizam AccessError/filtro B03. Aplicação sem DELETE/DDL. Universidades somente leitura. Listagem paginada por id.
Avaliação interna de cadastro/vigência com Clock, sem endpoint público de telefone nem alegação de elegibilidade completa. Dias vazios não bloqueiam extra. Alteração active=false só modifica aluno.

## Validação e riscos
RED/GREEN de datas, normalização e bloqueio cadastral; persistência real testa atomicidade, permissões, revisão e concorrência. HTTP cobre autorização/jornadas. Regressão, build, lint e types. Migração só dev/test locais; reexecução idempotente e reversão apenas com tabelas vazias de teste. Adaptar teste B03 que reverte implicitamente a última migração para preservar incrementos posteriores. Sobreposição depende do protocolo transacional do backend, sem nova extensão. Dados sintéticos apenas.
