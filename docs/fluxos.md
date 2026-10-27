# Fluxos operacionais

[Início](../README.md) · [Escopo](escopo.md) · [Requisitos](requisitos.md) · [Fluxos](fluxos.md) · [Decisões](decisoes.md) · [Plano](plano-desenvolvimento.md)

## Preparação da operação

Primeiro administrador por procedimento controlado. Depois, administrador convida usuários por e-mail e define perfis e configurações gerais; cada usuário valida convite e escolhe senha no Supabase Auth. Login por e-mail/senha, saída explícita e recuperação por e-mail; recuperação não reativa desativado. Convite inválido/expirado permite reenvio pelo admin; troca/perda de e-mail exige verificação da pessoa pela administração. NestJS verifica token, vínculo ativo e permissões. Cada usuário tem um único perfil fixo, sem permissões personalizadas. Admin pode alterar perfil/ativação, preservando sempre um admin ativo; alterações confirmadas valem na próxima solicitação. Duração de sessão e procedimentos externos detalhados ainda pendentes. Admin/operador cadastram alunos e vigências, veículos, motoristas, pontos, regiões/grupos por sentido e calendários por universidade. Empresa atribui motoristas por veículo/trecho. Motorista somente consulta viagens atribuídas, com nomes, telefones, pontos e trajetos.

Grupos de coleta e distribuição são separados e manuais. Cada ponto tem um grupo de coleta; cada região um grupo de distribuição; um grupo pode reunir vários pontos/regiões. Cadastros desativados mantêm referências e padrões, bloqueiam novas utilizações e indicam ajuste manual, sem alterar confirmações existentes. Origem comum da coleta, áreas atendidas e cadastros reais serão preenchidos pela empresa. Desembarque válido pertence a região/grupo; método técnico para verificar isso ainda precisa ser definido.

## Elegibilidade e contato

1. Verificar telefone cadastrado, aluno ativo e contrato vigente, incluindo datas inicial/final. Cadastro rejeita datas invertidas e sobreposição de vigências do mesmo aluno. Número desconhecido: orientar contato com empresa, sem autocadastro. Contrato terminado: impedir novas confirmações e suspender consultas até renovação.
2. Zero dias habituais é permitido para uso somente extra; não gera consultas habituais. Desativar aluno preserva confirmações existentes para ajuste manual. Consulta automática só quando coincidem dia habitual do aluno e dia de operação de sua universidade, incluindo exceções de calendário, que prevalecem sobre a semana. Correções valem imediatamente para novas avaliações, preservando confirmações existentes para ajuste manual e sem mensagens automáticas.
3. Dia extra: aluno inicia conversa até 17h; havendo operação e vigência, aplicar as mesmas regras. Sem operação, informar e orientar contato com empresa, sem confirmar.

## Conversa até 17h

Precisão confirmada: “até 17h” significa recebimento durável no backend antes de 17:00:00; cancelamento de volta “até 22h”, antes de 22:00:00, em America/Sao_Paulo. O registro ocorre antes da IA; demora de interpretação não muda o instante, chegada tardia não reabre prazo. Duplicatas não repetem efeitos; evento comprovadamente antigo não sobrescreve revisão mais recente e ordem incerta é encaminhada à equipe.

1. Enviar consulta às 05h. Três lembretes às 11h, 13h e 16h, America/Sao_Paulo, somente para pendências.
2. “Vou” ou confirmação da ida inclui ida e volta salvo recusa explícita de volta. “Vou só na ida”/“vou só na volta” limita ao trecho. “Não vou” significa nenhum, salvo só volta explicitada. Até 17h, última informação explícita válida prevalece. Confirmado B07: após “só ida”, novo “vou” preserva a recusa de volta até alteração explícita desse trecho.
3. Apresentar locais padrões. Embarque só entre pontos pré-cadastrados; desembarque pode ser endereço escolhido, automaticamente aceito dentro da área/região atendida. Fora da área, pedir outro e preservar anterior válido. Alterações normalmente só para o dia.
4. Respostas definitivas encerram lembretes pertinentes. Indeciso sobre ida mantém pendência e lembretes; sem confirmar ida até 17h não conta. Se ida confirmada e volta indecisa, lembrar somente volta.
5. Se IA não compreende, pedir esclarecimento; persistindo dúvida, registrar pendência para equipe sem presumir confirmação. “Só vou” isolado não é exemplo inequívoco.
6. IA envia resumo dos trechos e locais. Para ida confirmada e volta indecisa, informar que volta será considerada confirmada às 17h e poderá ser cancelada até 22h.

Falhas de envio/WhatsApp ficam destacadas no painel, com tentativa de reenvio pela equipe. Ausência de resposta mantém pendência; uma falha posterior não remove confirmação válida anterior.

## Fechamento às 17h

Consolidar últimas informações válidas por sentido. Sem resposta fica em lista própria e não entra na capacidade. Indecisão de ida não gera confirmação. Para quem confirmou ida e não recusou volta, incluindo quem declarou volta indecisa, aplicar volta padrão às 17h e sinalizar origem à equipe. Não aplicar essa regra a quem não respondeu nada. Confirmado B08: aluno inativo, sem vigência ou sem operação não recebe nova volta padrão; preservar confirmações existentes e sinalizar ajuste manual.

Depois do fechamento não aceitar do aluno novas confirmações, revisões de locais ou pedidos de aprovação tardia. Única ação restante: cancelar volta confirmada até 22h.

## Planejamento de veículos e trajeto

1. Por universidade, calcular max(ida, volta) antes da saída, incluindo volta padrão aplicável. Recomendar menor veículo disponível suficiente; mesma capacidade são alternativas equivalentes. Empresa confirma.
2. Se não houver capacidade ou frota simultânea suficiente, alertar; solução manual, sem repartição automática nem duplicação simultânea.
3. Empresa escolhe veículos locais e mantém grupos manuais. Cálculo automático de trajeto é prioritário; se inviável/atrasar entrega, usar ordem cadastrada por grupo/sentido filtrada pelos locais confirmados. Não inventar ordem para novo endereço válido; tratar a pendência de inserção sem perdê-lo.

## Percurso

Veículos coletam juntos alunos das duas universidades em São Lourenço, a partir de origem comum, até fiscalização. Ali a transferência separa por universidade rumo a Pato Branco. Mesmo veículo permanece e retorna da universidade à fiscalização. Depois os alunos das duas universidades se reúnem por grupos regionais de distribuição, diferentes dos grupos da coleta. Cada veículo atende um grupo nessa etapa; veículos retornados podem ser reutilizados.

## Depois das 17h

- Aluno com volta confirmada pode avisar explicitamente que não voltará até 22h: atualizar listas/distribuição, sem implicar troca de ônibus já em Pato Branco. Após 22h, aluno não altera.
- Admin/operador podem corrigir listas, inclusive por contato telefônico. Se exceder assentos, alertar e exigir ajuste da alocação antes de confirmar planejamento. Não disparar mensagem automática pelo WhatsApp por alteração manual.

## Padrões de locais e registros

Pedido explícito pode mudar padrão; sugestão do sistema só muda com aceite. Na quarta utilização consecutiva do mesmo local alternativo, sugerir separadamente para ida/volta. Contar apenas dias com uso confirmado do trecho, considerando cancelamentos; dias sem viagem não quebram sequência, outro local reinicia. Trata-se de intenção registrada, não presença física ou check-in.

Guardar o mínimo necessário para funcionamento e sequências. Sem interface de histórico de operação no MVP; retenção técnica ainda pendente, sem presumir exclusão no encerramento do dia.

## Precisão B07 — locais pendentes
Confirmado por Taís em 23/10/2026: intenção explícita sem local válido confirma e conta na demanda do trecho, sinalizando pendência. Não inventar endereço nem apresentar local inválido como validado. Resolver a pendência antes de concluir o planejamento operacional; não confundir confirmação do aluno com confirmação do planejamento.
## Precisão B10 — sugestões de padrão
Confirmado B10: após recusa, não repetir sugestão na mesma sequência; outro local e quatro novas utilizações do alternativo permitem nova proposta. Uso confirmado sem local identificado suspende a sugestão até resolução e recálculo, preservando a confirmação na demanda.

## Disponibilidade B11
Decisões B11 confirmadas em 25/10/2026: disponibilidade por faixas de início/fim informadas pela empresa e associadas às etapas; ciclo intermunicipal inclui ida, permanência e retorno. Programação semanal por veículo, com exceção por data prevalecendo. Sem configuração, não presumir disponibilidade.
Avaliação de propostas não equivale a reserva/alocação confirmada. Reuso posterior depende de não sobrepor ocupação; permanência intermunicipal mantém veículo ocupado.

## Confirmação do planejamento B12
Consultar demanda/opções → salvar escolhas manuais → aguardar fechamento das 17h e resolver pendências → revisar demanda atual → confirmar. Menor intermunicipal adequado é recomendado, com equivalentes; maior adequado pode ser escolhido manualmente. Locais não recebem recomendação automática. Rascunho não reserva. Alteração de rascunho ou cancelamento posterior preserva ocupações confirmadas, sinalizando ajuste. Falha de nova confirmação preserva a anterior; nenhuma mensagem é enviada automaticamente. [Contrato](../specs/011-alocacao-planejamento/contracts/http.md).

## Correção administrativa B13
Equipe consulta jornada e pendências do dia → confere informação → seleciona alterações e pendências revisadas → informa justificativa → salva. Se uma nova pendência ou revisão chegou durante a edição, recarregar antes de confirmar. Correção identifica origem da equipe e preserva trechos omitidos; ida manual não gera volta automática. Pendências revisadas não são reaplicadas depois. Reavaliar a alocação quando a demanda muda, sem liberar veículos ou enviar mensagem automaticamente. Alterar local do dia não altera padrão; B10 recalcula pela jornada atualizada.

## Publicação do itinerário B16
Equipe mantém ordem por grupo/sentido → consulta prévia filtrada dos confirmados → insere manualmente locais pendentes → publica com planejamento confirmado e prévia atual. Mudança posterior da ordem padrão não muda a sequência publicada sem ação explícita. Motorista vê apenas locais dos próprios passageiros, cancelamentos refletem imediatamente e pendências/revisões têm alerta. Substituição confirmada do plano exige publicação compatível. Sem otimização, distâncias ou tempos inventados. [Spec B16](../specs/015-trajeto-contingencia/spec.md).

## Consulta operacional B15
Precisão técnica verificada em B17: local desativado exige ajuste local, mas não retira confirmado do intermunicipal quando universidade/sentido permanecem inequívocos; nesse caso o local é pendente e há alerta.
Admin vincula uma conta de motorista ao cadastro correspondente. Equipe consulta estados, origens, contagens e comunicação; confirma o planejamento pelos fluxos existentes. Motorista consulta somente seus trechos confirmados e passageiros por sentido. Cancelamento retira aluno da lista; revisão mantém atribuição com alerta, sem publicar rascunho ou transferir associação ambígua. Após meia-noite, a operação anterior permanece consultável até o fim previsto do último trecho confirmado. [Spec B15](../specs/014-consultas-operacionais/spec.md).

## Rotina de comunicação B14
Executor interno prepara somente o último slot pertinente antes das 17h; pedidos extras válidos participam dos lembretes posteriores ao início, sem consulta inicial não habitual. Despacho revalida estado e reserva tentativa durável; envio ocorre fora da transação. Falha não altera jornada; incerteza não permite reenvio cego. Depois das 17h, reusar fechamento e aviso de volta padrão, refletindo cancelamento e prazo atual. Correções manuais não disparam comunicação. [Spec B14](../specs/013-mensagens-agendamentos/spec.md).
