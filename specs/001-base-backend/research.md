# Pesquisa técnica — B02

Data: 2026-10-22. Propostas para aprovação junto do plano; compatibilidade documental, não validação executada.

## Versões do primeiro incremento

| Componente | Pin proposto | Evidência oficial |
| --- | --- | --- |
| Node.js | 24.22.1 LTS | [Release 21/10/2026](https://nodejs.org/en/blog/release/v24.22.1) |
| npm | 11.17.0 | Versão instalada observada; confirmar engines com Node escolhido antes do lockfile |
| @nestjs/core, common, platform-express, testing | 11.2.1 | [Core](https://raw.githubusercontent.com/nestjs/nest/v11.2.1/packages/core/package.json), [common](https://raw.githubusercontent.com/nestjs/nest/v11.2.1/packages/common/package.json), [Express](https://raw.githubusercontent.com/nestjs/nest/v11.2.1/packages/platform-express/package.json), [testing](https://raw.githubusercontent.com/nestjs/nest/v11.2.1/packages/testing/package.json) |
| @nestjs/cli | 11.0.10 | [Manifesto](https://raw.githubusercontent.com/nestjs/nest-cli/11.0.10/package.json) |
| TypeScript | 5.8.3 | [Manifesto](https://raw.githubusercontent.com/microsoft/TypeScript/v5.8.3/package.json); versão usada pelo CLI selecionado |
| @nestjs/typeorm | 11.0.0 | [Manifesto](https://raw.githubusercontent.com/nestjs/typeorm/11.0.0/package.json) |
| typeorm | 0.3.27 | [Manifesto](https://raw.githubusercontent.com/typeorm/typeorm/0.3.27/package.json) |
| pg | 8.16.3 | [Manifesto](https://raw.githubusercontent.com/brianc/node-postgres/pg@8.16.3/packages/pg/package.json) |
| reflect-metadata / rxjs | 0.2.2 / 7.8.1 | Pares aceitos pelos manifestos Nest/TypeORM acima |
| PostgreSQL | 17.11 | [Política e versões suportadas](https://www.postgresql.org/support/versioning/) |

**Decisão proposta:** fixar esse conjunto e registrar dependências transitivas no package-lock.json; não usar latest na inicialização. Node atual observado: 24.19.0; atualizar patch antes da validação. Ferramentas de teste/lint geradas pelo CLI terão suas versões e pares conferidos e fixados em T003, antes de implementar comportamento. Frontend e integrações não recebem versões antecipadas.

**Justificativa:** Nest core exige Node >=20 e CLI >=20.11; integração aceita Nest ^10 ou ^11 e TypeORM ^0.3.0; TypeORM exige Node >=16.13 e aceita pg ^8.5.1; pg exige Node >=16. TypeScript escolhido coincide com CLI. Isto sustenta a seleção, mas build, instalação sem conflito e testes são o critério final. Não adotar major nova de TypeScript por ser latest. Não afirmar compatibilidade com futuro projeto Supabase sem verificá-lo em B18.

**Alternativas:** copiar versões do PRM foi rejeitado; atualizar todas as bibliotecas para latest amplia mudanças sem necessidade. PostgreSQL remoto e Supabase real excluídos desta etapa.

## Provisionamento local

**Decisão proposta:** PostgreSQL 17.11 por binários Windows ZIP da distribuição vinculada na [página oficial Windows](https://www.postgresql.org/download/windows/), sem serviço global. Extrair em `.local/postgres/17.11/`, verificar origem/integridade e `postgres --version` antes de uso. Se artefato exato não estiver disponível ou houver bloqueio do sistema, registrar impedimento; não trocar versão ou usar remoto silenciosamente.

Dois clusters privados via initdb/pg_ctl: `.local/postgres/dev-data/` em `127.0.0.1:55432`, banco `techbus_dev`; `.local/postgres/test-data/` em `127.0.0.1:55433`, banco `techbus_test`. Portas devem estar livres. Escutar apenas loopback; autenticação SCRAM, credenciais locais distintas, sem trust. Usuários de aplicação/migração restritos a cada banco, sem superusuário em tempo de execução. Bootstrap administrativo fica restrito aos clusters novos.

Configuração de teste separada: validar host literal, porta, banco e usuário permitidos antes de inicializar DataSource; recusar URL externa e alvo de desenvolvimento. Reset exige alvo de teste validado e diretório absoluto dentro de `.local/postgres/test-data/`; nunca encerrar serviço alheio ou apagar cluster de desenvolvimento. Executar integração serialmente inicialmente. Não usar dados pessoais ou dumps reais.

**Justificativa:** Docker e psql não localizados no PATH; pasta padrão PostgreSQL não encontrada. Consulta de serviços foi impedida pelas permissões do ambiente, portanto não se afirma inexistência de instalações. Clusters privados evitam reutilizar serviços desconhecidos e não exigem Docker.

**Alternativa:** Docker Compose é viável se instalado/autorizado futuramente; não torná-lo pré-requisito implícito agora. Não foi instalado software, iniciado banco ou lida credencial.

## Arquitetura mínima

**Decisão proposta:** um backend Nest em `backend/`, no mesmo projeto, com caso técnico de prontidão como primeira fatia. Separar controller, caso de uso, portas Clock/DatabaseProbe e adaptadores. Não criar todos os módulos vazios nem repositório genérico de domínio antes de B03/B04. A porta de persistência técnica demonstra a fronteira; repositórios específicos surgem com suas entidades.

**Justificativa:** atende B02 sem antecipar o domínio. Express é o adaptador padrão proposto. Jest e ferramentas do scaffold serão fixados/verificados em T003. Usar TDD para comportamento do relógio e proteção do alvo de testes, e testes de integração para migrações. Migração sintética fica só em fixtures de teste, sem tabela de negócio artificial.

## Spec Kit e Git — diagnóstico anterior à implementação

CLI isolada `C:/Users/taisr/.codex/tools/spec-kit/Scripts/specify.exe version` respondeu 1.2.2, Python 3.12.14. Integração codex/ai_skills=true/script=ps registrada; skills disponíveis na sessão. Os 12 arquivos do manifesto conferem com SHA256. Sem extensions.yml ou hooks a executar. Resolver de templates e setup-plan funcionaram. `.specify/feature.json` fixa o incremento independentemente de branch.

A pasta não contém `.git`; `git status` falhou ao tentar resolver diretório ancestral. Portanto integração documental com Codex funciona, mas versionamento Git próprio ainda não está preparado. Planejar `git init` local e branch `codex/001-base-backend` em T001, sem remoto, push ou publicação. O campo BRANCH retornado pelo setup representa o identificador da feature, não comprova branch Git existente.

## Resultado da validação documental — antes da autorização

Concluída em 22/10/2026: setup-tasks e check-prerequisites -Json -RequireTasks -IncludeTasks localizaram todos os artefatos; 18 tarefas sequenciais no formato esperado; links locais de README/docs/specs/constituição existentes; sem placeholders de modelo ou esclarecimento pendente nos artefatos preenchidos. Nenhum hook registrado. Não houve implementação, teste de aplicação, instalação de dependências ou acesso a banco. Preparação Git permanece tarefa futura.

## Ajustes durante implementação autorizada

Em 22/10/2026, a instalação verificou conflito de typescript-eslint 8.20.0 com TypeScript 5.8.3 e ausência do pin @types/supertest 7.0.0. Auxiliares corrigidos para 8.46.1 e 6.0.3; pares aceitos sem forçar resolução. Após auditoria, pins de execução atualizados para Nest core/common/platform-express/testing 11.2.7 e TypeORM 0.3.31 (patches nas mesmas linhas, sem mudança arquitetural); Supertest de teste para 7.1.3. A tabela inicial acima registra a proposta original; package.json/lockfile e verification.md registram o resultado efetivamente validado. Metadados consultados em registry.npmjs.org para cada versão. PostgreSQL continua 17.11 local em dois clusters, sem Supabase real.
