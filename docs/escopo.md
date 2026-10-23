# Escopo

[Início](../README.md) · [Escopo](escopo.md) · [Requisitos](requisitos.md) · [Fluxos](fluxos.md) · [Decisões](decisoes.md) · [Plano](plano-desenvolvimento.md)

TechBus é o Sistema para gestão de transporte universitário de Taís. Organiza dados, demanda diária e decisões operacionais; WhatsApp/IA é um componente. A proposta aprovada fundamenta a redução de consolidação manual, inconsistências e retrabalho, sem afirmar ganhos já medidos.

## Operação

Uma empresa, universitário noturno, Unimater e Unidep. Rota noturna conceitual: coleta compartilhada em São Lourenço, com origem comum a cadastrar, até a fiscalização na saída da cidade; transferência separa os alunos por universidade rumo a Pato Branco. O mesmo veículo permanece e retorna da universidade até a fiscalização. A distribuição às casas volta a misturar alunos das duas universidades por regiões.

A empresa define grupos locais diferentes para ida e volta e escolhe veículos de coleta/distribuição. Cada ponto pertence a um grupo de coleta e cada região a um grupo de distribuição, podendo um grupo reunir vários pontos/regiões. Desativar esses cadastros preserva referências, padrões e confirmações existentes, mas impede novas utilizações e exige ajuste manual. Não há recomendação local, agrupamento automático ou equilíbrio automático de tempos. Cada veículo atende um grupo na etapa de distribuição; veículos retornados de Pato Branco podem ser reutilizados depois, sem exclusividade pela noite inteira.

Recomendação somente intermunicipal, por universidade: menor veículo disponível capaz de max(contagem ida, contagem volta), preferindo um único veículo. Mesma capacidade gera opções equivalentes para escolha da empresa, que confirma o planejamento. Se nenhum comporta ou faltam veículos simultaneamente, alertar para solução manual, sem repartição automática nem dupla alocação simultânea. Frota: identificação/número, placa, tipo van/micro/ônibus, assentos de passageiros e disponibilidade.

## Cadastros, calendário e acesso

A equipe cadastra aluno com nome, telefone WhatsApp, universidade, dias habituais, ponto padrão de embarque, endereço padrão de desembarque e início/fim do contrato. Contrato representa somente vigência, sem pagamentos, mensalidades ou cobranças. Datas inicial/final inclusivas; rejeitar datas invertidas e sobreposição de vigências do mesmo aluno. Após término, suspender consultas e novas confirmações até renovação pela equipe. Aluno inativo também fica bloqueado; a desativação não cancela confirmações existentes, que exigem ajuste manual. Zero dias habituais é permitido para uso somente extra, sujeito a vigência, operação e prazo.

Calendário por universidade, com dias habituais e exceções de feriados, recessos e extras definidos pela empresa. Exceção por data prevalece sobre semana; correção vale para novas avaliações e preserva confirmações existentes para ajuste manual, sem envio automático. Não presumir operação sem configuração. Consultar somente se coincidem dia habitual do aluno, operação universitária e contrato vigente. Em dia extra do aluno, ele pode iniciar contato até 17h se houver operação e vigência. Sem operação, informar e orientar contato com a empresa, sem confirmar. Telefone desconhecido também é orientado à empresa, sem autocadastro.

| Perfil | Acesso |
| --- | --- |
| Administrador | Gerencia cadastros e operação; exclusivamente cria/convida usuários, define perfis/permissões e configurações gerais. |
| Operador | Gerencia alunos, vigências, veículos, motoristas, pontos, grupos, calendários e operação; confirma veículos e corrige listas. Não administra usuários/permissões nem configurações gerais. |
| Motorista | Somente consulta viagens atribuídas, nomes, pontos, trajetos e telefones de passageiros. Não edita. |

Há múltiplos logins, sem cadastro público, usando Supabase Auth com e-mail/senha individual. Admin convida, usuário define senha; recuperação por e-mail não reativa desativado. Perfis e autorização permanecem no NestJS. Detalhes em [decisões](decisoes.md#consolidação-da-entrevista--22102026). A empresa atribui motorista por veículo e trecho.

## Confirmações, comunicação e horários

Precisão confirmada: “até 17h” significa recebimento durável no backend antes de 17:00:00; cancelamento de volta “até 22h”, antes de 22:00:00, em America/Sao_Paulo. O registro ocorre antes da IA; demora de interpretação não muda o instante, chegada tardia não reabre prazo. Duplicatas não repetem efeitos; evento comprovadamente antigo não sobrescreve revisão mais recente e ordem incerta é encaminhada à equipe.

Até 17h, aluno confirma/revisa trechos e pontos; última informação explícita válida prevalece. “Vou” ou confirmação de ida implica ida e volta, salvo recusa explícita da volta. “Vou só na ida”/“vou só na volta” limita ao trecho indicado. “Não vou” significa nenhum trecho, salvo explicitação de só volta.

Sem resposta fica em lista própria destacada, fora dos confirmados e da capacidade. “Ainda não sei se vou” permanece indeciso, com lembretes, sem confirmar ida; sem confirmação até 17h, não conta. Se ida foi confirmada e volta ficou indecisa, manter ida e lembretes só da volta; às 17h incluir volta por padrão, marcando a origem. O resumo ao aluno informa essa regra e o cancelamento permitido até 22h. A regra nunca inclui quem não respondeu nada.

Após 17h, única ação do aluno: avisar que não volta até 22h. Sem novas confirmações, trocas de ponto ou aprovação tardia de aluno. Cancelamento atualiza listas/distribuição, sem implicar troca de ônibus já em Pato Branco. Admin/operador podem corrigir listas após 17h; exceder assentos gera alerta e exige ajustar alocação antes de confirmar planejamento. Alterações manuais não enviam notificação automática WhatsApp.

Consulta 05h; três lembretes 11h, 13h e 16h, America/Sao_Paulo, somente para pendências. Respostas definitivas encerram lembretes pertinentes. IA envia resumo final dos trechos/locais; se não compreender após esclarecimento, encaminha pendência à equipe sem presumir confirmação. Falha de envio fica destacada no painel, equipe pode tentar reenviar; não responder mantém pendência e falha posterior nunca apaga confirmação anterior.

## Locais e padrões

Até 17h, embarque somente em pontos pré-cadastrados. Desembarque pode ser endereço escolhido pelo aluno, aceito automaticamente se dentro das regiões atendidas, sem aprovação individual da empresa. Local válido deve pertencer a região/grupo; método técnico de validação permanece aberto. Fora da área: informar, pedir outro e preservar local anterior válido.

Mudanças normalmente valem só para o dia. Padrão muda apenas por pedido explícito ou consentimento. Na quarta utilização consecutiva do mesmo local alternativo, sugerir torná-lo padrão, separadamente para embarque e desembarque; alterar só se aceitar. Considerar apenas dias de uso do trecho: fins de semana/dias sem viagem não quebram sequência, outro local nesse trecho reinicia. Para operacionalizar sem check-in, usar registros de uso confirmado, considerando cancelamentos; isso não comprova embarque físico.

## Trajetos e limites

Cálculo automático do trajeto é alta prioridade, opcional se comprometer entrega. Google Maps é possibilidade, não decisão. Plano B se inviável/atrasar: empresa cadastra ordem por grupo/sentido, sistema filtra locais dos confirmados preservando ordem, sem promessa de otimização, equilíbrio de tempo ou distâncias calculadas. Inserção de novo endereço válido nessa ordem precisa de definição operacional; não perder o endereço nem inventar algoritmo.

Fora do MVP: colégio, diurno, múltiplas empresas, qualquer financeiro, rastreamento, comprovação de presença, autocadastro e interface de histórico de operação. Histórico consultável fica futuro. Manter registros mínimos para funcionamento e sequências de locais; retenção técnica a definir, sem exclusão automática presumida ao fechar o dia. Sugestão de pontos por geolocalização permanece futura.

Direção tecnológica, avaliação acadêmica e pendências estão em [decisões](decisoes.md); prazos em [plano](plano-desenvolvimento.md). Nenhuma implementação está autorizada por estes documentos.
