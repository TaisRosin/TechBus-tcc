# Verificação B04 — 23/10/2026

## Escopo e autorização
As duas recomendações foram confirmadas por Taís, autorizando implementação integral. Spec Kit: spec → setup-plan.ps1 → plan/research/data-model/contracts/quickstart → setup-tasks.ps1 → tasks → check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks → implementação. Checklist 5/5 aprovado antes do código; constituição 1.0.0 preservada. Estado local .specify/feature.json aponta para 003-cadastros-vigencias (arquivo ignorado por desenho do Spec Kit). Nenhum hook de extensão configurado.

## Entregue
- Catálogo fixo Unimater/Unidep; cadastro, consulta paginada e edição de alunos pela equipe; telefone normalizado único; zero dias habituais permitido.
- Cadastro/primeira vigência atômicos, renovação e edição; datas reais inclusivas, rejeição de inversão/sobreposição e revisões antigas.
- Concorrência com bloqueio do aluno; duplicidade protegida no PostgreSQL. Executor revalidado na transação; motorista e anônimo sem acesso.
- Verificação interna de cadastro/vigência com Clock, datas em America/Sao_Paulo e bloqueio de inativos. Desativação preserva registros e não altera confirmações.
- Migração versionada, sem synchronize e sem novas dependências, extensão de banco ou serviços reais.

## Evidências automatizadas
RED observado antes dos módulos de validação, persistência, HTTP e verificação cadastral (módulos/rotas ausentes); manutenção de períodos também falhou por métodos ainda ausentes. GREEN após cada fatia. Testes adicionais verificam rollback após escrita, conflito em edição de telefone e extensão concorrente com renovação.

`node node_modules/jest/bin/jest.js --runInBand`: **17 suítes, 110 testes aprovados** (72 anteriores + 38 B04). Cinco arquivos novos: unit/registry, unit/enrollment-gate, integration/registry, integration/registry-migration, e2e/registry. HTTP usa PostgreSQL e repositórios reais, substitui somente verificador de identidade; dados sintéticos removidos por identificadores gerados.

`npm run build`, `tsc --noEmit` e `npm run lint`: aprovados. Migração aplicada explicitamente em dev, sem pendências em test. Teste de reversão só atua na migração B04 mais recente e com tabelas de cadastro vazias; preserva equipe B03. Teste histórico B03 passou a verificar reaplicação sem reverter migrações posteriores. Privilégios: aplicação sem DELETE/DDL/alteração de catálogo.

Conferência final: ambos os bancos sem migrações pendentes; zero alunos, vigências e usuários sintéticos remanescentes; duas universidades em cada catálogo. Clusters dev/test encerrados após verificação. Links locais dos documentos alterados conferidos; git diff --check sem erros. 13/13 tarefas concluídas, constituição respeitada e nenhuma dependência alterada.

Problemas resolvidos durante validação: asserção de rejeição exigiu método público assíncrono; tipo inferido de UUID no fixture HTTP foi explicitado como string[]; formatação dos testes aplicada. Primeira regressão exigiu iniciar também o cluster dev para dois testes históricos de segregação; repetição completa aprovada. Sem mudança arquitetural.

## Limites e próxima etapa
Auth real continua indisponível no runtime normal. Nenhum token de teste habilitado fora dos testes. B04 não implementa consultas agendadas, confirmações, calendários ou locais; R01 será completado por B06. VALID_ENROLLMENT é somente avaliação cadastral, não confirmação ou autorização reutilizável: futuros comandos precisam revalidar no momento transacional e aplicar calendário/prazos. O bloqueio de sobreposição cobre os escritores da aplicação; SQL administrativo direto deve manter o protocolo. Sem serviço externo, dado de produção, push ou novo commit nesta etapa. Próxima etapa B05 — calendário e elegibilidade.
