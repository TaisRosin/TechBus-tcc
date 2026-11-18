# B19.1 — painel antecipado para testar a operação

Autorizado por Taís em 04/11/2026. Entrega de sistema e texto prevista para a semana de 16/11; texto sob responsabilidade de Taís. Priorizar sistema testável pela interface e ajustes incrementais. Cálculo automático de rotas e sugestão automática da quarta utilização saem desta entrega; preservar itinerário manual e alteração explícita de padrões. Não apagar registros nem regras internas existentes.

## Histórias e aceite

- US1/P1: equipe entra com e-mail/senha, troca senha temporária e encerra sessão. Token só em memória; recarregar/restaurar pede novo login; 401 encerra sessão. Motorista vê apenas próprias viagens.
- US2/P1: equipe cadastra/edita alunos e vigências, calendário universitário, grupos, pontos, regiões, veículos e motoristas por formulários, sem editar JSON/UUID manualmente. Conflito de versão informa recarregamento; nenhuma gravação fictícia.
- US3/P1: equipe vê operação atual, estados de ida/volta, locais e pendências e corrige trechos explicitamente com justificativa. Revisão de mensagens deve ser explícita. Nenhum envio automático causado pela correção.
- US4/P1: equipe consulta mensagens e planejamento, configura disponibilidade e organiza itinerário manual. Confirmação e publicação só após validação do backend. Não mostrar otimização nem sugestão automática como funcionalidade entregue.

## Requisitos

FR001 autenticação/autorizações existentes, sem credenciais embutidas nem token persistido. FR002 usar contratos reais e paginação completa, estados de carregamento/erro/vazio e formulários acessíveis. FR003 operações críticas dependem de versão/justificativa/idempotência existentes. FR004 servidor local em loopback, proxy /api para NestJS; nenhum segredo frontend. FR005 testes de navegador com respostas substitutas e ensaio HTTP real isolado separados de prova WhatsApp. FR006 pendências do backend visíveis, sem simular geografia ou contornar prazos/capacidade.

SC001 login/troca/logout/recarga/401 verificados. SC002 cadastro e correção enviam payloads válidos e não mostram sucesso em erro. SC003 motorista não renderiza navegação administrativa nem solicita dados administrativos. SC004 build/tipos/testes passam e quickstart permite iniciar frontend sem ativar envios por acidente.

## Limites e sequência

Primeiro painel funcional usa backend já existente; não depende de concluir B18.4. Contexto, geografia real e agendador permanecem entregas seguintes, integradas incrementalmente ao painel. Pedido de endereço novo pode retornar indisponibilidade e deve ser comunicado claramente. Ensaio de WhatsApp B18.3/T019 continua aberto. Não alterar a regra de aceitação geográfica como atalho. Gestão completa de contas/perfis depende de consulta administrativa ainda ausente; preservar recuperação CLI existente nesta primeira fatia.
