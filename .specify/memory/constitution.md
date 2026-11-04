# TechBus Constitution

## Core Principles

### I. Decisões aprovadas são a fonte do domínio
O desenvolvimento DEVE respeitar [AGENTS.md](../../AGENTS.md), [escopo](../../docs/escopo.md), [requisitos](../../docs/requisitos.md) e [decisões](../../docs/decisoes.md). Specs detalham incrementos; não reiniciam levantamento nem transformam propostas em decisões. Uma empresa, universitário noturno, Unimater/Unidep, sem financeiro, autocadastro, presença comprovada ou histórico operacional consultável no MVP.

### II. Regras e autorização pertencem ao backend
O backend DEVE validar identidade, vínculo ativo, autorização e comandos de qualquer origem. IA e integrações NÃO DEVEM acessar irrestritamente o banco ou contornar regras. Grupos e veículos locais são manuais na ida e na volta; criação automática de grupos e redistribuição ficam para implementação futura. Recomendação só intermunicipal usa max(ida, volta), exige confirmação da empresa e impede dupla alocação simultânea. Reuso posterior é permitido. R01–R22/O01 permanecem a fonte dos detalhes.

### III. Testes de comportamento acompanham cada incremento
Horários, confirmações, autorização, vigência, concorrência e alocação DEVEM seguir TDD: caso aceito, teste falhando, implementação mínima e refatoração. Testes observam interfaces acordadas e usam dados sintéticos. Persistência e transações DEVEM ser verificadas em PostgreSQL isolado quando implementadas; substitutos em memória não comprovam restrições reais. Configuração simples não exige testes que apenas repitam a implementação.

### IV. Tempo e registros preservam a informação válida
Relógio DEVE ser substituível. Cortes estritos: antes de 17:00:00 para alterações ordinárias e antes de 22:00:00 para cancelamento de volta confirmada, America/Sao_Paulo. Recebimento durável anterior à IA determina o instante autoritativo. Duplicatas não repetem efeitos; evento comprovadamente antigo não vence revisão recente; ordem incerta vira pendência. Ausência de resposta nunca confirma uso. Preservar registros mínimos; não presumir exclusão ao fechar o dia.

### V. Entregas pequenas, isolamento e evidências honestas
Seguir dependências do [backlog](../../docs/backlog.md), concluir backend antes das integrações reais e manter documentação, código e testes coerentes. Serviços reais, credenciais de produção e bancos externos exigem autorização explícita. Simulação não comprova integração entregue nem resultado acadêmico. Verificar versões e reproduzir dependências por lockfile; não herdar versões do PRM.

## Restrições técnicas
NestJS/Nest CLI no backend; React/Vite/Tailwind CSS/shadcn/ui no frontend. PostgreSQL local na máquina de Taís nos testes B18; hospedagem posterior a definir. TypeORM e migrações versionadas com `synchronize: false`. Conforme decisões B18 de 27/10/2026, autenticação própria no NestJS substitui Supabase Auth: admin cria contas e administra recuperação, usuário define nova senha no primeiro acesso e após recuperação, sem cadastro público ou e-mails automáticos de acesso. Perfis e autorização preservados. Evolution API diretamente pelo NestJS, sem n8n; modalidade, IA, mapas e hospedagem seguem pendentes. PRM somente leitura; preservar sources/ sincronizados e PDF original. Não impor microserviços, repositórios ou hospedagens separados.

## Fluxo de desenvolvimento
Especificação com aceitação → plano → tarefas → aprovação solicitada do incremento → código/testes → evidências e atualização documental. Não repetir aprovação para tarefas já autorizadas. Referenciar docs/ e registrar apenas detalhamento específico em specs/. Verificar constituição antes/depois do desenho e ao concluir implementação. Datas são metas revisáveis, não provas de conclusão.

## Governance
Esta constituição formaliza decisões já aprovadas e não se sobrepõe a AGENTS.md ou às decisões de Taís. Mudanças de domínio exigem decisão explícita e atualização coerente. Versionamento: major para redefinição incompatível, minor para princípio novo/ampliação material e patch para clareza. Revisões conferem aceitação/testes, desvios concretos e justificativa de complexidade.

**Version**: 2.0.0 | **Ratified**: 2026-10-22 | **Last Amended**: 2026-10-27

Revisão 2.0.0: substitui as restrições anteriores de provedor de identidade e acesso por e-mail pelas decisões explícitas B18; mantém os princípios de domínio, autorização e validação. Specs B01–B17 registram a direção histórica e não comprovam implementação da nova autenticação.
