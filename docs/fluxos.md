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
2. “Vou” ou confirmação da ida inclui ida e volta salvo recusa explícita de volta. “Vou só na ida”/“vou só na volta” limita ao trecho. “Não vou” significa nenhum, salvo só volta explicitada. Até 17h, última informação explícita válida prevalece.
3. Apresentar locais padrões. Embarque só entre pontos pré-cadastrados; desembarque pode ser endereço escolhido, automaticamente aceito dentro da área/região atendida. Fora da área, pedir outro e preservar anterior válido. Alterações normalmente só para o dia.
4. Respostas definitivas encerram lembretes pertinentes. Indeciso sobre ida mantém pendência e lembretes; sem confirmar ida até 17h não conta. Se ida confirmada e volta indecisa, lembrar somente volta.
5. Se IA não compreende, pedir esclarecimento; persistindo dúvida, registrar pendência para equipe sem presumir confirmação. “Só vou” isolado não é exemplo inequívoco.
6. IA envia resumo dos trechos e locais. Para ida confirmada e volta indecisa, informar que volta será considerada confirmada às 17h e poderá ser cancelada até 22h.

Falhas de envio/WhatsApp ficam destacadas no painel, com tentativa de reenvio pela equipe. Ausência de resposta mantém pendência; uma falha posterior não remove confirmação válida anterior.

## Fechamento às 17h

Consolidar últimas informações válidas por sentido. Sem resposta fica em lista própria e não entra na capacidade. Indecisão de ida não gera confirmação. Para quem confirmou ida e não recusou volta, incluindo quem declarou volta indecisa, aplicar volta padrão às 17h e sinalizar origem à equipe. Não aplicar essa regra a quem não respondeu nada.

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
