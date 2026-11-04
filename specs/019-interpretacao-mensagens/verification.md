# Verificação B18.3 — 28/10/2026

## Complemento — ensaio real em 29/10/2026

Chave fornecida por Taís validada sem exposição. Modelo gemini-3.1-flash-lite respondeu HTTP200 pelo adaptador existente. Roteiro reproduzível backend/scripts/gemini-smoke.cjs --live testa apenas frases fictícias, sem banco ou WhatsApp, exige opt-in e não registra chave nem envelopes externos.

Fluxo regras primeiro: **7/7 casos aprovados**. Seis chamadas Gemini HTTP200: ida com volta indecisa; somente volta; endereço diário sem alteração de padrão; pedido explícito de padrão; múltiplas datas; tentativa de instrução indevida. Um caso local: sim sem contexto permanece ambíguo. Latências externas nessa execução entre 1.065 e 6.870 ms. Regressão dirigida: **14 testes unitários aprovados**.

Limite observado: no ensaio anterior chamando o modelo diretamente, sim foi interpretado como going, incorretamente (6/7 casos aprovados). O serviço já aplica directInterpretation antes do fornecedor, protegendo o comando exato. O roteiro foi ajustado para reproduzir essa precedência. Esta amostra não comprova precisão geral; outras formulações ainda podem gerar propostas erradas. Revisão e bloqueio por ordem incerta continuam necessários.

GEMINI_ENABLED=true no .env privado para uso explícito ao iniciar o backend; envio WhatsApp permanece false. Nenhuma jornada/padrão alterado, nenhum aluno criado. Não houve ensaio completo WhatsApp→aluno→Gemini nesta rodada. O registro abaixo descreve a entrega inicial sem chave.

## Registro da entrega inicial

Incremento local de **propostas de interpretação**, sem confirmação automática de viagens. Execução via endpoint administrativo explícito; não há worker/agendador novo. Nenhum segredo Gemini configurado e nenhuma chamada real ao Google feita nesta entrega.

## Evidências

TDD nas fronteiras públicas: comandos exatos, preservação de texto composto, sim/não sem contexto, proposta estrita, REST com instrução separada, timeout/bloqueio/saída inválida. Serviço PostgreSQL reclama evento antes da chamada, deduplica concorrência e preserva recibo/horário/ordering. Revalida conflito, aluno ativo e operador ativo depois do fornecedor. HTTP protegido e restrito ao dia corrente; texto arbitrário não pode ser enviado pelo operador para fingir recebimento do aluno.

Os primeiros testes falharam pelos módulos/rota ausentes. A integração detectou o formato de retorno do UPDATE do TypeORM, corrigido antes de aprovar a persistência. Testes do fornecedor usam fetch substituto; não medem qualidade semântica do modelo real.

## Limites explícitos

- Todos os recibos Evolution atuais continuam `uncertain`. Uma proposta não ambígua produz `ORDER_UNCERTAIN`, sem atualizar jornada. Não foi introduzido atalho baseado apenas no timestamp ou na ordem de chegada.
- Respostas sim/não sem pergunta comprovada produzem `AMBIGUOUS`. Pergunta citada poderia comprovar contexto, mas não ordena duas respostas ao mesmo prompt; mecanismo causal completo permanece trabalho posterior.
- Mensagem composta guarda o conjunto de pedidos; não executa parte. Locais são texto não validado, não IDs, geocodificação ou padrão alterado. Revisão/correção B13 permanece explícita pela equipe.
- Falha/timeout/interrupção não autoriza retry automático. Registro processing após interrupção permanece sem novo despacho. Processamento iniciado antes da virada do dia e finalizado depois não promove comando nem reabre janela.
- Contato unknown_contact não é convertido retroativamente em aluno; cadastro fictício deve ser explícito e usar nova mensagem. Não criamos conta padrão ou identidade administrativa fictícia no ambiente dev para contornar a autorização.
- Gemini continua desativado sem chave/modelo. Adaptador preparado para formato oficial pesquisado, ainda sem comprovação de conta/cota/resposta real. Nenhum envio WhatsApp automático habilitado.

## Rastreabilidade Spec Kit

FR001–002/SC001–002 → regras; FR003/005/007 → esquema/adaptador; FR004/SC003–004 → persistência/concorrência/revalidação; FR006 → HTTP protegido. Checklist documental 5/5 aprovado. Diretório `019-interpretacao-mensagens`; branch Git permanece main. Nenhum extensions.yml/hook registrado. As fronteiras de teste reutilizam a autorização existente de TDD nas regras críticas.

Resultados finais: **25 testes novos** (14 unitários, 9 de integração PostgreSQL, 2 HTTP). Regressão completa em 74 suítes: 417 testes passaram e 2 falharam por dev parado; após iniciar dev, as duas suítes e o conjunto B18.3 foram repetidos com sucesso (28 testes). Total atual **419 testes distintos** aprovados considerando essa reexecução. `tsc --noEmit`, lint completo e build passaram; ajuste de formatação/tipagem dos testes resolvido antes do fechamento. Migração1794200000000 aplicada em test e dev. Nenhuma chamada Gemini real ou envio WhatsApp realizado.

## Tradução de propostas — continuidade em 29/10/2026

Adicionado proposalCommand, reutilizando validação Command da jornada. Comandos claros não geram reconfirmação; answer mantém estados explícitos. Pedidos com locais/padrões não geram comando parcial e recebem LOCATION_RESOLUTION_REQUIRED nas novas interpretações persistidas. Não há alteração de ordering, aplicação automática, migração ou envio. Teste inicialmente falhou por módulo ausente; após implementação, 20 testes unitários passaram, incluindo seis novos. Fluxo automático completo permanece pendente em T011/T012.

Validação PostgreSQL: 10/10 testes de integração aprovados, incluindo novo caso de pedido de endereço persistido, deduplicado e sem alteração parcial da jornada.

## Origem de ordenação — 29/10/2026

Política de risco residual aprovada. Comparador conservador: sete testes unitários aprovados; tipos e lint aprovados. Reproduzida perda de evidência no buffer Baileys quando notificação vem depois da mensagem; após patch, evidência original preservada nas duas ordens, mesmo quando messageTimestamp comum termina com valor da notificação. Patch reproduzível incluído no build e metadado projetado apenas no webhook, sem campo Prisma. Não realizado ensaio real ou persistência da evidência no TechBus; T015 e aplicação automática continuam pendentes.

## Aplicação controlada e persistência — 29/10/2026

Migração1794300000000 aplicada em dev/test, preservando registros existentes. Evidência original guardada separadamente de received_at; repetição não altera prazo. Conector compilado com sucesso e buffer sintético verificado nas duas ordens. Endpoint /apply protegido reutiliza JourneyService e port transacional PostgreSQL, sem segunda transação ou reconfirmação. Proposta válida segue elegibilidade, prazos e locais padrão existentes. Atualiza interpretação para APPLIED somente depois da jornada efetivada na mesma transação.

Regressão completa: 441 testes/77 suítes passaram. Após proteção adicional de revisão interna contra mensagem antiga entregue depois, suíte direcionada passou 7/7; total de testes distintos atual 442. Cenários cobrem antes/depois de 17h, duplicatas concorrentes, ordem invertida, empate, predecessor pendente, recusa explícita, falta de evidência e autorização.

Limites: acionamento administrativo explícito, não worker. Mudança de local/padrão ainda exige resolução atômica futura. Nova intenção com sequência de recebimento anterior a revisão já aplicada fica REVISION_REVIEW_REQUIRED; não renumerar recibos. Primeiro evento real antigo unknown_contact não foi convertido em aluno. Nenhum envio ou teste completo WhatsApp→aluno→jornada real; nenhuma confirmação de presença. Respostas automáticas/recibo persistido permanecem T019.

Validação final: tsc --noEmit, lint completo e build do backend aprovados. Build da Evolution aprovado. git diff --check sem erros (somente avisos de fim de linha).

## Executor interno e recibo transacional — 29/10/2026

T020–T022 concluídas. Migração1794400000000 aplicada em dev/test. Recibo preparado apenas após resultado applied, na mesma transação; rollback verificado para jornada, promoção de ordering e recibo. Duplicata concorrente produz uma aplicação/recibo. Texto preserva estados reais, locais válidos ou pendência, sem reconfirmação.

Executor opt-in reserva job durável antes de interpretar, processa no máximo dez eventos por rodada e não repete jobs falhos/interrompidos. Caminho interno não simula administrador; HTTP segue protegido. Teste de falha revelou diagnóstico incorreto preservado da interpretação; corrigido para PROCESSING_FAILED, sem recibo falso.

Regressão final: 447/448 passaram inicialmente; um teste de bootstrap encontrou dist/main.js ausente durante build concorrente. Depois do build, a suíte bootstrap passou 11/11. Total atual 448 testes distintos aprovados em 78 suítes, considerando reexecução. Relatórios locais ignorados: .local/conversation-regression.json e .local/conversation-bootstrap-recheck.json. Tipagem, lint completo e build passaram.

EVOLUTION_PROCESS_ENABLED=true somente no .env privado para o próximo início do backend; exemplo versionado permanece false. EVOLUTION_SEND_ENABLED=false preservado. Verificação dev encontrou zero alunos; não foi criado vínculo fictício nem reinterpretado contato desconhecido antigo. Não houve chamada real Gemini ou envio WhatsApp nesta rodada. Despachante, ensaio real com aluno explícito e tratamento de respostas pendentes permanecem próximos passos; prepared nunca significa enviado. [Funcionamento](automation.md).

## Despacho de recibos — 29/10/2026

T012 concluída com transporte simulado. Migração1794500000000 aplicada em dev/test. Despachante registrado no ciclo de vida NestJS, condicionado à flag de envio e allowlist. Reserva sending antes da chamada; verifica aluno/telefone, instância, dia, versão, conflito, novos recebimentos e conteúdo atual. Não repete tentativa incerta/interrompida.

Doze novos testes de integração: concorrência, timeout, HTTP500, resposta inválida/excessiva, revisão da viagem, troca de telefone, conflito, mensagem posterior, virada de dia, falha de persistência após aceite e envio desativado/fora da allowlist. Suíte direcionada 22/22; regressão completa **460 testes em 78 suítes aprovados**. Tipagem, lint e build aprovados; build concluído antes da regressão. Relatórios locais ignorados: .local/ack-dispatch-target.json e .local/ack-dispatch-regression.json. Links locais do incremento conferidos; git diff --check sem erros. FR008/T020 e FR009/SC005/T012 cobertos.

EVOLUTION_PROCESS_ENABLED=true e EVOLUTION_SEND_ENABLED=false confirmados sem exposição de credenciais. Nenhuma chamada real Gemini ou envio WhatsApp nesta rodada. sent significa aceite do provedor, não entrega/leitura. Revalidação ocorre na reserva; alterações durante a chamada não recolhem mensagem em trânsito. Ensaio real com aluno fictício explícito permanece T019, assim como contexto para respostas curtas, resolução de locais e agendador dos contatos nas etapas próprias.

## Preparação de commit — 04/11/2026

Taís solicitou próximas tarefas com Spec Kit, remoção do script manual e preparação de commit; adiou revisão dos testes manuais. Script backend/scripts/manual-whatsapp.cjs removido (era não rastreado). Alterações anteriores nas frases diretas e prompt Gemini preservadas, sem alegação de correção dos cenários relatados.

Na revisão, lint encontrou 38 erros (37 de formatação e import não usado ligado à alteração do diagnóstico de bootstrap). Restaurado diagnóstico restrito de inicialização existente; formatados domain.ts e acknowledgement-dispatcher.ts. Logs de exceção bruta em store/dispatcher/Gemini substituídos por códigos fixos, sem alterar decisão de viagem ou retry. Não persistir corpo de erro/stack do fornecedor ou parâmetros SQL nos logs.

Validação atual: tsc --noEmit, lint completo e build aprovados. Build antes do Jest. **460 testes em 78 suítes aprovados**, zero testes/suítes com falha e zero erros de runtime conforme relatório JSON success=true em .local/precommit-20261104.json; duração Jest 236,957 s. O wrapper PowerShell reportou código 1 ao redirecionar stderr nativo, embora o resumo e JSON do Jest confirmem sucesso integral; evidência preservada em .local/precommit-20261104.log. Testes com PostgreSQL local e transportes substitutos, sem ensaio real Gemini/WhatsApp.

Verificados 12 documentos centrais/novos sem links locais quebrados, 16 IDs de tarefa únicos com formato válido, diff --check sem erros e índice sem arquivos privados/segredos conhecidos. output/ e tmp/ ficaram fora do commit. Configuração privada encontrada com envio/processamento habilitados; não confundir com os valores de 29/10. [Estado vigente](../../docs/estado-atual.md).

Spec Kit: setup-tasks.ps1 -Json e check-prerequisites.ps1 -Json -RequireSpec -RequireTasks -IncludeTasks executados para specs/020-contexto-conversa/, com contexto explícito sem sobrescrever estado global. Sem extensions.yml/hooks. Artefatos conferidos contra 8 FR, 4 SC e 5 princípios da constituição: cobertura de tarefas para todos; nenhum conflito crítico identificado. Evidência causal e política de encerramento do esclarecimento continuam desenho pendente em T001/T002, antes da implementação dependente. Total 16 tarefas abertas (US1: 4; US2: 4; US3: 2; preparação/fundação/validação: 6). Não executar converge de implementação em B18.4 ainda não implementada. B18.3/T019 e os testes manuais seguem abertos.
