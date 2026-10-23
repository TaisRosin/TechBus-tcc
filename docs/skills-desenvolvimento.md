# Skills de desenvolvimento — seleção confirmada e instalações

[Início](../README.md) · [Backlog](backlog.md) · [Decisões](decisoes.md)

Pesquisa de 20/10/2026 para B00, com instalações solicitadas por Taís em 21/10/2026. Seleção consolidada em 22/10/2026 conforme a entrevista; distinguir selecionada, instalada e opcional no registro abaixo. Não houve auditoria completa de todos os arquivos, scripts e dependências. Nenhuma implementação do TechBus foi iniciada.

## Instalações confirmadas — 21/10/2026

- Pasta pessoal do Codex: `grill-me` e `grilling`, de Matt Pocock; `tdd`, de Matt Pocock; `frontend-design` e `webapp-testing`, da Anthropic. Disponíveis também para outros projetos deste usuário. Origens: [Matt Pocock](https://github.com/mattpocock/skills) e [Anthropic](https://github.com/anthropics/skills).
- [GitHub Spec Kit](https://github.com/github/spec-kit): CLI `specify-cli` 1.2.2 instalada em ambiente isolado em `C:/Users/taisr/.codex/tools/spec-kit`; integração Codex inicializada neste projeto, com scripts PowerShell, infraestrutura em `.specify/` e skills em `.agents/skills/`. Invocação: `$speckit-constitution`, `$speckit-specify`, `$speckit-plan`, `$speckit-tasks` e demais skills instaladas.
- Verificação histórica da instalação em 21/10: CLI e geração das pastas concluídas; naquele momento a constituição ainda era modelo. Atualização de 22/10: constituição 1.0.0 preenchida e fluxo specify/plan/tasks/implement aplicado em B02, com [evidências](../specs/001-base-backend/verification.md). Instalação não conclui B00 nem autoriza implementação, conexão a serviços ou redefinição do domínio. AGENTS.md e docs/ continuam sendo as referências vigentes.

## Seleção e instalação do conjunto de backend — 21/10/2026

Taís confirmou as três skills de backend/dados/segurança e autorizou sua instalação durante a entrevista de B00. Instaladas em `C:/Users/taisr/.codex/skills`, pelo instalador do Codex, nas revisões fixas abaixo. As skills existentes não foram substituídas; hashes dos arquivos SKILL.md de tdd, frontend-design e webapp-testing permaneceram iguais antes/depois.

| Skill | Revisão instalada | Licença |
| --- | --- | --- |
| nestjs-best-practices | [6e805e4cc8a4378444c791d4a08e304347152bd0](https://github.com/ejirocodes/agent-skills/tree/6e805e4cc8a4378444c791d4a08e304347152bd0/nestjs/skills/nestjs-best-practices) | MIT; LICENSE da raiz preservada junto da skill. |
| supabase-postgres-best-practices | [c9be0e931b7930f7d02126d04774d904c381e7d7](https://github.com/supabase/agent-skills/tree/c9be0e931b7930f7d02126d04774d904c381e7d7/skills/supabase-postgres-best-practices) | MIT; LICENSE da raiz preservada junto da skill. |
| security-best-practices | [49f948faa9258a0c61caceaf225e179651397431](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-best-practices) | Apache-2.0; LICENSE.txt incluída. |

Revisão pré-instalação: inventário das três subpastas, licenças, configuração e referências relevantes. Apenas documentos e configuração declarativa de apresentação; nenhum script executável ou manifesto de dependências nessas subpastas. Não houve auditoria semântica linha a linha de todos os guias nem execução dos exemplos. Instalação não conectou serviços nem iniciou implementação.

Limites de aplicação: a skill NestJS declara foco em 11+, sem escolher a versão do projeto. Exemplos com cadastro público, ORM, JWT ou microserviços não alteram decisões do TechBus. A de segurança não possui referência específica NestJS; orientações de Express só se aplicam quando pertinentes ao adaptador escolhido. Exemplos Supabase com auth.uid() ou múltiplas empresas não escolhem Supabase Auth nem ampliam o escopo.

Há sobreposição de testes: exemplos NestJS usam mocks internos, enquanto a tdd instalada prioriza comportamento em interfaces públicas previamente acordadas. Não combinar instruções conflitantes automaticamente; quando usar tdd, exemplos NestJS servem como referência técnica adaptável. Testes que substituem autorização não comprovam permissões reais. TDD foi confirmado para regras críticas do backend, com testes de comportamento antes do código e interfaces de teste acordadas por módulo; não exigir testes de todo detalhe visual ou configuração simples. Sugestões distintas de IDs nas skills também não fecham a modelagem.

**B00 concluída quanto à seleção em 22/10/2026.** Nenhuma implementação autorizada por esse fechamento.

| Uso confirmado | Situação |
| --- | --- |
| NestJS, Supabase/PostgreSQL e segurança | Três skills selecionadas e instaladas, conforme revisões acima. |
| TDD | Instalada; selecionada para horários, confirmações, permissões e alocação, com escopo por módulo. |
| frontend-design e webapp-testing | Instaladas; selecionadas para visual operacional e verificação de fluxos no navegador, na etapa de frontend. |
| shadcn e web-design-guidelines | Selecionadas; revisão completa pré-instalação e instalação ainda pendentes antes do frontend. |
| vercel-react-best-practices | Complemento opcional sob demanda; não introduzir Next.js ou dependências por exemplos. |
| Grilling e Spec Kit/SDD | Entrevista de lacunas e trabalho por pequenas tarefas; requisitos e exemplos de aceitação antes de testes/código. |
| Skills específicas de WhatsApp, IA e mapas | Seleção/revisão obrigatória antes de B18, após definição dos serviços; adiamento aprovado, não lacuna bloqueante de B00. |

A [constituição do Spec Kit](../.specify/memory/constitution.md) foi preenchida em 22/10/2026 como versão 1.0.0, com regras aprovadas e referências, sem duplicar toda a documentação. Nenhuma skill nova própria de domínio é necessária neste momento. security-threat-model continua complemento proposto, não requisito adicional para encerrar B00.

Verificação de uso em 22/10/2026: CLI 1.2.2 executada; 12 hashes do manifesto conferidos; resolver de templates, setup-plan, setup-tasks e check-prerequisites com RequireTasks/IncludeTasks passaram para [001-base-backend](../specs/001-base-backend/spec.md). Sem extensions.yml/hooks. Skills constitution/specify/plan/tasks aplicadas; o pedido explícito de fluxo completo autoriza prosseguir entre as etapas, mantendo seus artefatos separados. A pasta não tem `.git` próprio; inicialização local prevista em T001, sem remoto/publicação. Isso comprova o fluxo documental, não execução de implementação, testes ou integração externa.

## Finalidade das skills técnicas

| Área | Skill e origem | Aplicação no TechBus e limites |
| --- | --- | --- |
| Backend | [nestjs-best-practices — ejirocodes](https://github.com/ejirocodes/agent-skills/blob/main/nestjs/skills/nestjs-best-practices/SKILL.md) | Selecionada e instalada; comunitária para módulos, injeção de dependências, controllers, DTOs, validação e testes. O material se declara voltado a NestJS 11+; conferir aderência à versão que vier a ser escolhida. Não determina ORM, login nem uso de microserviços. |
| Dados | [supabase-postgres-best-practices — Supabase](https://github.com/supabase/agent-skills/blob/main/skills/supabase-postgres-best-practices/SKILL.md) | Esquema, migrações, consultas, índices, conexões, concorrência e políticas de acesso. Adaptar ao acesso pelo NestJS; não pressupor acesso direto do navegador ao banco nem Supabase Auth. |
| Segurança | [security-best-practices — OpenAI](https://github.com/openai/skills/blob/main/skills/.curated/security-best-practices/SKILL.md) | Escrita segura e revisão de backend/frontend JavaScript/TypeScript. Conferir referências específicas do framework; não presumir cobertura completa de NestJS. No projeto, revisar autorização por recurso, dados de alunos, segredos e entradas externas. |
| Frontend React | [vercel-react-best-practices — Vercel](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md) | Padrões de desempenho React, carregamento de dados e renderização. Aplicar somente o que serve a React/Vite; exemplos de Next.js não alteram a arquitetura escolhida. |
| Componentes | [shadcn — shadcn/ui](https://ui.shadcn.com/docs/skills) | Compor e personalizar componentes conforme a configuração do projeto, incluindo formulários e tabelas. Complementa React; não substitui especificação das telas ou testes de acessibilidade. |
| Revisão de interface | [web-design-guidelines — Vercel](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) | Revisão de interface, usabilidade e acessibilidade quando as telas existirem. Consulta diretrizes externas durante o uso; revisar a fonte e registrar a revisão utilizada quando necessário para evidências. |

Usar as três primeiras durante o backend; no frontend usar shadcn e web-design-guidelines, com React Best Practices opcional sob demanda. Segurança deve acompanhar cada módulo relevante, e não apenas a entrega final. As skills são orientação de trabalho, não garantia de correção ou substituição dos testes.

## Grill me e SDD

Foram instaladas [grill-me, de Matt Pocock](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md), e sua delegada [grilling](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md). Usar diretamente `$grilling` no Codex. Não está confirmado que esta seja a implementação mencionada pelo orientador. No TechBus, a entrevista deve explorar pendências concretas e consultar os documentos antes de perguntar, sem reabrir regras aprovadas.

SDD significa Spec-Driven Development (desenvolvimento orientado por especificações), não uma skill única. Taís solicitou o GitHub Spec Kit em 21/10/2026, e sua configuração foi instalada conforme o registro acima. Não se presume que seja a ferramenta específica indicada pelo orientador.

Decisão confirmada: usar SDD enxuto sobre os documentos existentes, por pequenas tarefas do backlog. Para cada tarefa do backlog, identificar requisitos R01–R22/O01, esclarecer somente lacunas relevantes, detalhar contrato e exemplos de aceitação, implementar o backend e validar o comportamento. Registrar evidências e manter decisões/documentos coerentes. Integrações reais continuam depois do backend completo. Não duplicar toda a documentação em outro conjunto de especificações sem necessidade.

Exemplo: ao trabalhar elegibilidade, vincular B04/B05 a R01–R03, detalhar casos de vigência/calendário/dia extra e testar esses comportamentos. Na autorização, incluir tentativa do operador de administrar usuários e tentativa do motorista de consultar viagem alheia. Na jornada, testar limites de horário, duplicatas e fechamento concorrente.

## Complementos e próximos passos

- [security-threat-model — OpenAI](https://github.com/openai/skills/blob/main/skills/.curated/security-threat-model/SKILL.md): complemento para analisar fronteiras de confiança e caminhos de abuso quando a arquitetura estiver detalhada; nesta fase, qualquer análise deve ser identificada como baseada no desenho, não em código existente.
- [frontend-design — Anthropic](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): selecionada para direção visual na etapa de frontend. O painel operacional deve priorizar leitura de listas, pendências e uso pelo motorista; estética não muda o escopo.
- Antes de instalar, confirmar o conjunto com Taís e revisar arquivos auxiliares, dependências, licença e revisão de origem. Preferir apenas as skills selecionadas, sem importar coleções inteiras. Seleção não autoriza conexão com banco ou serviços externos.
- Não criar agora skills separadas para cada regra do TechBus: AGENTS.md e docs/ continuam a referência do domínio. Uma skill própria de SDD pode ser considerada se o fluxo repetido justificar; não foi criada.

Referência sobre o formato: [Skills — documentação oficial OpenAI](https://developers.openai.com/plugins/concepts/skills). Skills organizam instruções e recursos para fluxos repetíveis; integrações com serviços são uma decisão separada.

B03 executada em 22/10/2026 pelo fluxo specify → plan → tasks → implement, reaproveitando a constituição e decisões existentes. [Artefatos e evidências](../specs/002-autorizacao-equipe/verification.md). Nenhuma nova skill/dependência instalada.
