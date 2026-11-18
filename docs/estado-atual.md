# Estado consolidado — 17/11/2026

Material de estudo: [guia completo](guia-apresentacao-andamento.md) e [inventário técnico](inventario-tecnico-andamento.md). Consolidação de código e evidências existentes, sem nova regressão, consulta de banco, envio ou implantação nesta data.

## Situação vigente

- Backend operacional, autenticação própria e painel conectado implementados localmente.
- Pontos fixos, contexto e nomes inequívocos de locais implementados; confirmação e recibo transacionais, despacho controlado e agendador opt-in implementados.
- Ensaio de 09/11: quatro consultas aceitas pelo provedor, sem comprovação de entrega/leitura ou respostas aplicadas. [Registro parcial](../specs/023-agendador-operacional/ensaio-real.md). Cadeia completa e T019 de B18.3 permanecem abertas.
- Itinerário integra Ida, Volta e Intermunicipal; disponibilidade por dia e ocupação por etapa, consulta apenas de hoje. Disponibilidades antigas exigem recadastro por dia.
- Endereço estruturado próprio e referência separados, legado preservado. Maps/Geocoding/Routes implementados e ensaiados em 12/11; ordem manual, sem otimização, GPS ou aviso de chegada. Escolhas/resultados Google somente na sessão da tela.
- Última regressão ampla registrada em 025: 518 testes backend distintos e 14 de navegador. Em 026: 20 testes backend dirigidos e 15 de navegador, além de ensaio Google real. Não somar os conjuntos nem declarar execução em 17/11.
- Pendentes: casos manuais, ensaio completo WhatsApp/painel, conferência de dados/percursos operacionais, hospedagem/operação contínua, retenção e avaliação acadêmica. Nenhum ganho quantitativo comprovado.
- Quarta utilização, agrupamento/redistribuição automáticos e acompanhamento ao vivo fora da entrega vigente. Código histórico de B10 não altera essa decisão.

Sequência sugerida: casos manuais e ensaio completo → correções/revalidação → disponibilização → avaliação e apresentação. Configuração privada e processos ativos não foram auditados nesta consolidação.

## Registros anteriores — contexto histórico

As afirmações de próxima etapa, implementação futura ou pendência abaixo são superadas pela situação vigente quando houver divergência.

# Estado consolidado — 11/11/2026

12/11/2026 — Integração Maps implementada e verificada em specs/026-mapas-rotas/verification.md. Mapa administrativo e prévia de percurso com Geocoding, Routes e Maps JavaScript, ordem manual, origem/destino explícitos, distância/duração estimada. Escolhas geográficas e respostas Google somente na sessão da tela. Avisos de chegada aos alunos são proposta posterior. Este incremento supera a indicação de Maps inteiramente futuro nos registros anteriores.

11/11/2026 — Endereços dos pontos: cadastro próprio estruturado (logradouro/localização, número textual ou sem número, bairro, cidade, UF, Brasil, CEP e complemento) e referência da parada separada, exibida no itinerário/motorista. Bairro, CEP e complemento opcionais. Texto antigo preservado, detalhamento somente explícito; UUIDs, grupos, padrões e ordem manual mantidos. Validação estrutural não comprova endereço real. Maps/geocodificação/rotas continuam futuros. Implementação: specs/025-enderecos-pontos/.


## Itinerário diário — 11/11/2026

Decisão de Taís em 11/11/2026: itinerário com três abas (Ida, Volta e Intermunicipal), prévia e escolha de veículo integradas, painéis por grupo e filtro. Planejamento deixa de ser página separada. Recomendação somente intermunicipal, menor disponível para max(ida, volta), com escolha manual permitida. Disponibilidade semanal por dia (sim/não), exceção por data prevalece. Coleta, intermunicipal e desembarque são etapas sequenciais sem horários. Mesmo veículo pode atender as três etapas, limitado a um grupo por etapa e uma universidade no intermunicipal. Motorista também não pode ter duas atribuições no mesmo trecho da mesma etapa. Consulta somente da data atual em America/Sao_Paulo: ao virar o dia, outra operação; registros técnicos preservados. Prazos 17h/22h e mensagens 05h/11h/13h/16h não mudam.

Esta decisão substitui as faixas horárias B11 e a consulta da operação anterior B15. Implementação e validação em [024](../specs/024-itinerario-diario/verification.md): 507 testes backend distintos considerando reexecuções, 13 de navegador e tipos/lint/build aprovados; duas migrações aditivas em dev/test. Disponibilidades antigas devem ser cadastradas novamente por dia; faixas antigas permanecem guardadas, sem conversão automática em disponibilidade integral.

## Agendador operacional — 06/11

Executor de consultas05h, lembretes11h/13h/16h e fechamento após17h implementado e validado em [023](../specs/023-agendador-operacional/verification.md):504 testes/82 suítes, tipos/lint/build aprovados. Reutiliza elegibilidade, faixa mais recente e reservas persistentes; falha de um aluno não bloqueia os demais. `OPERATIONS_SCHEDULER_ENABLED` é opt-in, separado do envio Evolution e da allowlist; launcher do painel desativa o executor. Nenhum envio real nem alteração de credenciais neste incremento. Próximos: ensaio controlado WhatsApp/painel e hospedagem. A sequência abaixo de05/11 é histórica quanto ao agendador pendente.

## Atualização vigente

Painel operacional e pontos fixos de desembarque implementados; Taís informou que testou o painel. B18.4 agora implementa pergunta objetiva persistente, resposta citada vinculada ao aluno/instância/dia e revisão pela equipe quando a dúvida continua. A resposta precisa chegar antes das 17h; contexto não substitui prazo, ordenação ou elegibilidade. Nomes de pontos fixos são resolvidos sem mapas, com aplicação completa de viagem e local; homônimos, locais desconhecidos e alteração de padrão permanecem conservadores.

Validação local concluída em [B18.4](../specs/020-contexto-conversa/verification.md): 493 testes backend distintos considerando reexecução, 11 de navegador, tipos/lint/build aprovados. Migração `1794700000000` aplicada em dev/test. Nenhum envio real neste incremento; os testes usam transporte substituto. Não confundir configuração privada habilitada com automação comprovada. Launcher do painel mantém integrações desabilitadas no processo.

Sequência atual: executor dos horários e fechamento → ensaio controlado WhatsApp/painel com Taís → hospedagem. Consultas 05h e lembretes 11h/13h/16h ainda não têm executor real. Hospedagem não foi contratada nem publicada. Testes manuais anteriores e B18.3/T019 seguem abertos. Mapas, cálculo de rotas e sugestão da quarta utilização estão fora da entrega; itinerário manual permanece.

## Registro anterior de 04/11 (histórico, superado pelos incrementos 022 e B18.4)

## Decisão vigente — desembarque em pontos fixos (04/11/2026)

Taís definiu pontos de desembarque fixos cadastrados pela empresa, como os pontos de embarque. A equipe cadastra nome, endereço descritivo e vínculo ao grupo de distribuição; o aluno utiliza um ponto cadastrado e ativo. Mudanças diárias continuam sujeitas aos prazos e não alteram automaticamente o padrão. Locais desconhecidos exigem tratamento pela equipe, sem criar endereço ou ponto automaticamente. Ordem de paradas permanece manual.

Mapas, geocodificação e validação automática de área deixam de ser dependências desta entrega; eventual integração será reavaliada depois. Esta decisão substitui o fluxo anterior de endereço livre validado por fornecedor, sem transformar endereços antigos em pontos aprovados automaticamente. Preservar registros existentes e resolver vínculos explicitamente. **Decisão registrada; adaptação do backend e do painel ainda pendente.** Próxima implementação deve cobrir cadastro/seleção, padrões, jornada, recibos, planejamento e itinerário, com testes de inativação, prazos e referências.


## Decisão vigente — entrega antecipada (04/11/2026)

Taís retirou o cálculo automático de rotas e a sugestão automática de mudança de padrão pela quarta utilização desta entrega. Usar itinerário manual B16; preservar mudança explícita/consentida de padrão e os registros existentes. Entrega de sistema e texto prevista para a semana de 16/11; texto fica com Taís. Autorizado antecipar frontend e testar/ajustar incrementalmente com backend existente, sem esperar todas as etapas B18. Painel antecipado B19.1 implementado: [tarefas](../specs/021-painel-operacional/tasks.md), [verificação](../specs/021-painel-operacional/verification.md) e [como iniciar](../frontend/README.md). Contexto/agendador e ensaio WhatsApp continuam pendentes e não devem ser declarados concluídos. Regras de prazo, autorização, capacidade, idempotência e geografia permanecem obrigatórias.

Este registro prevalece sobre descrições históricas de progresso nos documentos anteriores, sem alterar regras de negócio.

- B02–B17: backend interno implementado e verificado nas entregas registradas.
- B18.1: autenticação própria implementada; login/troca de senha/recarga/401/perfil verificados no painel B19.1.
- B18.2/B18.3: recebimento WhatsApp, regras/Gemini, política de ordem original, aplicação, executor interno, recibo transacional e despachante implementados. Última regressão histórica completa: 460 testes/78 suítes em 29/10; a verificação para o commit de 04/11 será registrada separadamente em specs/019-interpretacao-mensagens/verification.md.
- Há alterações posteriores de Taís nas frases diretas e prompt Gemini e relato de falhas em testes manuais. Em 04/11 Taís decidiu adiar a análise desses casos. Não estão corrigidos ou certificados por este planejamento.
- Configuração privada lida em 04/11: Evolution, Gemini, processamento e envio habilitados. Isso não comprova processo ativo, entrega/leitura ou ensaio completo. Exemplos versionados continuam opt-in. Registros antigos de envio false descrevem 29/10; nenhum segredo ou telefone deve ser publicado.
- Há registro local de aluno fictício com vigência até 30/10 e locais pendentes; situação atual no banco não auditada nesta preparação. Não repetir afirmação histórica de zero alunos como estado atual.
- Script manual backend/scripts/manual-whatsapp.cjs removido por solicitação explícita de Taís; remoção não resolve falhas relatadas nem elimina registros de recebimento.
- Incremento ainda pendente, antecipado pelo painel B19.1: [B18.4 — contexto de conversa](../specs/020-contexto-conversa/spec.md), [plano](../specs/020-contexto-conversa/plan.md) e [16 tarefas](../specs/020-contexto-conversa/tasks.md). Implementação ainda não iniciada. T001/T002 detalham evidência causal e encerramento do esclarecimento antes do trabalho dependente.

## Sequência restante

Testar o painel B19.1 e ajustar os fluxos com Taís → resolver locais/geografia e execução dos horários/fechamento → integrar contexto/esclarecimento B18.4 → retomar testes manuais e ensaio B18.3/T019 → avaliação B20. Itinerário manual é o caminho desta entrega; cálculo automático e sugestão da quarta utilização foram retirados. O painel já usa APIs reais, mas cadastro/consultas verificados não comprovam a noite operacional completa.

Envios incertos/interrompidos não são reenviados automaticamente; aceite do provedor não é entrega. Ambiguidade não confirma; revisão administrativa exige justificativa e não dispara mensagem. Contexto não prova ordem nem reabre prazo. Grupos locais e distribuição permanecem manuais.

Planejamento anterior (funcional 22/11) foi antecipado pela indicação de entrega na semana de 16/11; não há garantia de conclusão integral nessa data. Este registro não habilita envio, serviços, migração de produção ou novas funcionalidades.
