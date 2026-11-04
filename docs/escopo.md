# Escopo

Estado de implementação vigente: [consolidação de 04/11/2026](estado-atual.md). Regras de escopo preservadas; testes manuais adiados e contexto de conversa planejado, ainda não implementado.

Atualização de despacho em 29/10/2026: despachante de recibos implementado, com reserva durável antes da chamada, bloqueio de duplicatas e revalidação do estado atual. Verificado com transporte simulado; migração1794500000000 aplicada em dev/test. Envio real permanece false. Resultado incerto ou tentativa interrompida não é reenviado automaticamente; sent significa aceite do provedor, não entrega. Ensaio completo com aluno fictício explícito continua pendente. Detalhes em specs/019-interpretacao-mensagens/automation.md.

Atualização de 29/10/2026: executor interno opt-in implementado para eventos conhecidos do dia, com reserva persistente, sem identidade administrativa fictícia e sem retry de falha incerta. Recibo preparado na mesma transação da jornada, com trechos/locais reais e pendências explícitas; não significa envio. Migração1794400000000 em dev/test. EVOLUTION_SEND_ENABLED permanece false; despachante de recibos e ensaio com aluno fictício ainda pendentes. Detalhes em specs/019-interpretacao-mensagens/automation.md. Supera o registro anterior de ausência de worker, sem habilitar agendador de lembretes.

Continuidade em 29/10/2026: origem de horário preservada por patch reproduzível Evolution/Baileys e persistida em original_order (migração1794300000000). Endpoint protegido POST events/:id/apply aplica proposta clara validada em transação, sem reconfirmação. Prazo usa received_at original; empates/ausência de evidência/conflitos ficam pendentes, mensagens anteriores não resolvidas bloqueiam sucessoras, revisões administrativas e sequência existente são preservadas. Acionamento ainda explícito pela equipe, sem worker, resposta automática ou ensaio completo com aluno. Registros anteriores de bloqueio universal descrevem a etapa anterior.

Decisão de Taís em 29/10/2026: pedido explícito e válido recebido antes das 17h não exige reconfirmação; processamento posterior preserva o recebimento durável original. Após efetivar a viagem, enviar recibo com os trechos e locais realmente registrados, sinalizando locais pendentes sem inventá-los. Perguntar somente para esclarecer ambiguidade; conflito com ordem incerta continua exceção pendente, sem reconfirmação geral. Esta decisão orienta a próxima implementação; não habilita envios nem comprova automação concluída.

B18.3 mantém o escopo: interpretar gera proposta; a jornada só pode mudar com todas as provas/validações existentes. Ordem incerta continua pendente, sem aplicar parcialmente mensagens compostas. Sem novo agrupamento, geocodificação, agendador ou envio automático. [Limites](../specs/019-interpretacao-mensagens/verification.md).

Estado B18.2 (28/10/2026): transporte WhatsApp local implementado, sem ampliar regras de negócio. Receber uma mensagem ainda não confirma viagem; interpretação será B18.3. Pareamento e ensaio real pendentes; [evidências e limites](../specs/018-whatsapp-local/verification.md). A continuidade autorizada por Taís permite a implementação; este documento não constitui autorização independente.

[Início](../README.md) · [Escopo](escopo.md) · [Requisitos](requisitos.md) · [Fluxos](fluxos.md) · [Decisões](decisoes.md) · [Plano](plano-desenvolvimento.md)

TechBus é o Sistema para gestão de transporte universitário de Taís. Organiza dados, demanda diária e decisões operacionais; WhatsApp/IA é um componente. A proposta aprovada fundamenta a redução de consolidação manual, inconsistências e retrabalho, sem afirmar ganhos já medidos.

## Operação

As regiões de distribuição são organizadas por bairros inteiros. A empresa define os vínculos bairro/região/grupo; o sistema associa o endereço ao grupo existente após identificar o bairro e validar a cobertura, sem gerar agrupamento automático.

Cobertura local: toda a área urbana de São Lourenço do Oeste. Embarque na ida somente em pontos específicos pré-cadastrados; desembarque em endereço escolhido pelo aluno dentro dessa área. As duas universidades atendidas ficam em Pato Branco. Limite geográfico e divisão operacional em regiões serão representados na preparação B18, sem presumir cobertura rural.

Uma empresa, universitário noturno, Unimater e Unidep. Rota noturna conceitual: coleta compartilhada em São Lourenço, com origem comum a cadastrar, até a fiscalização na saída da cidade; transferência separa os alunos por universidade rumo a Pato Branco. O mesmo veículo permanece e retorna da universidade até a fiscalização. A distribuição às casas volta a misturar alunos das duas universidades por regiões.

A empresa define grupos locais diferentes para ida e volta e escolhe veículos de coleta/distribuição. Cada ponto pertence a um grupo de coleta e cada região a um grupo de distribuição, podendo um grupo reunir vários pontos/regiões. Desativar esses cadastros preserva referências, padrões e confirmações existentes, mas impede novas utilizações e exige ajuste manual. Não há recomendação local, agrupamento automático ou equilíbrio automático de tempos. Cada veículo atende um grupo na etapa de distribuição; veículos retornados de Pato Branco podem ser reutilizados depois, sem exclusividade pela noite inteira.

Recomendação somente intermunicipal, por universidade: menor veículo disponível capaz de max(contagem ida, contagem volta), preferindo um único veículo. Mesma capacidade gera opções equivalentes para escolha da empresa, que confirma o planejamento. Se nenhum comporta ou faltam veículos simultaneamente, alertar para solução manual, sem repartição automática nem dupla alocação simultânea. Frota: identificação/número, placa, tipo van/micro/ônibus, assentos de passageiros e disponibilidade.

## Cadastros, calendário e acesso

A equipe cadastra aluno com nome, telefone WhatsApp, universidade, dias habituais, ponto padrão de embarque, endereço padrão de desembarque e início/fim do contrato. Contrato representa somente vigência, sem pagamentos, mensalidades ou cobranças. Datas inicial/final inclusivas; rejeitar datas invertidas e sobreposição de vigências do mesmo aluno. Após término, suspender consultas e novas confirmações até renovação pela equipe. Aluno inativo também fica bloqueado; a desativação não cancela confirmações existentes, que exigem ajuste manual. Zero dias habituais é permitido para uso somente extra, sujeito a vigência, operação e prazo.

Calendário por universidade, com dias habituais e exceções de feriados, recessos e extras definidos pela empresa. Exceção por data prevalece sobre semana; correção vale para novas avaliações e preserva confirmações existentes para ajuste manual, sem envio automático. Não presumir operação sem configuração. Consultar somente se coincidem dia habitual do aluno, operação universitária e contrato vigente. Em dia extra do aluno, ele pode iniciar contato até 17h se houver operação e vigência. Sem operação, informar e orientar contato com a empresa, sem confirmar. Telefone desconhecido também é orientado à empresa, sem autocadastro.

| Perfil | Acesso |
| --- | --- |
| Administrador | Gerencia cadastros e operação; exclusivamente cria usuários e administra recuperação de acesso, define perfis/permissões e configurações gerais. |
| Operador | Gerencia alunos, vigências, veículos, motoristas, pontos, grupos, calendários e operação; confirma veículos e corrige listas. Não administra usuários/permissões nem configurações gerais. |
| Motorista | Somente consulta viagens atribuídas, nomes, pontos, trajetos e telefones de passageiros. Não edita. |

Há múltiplos logins individuais, sem cadastro público. Autenticação no próprio NestJS com PostgreSQL: login por e-mail individual e senha, contas criadas pelo admin, definição de nova senha no primeiro acesso e após recuperação administrada pelo admin; sem Supabase Auth, cadastro público ou e-mails automáticos de convite/recuperação. Sessão, usuário ativo e permissões validados pelo backend. Decisão B18 de 27/10/2026. A empresa atribui motorista por veículo e trecho.

## Confirmações, comunicação e horários

No MVP, interpretar somente mensagens de texto. Áudios, imagens e figurinhas recebem orientação para responder por escrito, sem transcrição, interpretação de mídia ou alteração presumida da viagem.

Precisão confirmada: “até 17h” significa recebimento durável no backend antes de 17:00:00; cancelamento de volta “até 22h”, antes de 22:00:00, em America/Sao_Paulo. O registro ocorre antes da IA; demora de interpretação não muda o instante, chegada tardia não reabre prazo. Duplicatas não repetem efeitos; evento comprovadamente antigo não sobrescreve revisão mais recente e ordem incerta é encaminhada à equipe.

Até 17h, aluno confirma/revisa trechos e pontos; última informação explícita válida prevalece. “Vou” ou confirmação de ida implica ida e volta, salvo recusa explícita da volta. “Vou só na ida”/“vou só na volta” limita ao trecho indicado. “Não vou” significa nenhum trecho, salvo explicitação de só volta.

Sem resposta fica em lista própria destacada, fora dos confirmados e da capacidade. “Ainda não sei se vou” permanece indeciso, com lembretes, sem confirmar ida; sem confirmação até 17h, não conta. Se ida foi confirmada e volta ficou indecisa, manter ida e lembretes só da volta; às 17h incluir volta por padrão, marcando a origem. O resumo ao aluno informa essa regra e o cancelamento permitido até 22h. A regra nunca inclui quem não respondeu nada.

Após 17h, única ação do aluno: avisar que não volta até 22h. Sem novas confirmações, trocas de ponto ou aprovação tardia de aluno. Cancelamento atualiza listas/distribuição, sem implicar troca de ônibus já em Pato Branco. Admin/operador podem corrigir listas após 17h; exceder assentos gera alerta e exige ajustar alocação antes de confirmar planejamento. Alterações manuais não enviam notificação automática WhatsApp.

Consulta 05h; três lembretes 11h, 13h e 16h, America/Sao_Paulo, somente para pendências. Respostas definitivas encerram lembretes pertinentes. IA envia resumo final dos trechos/locais; se não compreender após esclarecimento, encaminha pendência à equipe sem presumir confirmação. Falha de envio fica destacada no painel, equipe pode tentar reenviar; não responder mantém pendência e falha posterior nunca apaga confirmação anterior.

## Locais e padrões

Até 17h, embarque somente em pontos pré-cadastrados. Desembarque pode ser endereço escolhido pelo aluno, aceito automaticamente se dentro das regiões atendidas, sem aprovação individual da empresa. Local válido deve pertencer a região/grupo; método técnico de validação permanece aberto. Fora da área: informar, pedir outro e preservar local anterior válido.

Mudanças normalmente valem só para o dia. Padrão muda apenas por pedido explícito ou consentimento. Na quarta utilização consecutiva do mesmo local alternativo, sugerir torná-lo padrão, separadamente para embarque e desembarque; alterar só se aceitar. Considerar apenas dias de uso do trecho: fins de semana/dias sem viagem não quebram sequência, outro local nesse trecho reinicia. Para operacionalizar sem check-in, usar registros de uso confirmado, considerando cancelamentos; isso não comprova embarque físico.

## Trajetos e limites

O trajeto da distribuição de volta termina no último desembarque dos alunos, sem incluir retorno à garagem, conforme decisão B18.

A ordenação automática prioriza menor tempo estimado de percurso dentro de cada grupo, preservando os grupos e veículos definidos pela empresa; não promete ótimo global nem duração real garantida.

Cálculo automático do trajeto é alta prioridade, opcional se comprometer entrega. Google Maps é possibilidade, não decisão. Plano B se inviável/atrasar: empresa cadastra ordem por grupo/sentido, sistema filtra locais dos confirmados preservando ordem, sem promessa de otimização, equilíbrio de tempo ou distâncias calculadas. Decisão B16: equipe insere manualmente endereço novo; enquanto houver confirmado sem posição, itinerário completo não pode ser publicado. Alterar ordem padrão exige publicação explícita no dia; última ordem publicada permanece com alerta e cancelamentos são refletidos imediatamente.

Fora do MVP: colégio, diurno, múltiplas empresas, qualquer financeiro, rastreamento, comprovação de presença, autocadastro e interface de histórico de operação. Histórico consultável fica futuro. Manter registros mínimos para funcionamento e sequências de locais; retenção técnica a definir, sem exclusão automática presumida ao fechar o dia. Sugestão de pontos por geolocalização permanece futura.

Direção tecnológica, avaliação acadêmica e pendências estão em [decisões](decisoes.md); prazos em [plano](plano-desenvolvimento.md). Nenhuma implementação está autorizada por estes documentos.

Decisão final B18: criação automática de grupos e redistribuição de alunos entre veículos ficam para implementação futura. No MVP, grupos e veículos locais são definidos pela empresa, tanto na ida quanto na volta. O cálculo automático de trajeto dentro dos grupos continua prioritário conforme O01.
