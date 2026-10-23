# TechBus — Sistema para gestão de transporte universitário

Documentação consolidada do TCC de Taís. TechBus organiza a demanda, a operação e o apoio à decisão de uma empresa de transporte universitário noturno, atendendo Unimater e Unidep. WhatsApp e IA são componentes de confirmação e comunicação; o produto inclui cadastros, calendários, contratos por vigência, painel, acessos e recomendação intermunicipal.

## Funcionamento essencial

Coleta compartilhada em São Lourenço até a fiscalização; transferência por universidade para Pato Branco; o mesmo veículo permanece e retorna da universidade até a fiscalização; distribuição local reúne novamente alunos por regiões. Empresa define grupos distintos por sentido e escolhe veículos locais. O sistema recomenda apenas veículos intermunicipais por universidade, usando max(ida, volta), com confirmação da empresa.

O aluno confirma e revisa trechos e locais até **17h**. “Vou” ou confirmação de ida inclui volta, salvo recusa explícita. Quem não respondeu não entra nas listas nem na capacidade. Se confirmou ida mas ainda não sabe se volta, a volta é considerada confirmada às 17h, com origem sinalizada à equipe e regra informada ao aluno. Após 17h, o aluno somente pode cancelar volta confirmada, até **22h**. Não há novas confirmações tardias ou aprovação tardia de pedidos do aluno.

Consulta às **05h** e três lembretes de pendências às **11h, 13h e 16h**, em America/Sao_Paulo. Consultas dependem de dia habitual do aluno, operação da universidade e contrato vigente. Administrador e operador podem corrigir listas depois de 17h; correções manuais não notificam automaticamente pelo WhatsApp.

O cálculo automático de trajeto é muito desejado e de alta prioridade, condicionado ao prazo. Plano B aprovado se necessário: filtrar locais dos confirmados na ordem cadastrada pela empresa para cada grupo/sentido.

## Direção tecnológica e execução

Backend em NestJS; frontend em React com Vite, Tailwind CSS e shadcn/ui, escolhidos em 20/10/2026. Evolution API está escolhida; integração via n8n ou diretamente pelo backend ainda será definida. IA OpenAI (chamada de “ChatGPT” pela usuária) ou Gemini será escolhida depois por Taís; Gemini tem preferência experimental condicionada. Supabase escolhido para dados sobre PostgreSQL; TypeORM e migrações versionadas com `synchronize: false` confirmados. Supabase Auth escolhido para a equipe, com e-mail/senha, convite administrativo e recuperação por e-mail; autorização permanece no NestJS. Railway e Hetzner são indicações do orientador, com uso/hospedagem ainda abertos. Versões do backend fixadas e verificadas em B02; versões de frontend/serviços, mapas e modelagem física de domínio permanecem pendentes. Vite fica no frontend; Nest CLI no backend.

Por orientação do orientador, concluir todo o backend primeiro, preparado para integrações; conectar serviços reais depois. B02 entrega a base local do backend, com testes e PostgreSQL isolado. Integrações reais e contratação não realizadas; preços e gratuidade não verificados.

## Documentos

- [B06 — grupos e locais](specs/005-grupos-locais/spec.md): vínculos manuais por sentido, pontos, regiões e padrões do aluno; desativação preserva referências e sinaliza ajuste. Validação de endereço apenas simulada nos testes; runtime indisponível até integração real. [Tarefas](specs/005-grupos-locais/tasks.md) e [validação](specs/005-grupos-locais/verification.md).

- [B05 — calendários e elegibilidade](specs/004-calendarios-elegibilidade/spec.md): semana e exceções por universidade, avaliação habitual/extra com vigência, ativação e prazo. Correções valem em novas avaliações e preservam confirmações existentes. [Tarefas](specs/004-calendarios-elegibilidade/tasks.md) e [validação](specs/004-calendarios-elegibilidade/verification.md).

- [B04 — cadastros e vigências](specs/003-cadastros-vigencias/spec.md): telefone único, vigências inclusivas sem sobreposição, revisões e inatividade sem apagar registros. Dias habituais podem ser vazios para uso extra. [Tarefas](specs/003-cadastros-vigencias/tasks.md), [validação](specs/003-cadastros-vigencias/verification.md) e [guia local](specs/003-cadastros-vigencias/quickstart.md).

- [B03 — autorização da equipe](specs/002-autorizacao-equipe/spec.md): três perfis fixos, um por usuário, proteção do último administrador ativo e restrição por atribuição. [13 tarefas concluídas](specs/002-autorizacao-equipe/tasks.md), [validação](specs/002-autorizacao-equipe/verification.md) e [guia](specs/002-autorizacao-equipe/quickstart.md). Supabase Auth/convites reais permanecem para B18; nenhum token simulado é aceito no runtime normal.

- [Primeiro incremento SDD: B02 — base do backend](specs/001-base-backend/spec.md), [plano técnico](specs/001-base-backend/plan.md) e [18 tarefas](specs/001-base-backend/tasks.md): implementação autorizada em 22/10/2026; resultados em [verificação](specs/001-base-backend/verification.md) e execução no [quickstart](specs/001-base-backend/quickstart.md). [Constituição 1.0.0](.specify/memory/constitution.md) preenchida com decisões existentes; versões e PostgreSQL local registrados em [pesquisa](specs/001-base-backend/research.md), com patches efetivos documentados. Base local disponível; autenticação real e módulos operacionais continuam nas próximas etapas.

- [Escopo](docs/escopo.md)
- [Requisitos e critérios de aceitação](docs/requisitos.md)
- [Fluxos](docs/fluxos.md)
- [Decisões, referências e pendências](docs/decisoes.md)
- [Plano por faixas de datas](docs/plano-desenvolvimento.md)
- [Skills: instalações e propostas para desenvolvimento](docs/skills-desenvolvimento.md)
- [Orientações de manutenção](AGENTS.md)

Metas sujeitas a revisão: backend em **08/11**, núcleo funcional/congelamento em **22/11**, reserva de **23 a 29/11** e defesa de **30/11 a 05/12/2026**. Prazo de submissão escrita pendente. Testes comparativos acadêmicos confirmados, ainda sem execução ou protocolo detalhado.

Esta versão reúne decisões atuais e contexto da proposta aprovada já lida. Confirmações representam intenção de uso, nunca presença comprovada. Não há financeiro nem interface de histórico operacional no MVP.

## Desenho técnico proposto

Referência prática indicada por Taís: projeto local **PRM 2026**, ainda em desenvolvimento. [Padrões observados e limites de reaproveitamento](docs/decisoes.md#referência-técnica--prm-2026).

Planejamento de 14/10/2026, consolidado em 22/10/2026, com base B02 implementada e demais módulos propostos: [arquitetura](docs/arquitetura.md), [modelo de dados](docs/modelo-dados.md), [API](docs/api.md) e [backlog](docs/backlog.md). As propostas técnicas não alteram as regras confirmadas. B00 concluída quanto à seleção de skills e método de trabalho. B01 tem escolhas e preparação técnica concluídas em B02. B03 entrega autorização local verificada. B04 entrega catálogo Unimater/Unidep, alunos e vigências, com verificação cadastral interna. B05 entrega calendários e avaliação de elegibilidade. B06 entrega grupos, locais e padrões com validação de endereço simulada nos testes. Próxima etapa: B07 — jornada e comandos explícitos.
