# Requisitos e critérios de aceitação

[Início](../README.md) · [Escopo](escopo.md) · [Requisitos](requisitos.md) · [Fluxos](fluxos.md) · [Decisões](decisoes.md) · [Plano](plano-desenvolvimento.md)

Regras vigentes de TechBus. Os critérios são para validação futura; não indicam testes ou implementação já realizados. Registros de ida/volta são separados, com a regra padrão de volta descrita abaixo.

Precisão confirmada: “até 17h” significa recebimento durável no backend antes de 17:00:00; cancelamento de volta “até 22h”, antes de 22:00:00, em America/Sao_Paulo. O registro ocorre antes da IA; demora de interpretação não muda o instante, chegada tardia não reabre prazo. Duplicatas não repetem efeitos; evento comprovadamente antigo não sobrescreve revisão mais recente e ordem incerta é encaminhada à equipe.

| ID | Requisito | Critério de aceitação |
| --- | --- | --- |
| R01 | Cadastro do aluno pela equipe. | Nome, telefone WhatsApp, universidade, dias habituais, padrões de embarque/desembarque e início/fim de contrato. Sem autocadastro nem campos financeiros. Dias habituais podem ser vazios para uso somente extra, sem consultas habituais automáticas. |
| R02 | Vigência e identificação. | Telefone cadastrado identifica aluno; desconhecido é orientado à empresa. Vigência inclui datas inicial/final; rejeitar datas invertidas e sobreposição para o mesmo aluno. Contrato encerrado impede consultas e novas confirmações até renovação. Inatividade também bloqueia essas ações, sem cancelar confirmações existentes; ajustes são manuais pela equipe. |
| R03 | Calendário por universidade. | Empresa define dias e exceções; consulta automática só com dia habitual do aluno, operação da universidade e vigência. Dia extra iniciado pelo aluno até 17h segue regras se houver operação; sem operação não confirmar. Exceção por data prevalece sobre semana; correções valem em novas avaliações, preservando confirmações existentes para ajuste manual, sem envio automático. |
| R04 | Consulta e lembretes. | 05h inicial; 11h, 13h e 16h lembretes em America/Sao_Paulo, só pendências; resposta definitiva encerra lembretes do trecho. Ida resolvida permite lembretes apenas de volta. |
| R05 | Interpretar e revisar respostas até 17h. | “Vou”/confirmação de ida inclui ambos salvo recusa explícita de volta; só ida/só volta limita ao trecho; “não vou” nenhum salvo só volta explícita. Última informação explícita válida prevalece. Confirmado B07: “vou” após “só ida” preserva a recusa de volta até alteração explícita desse trecho. |
| R06 | Distinguir ausência e indecisão de ida. | Sem resposta em lista própria, fora dos confirmados/capacidade. “Ainda não sei se vou” recebe lembretes e continua distinto de sem resposta; sem confirmação de ida até 17h não entra na contagem de ida. |
| R07 | Aplicar padrão de volta para ida confirmada. | Ida confirmada + “ainda não sei se volto”: manter ida e pendência de volta até fechamento; às 17h incluir volta em lista/capacidade, sinalizar origem padrão e informar aluno no resumo sobre confirmação e cancelamento até 22h. Não aplicar a não respondentes. Confirmado B08: perda de elegibilidade impede nova volta padrão, preserva confirmações existentes e exige ajuste manual. |
| R08 | Resumo e incompreensão. | IA informa trechos/locais finais e regra padrão quando aplicável. Se esclarecimento não resolve, encaminhar pendência à equipe, sem inventar confirmação ou apagar informação válida anterior. |
| R09 | Bloquear ações do aluno após 17h. | Rejeitar nova ida/volta, troca de ponto e revisões, exceto cancelamento explícito de volta confirmada até 22h. Não criar fluxo de aprovação tardia. |
| R10 | Cancelamento de volta. | Até 22h retira volta das listas e atualiza distribuição; preserva ida e não implica trocar veículo que já está em Pato Branco. Após 22h aluno não altera. |
| R11 | Correção pela equipe. | Admin/operador corrigem listas mesmo após 17h; se demanda excede assentos, alertar e exigir ajuste da alocação antes de confirmar planejamento. Correção manual não dispara WhatsApp automático. |
| R12 | Validar locais até 17h. | Ida apenas ponto pré-cadastrado; volta aceita automaticamente endereço dentro de regiões atendidas e vinculado a grupo/região. Fora da área, solicitar outro e manter anterior válido. Não exigir aprovação individual do endereço válido. |
| R13 | Preservar padrões e sugerir alteração. | Troca diária não muda padrão. Pedido explícito ou aceite permite mudar. Na quarta utilização consecutiva do mesmo alternativo sugerir; contar por trecho, ignorar dias sem uso, reiniciar com outro local. Base em uso confirmado, não presença física. |
| R14 | Cadastros operacionais/frota. | Rota noturna, universidades, grupos separados por sentido, pontos, regiões e motoristas; veículo com identificação/número de frota, placa, tipo van/micro/ônibus, assentos de passageiros e disponibilidade. |
| R15 | Organização local manual. | Empresa define grupos e escolhe veículos de coleta/distribuição; ponto tem um grupo de coleta e região um grupo de distribuição, com vários pontos/regiões por grupo. Desativação preserva referências, impede novas utilizações e indica ajuste manual; sem recomendação local, agrupamento ou equilíbrio automático. Na distribuição cada veículo atende um grupo e pode ter retornado de Pato Branco. |
| R16 | Recomendação intermunicipal. | Por universidade, menor disponível suficiente para max(ida, volta), nunca soma; priorizar um veículo, mostrar mesma capacidade como equivalente e exigir confirmação da empresa. |
| R17 | Insuficiência e simultaneidade. | Sem capacidade ou frota suficiente, alertar e deixar decisão manual, sem repartição automática nem dupla alocação simultânea. Reuso em etapa posterior é permitido. |
| R18 | Etapas da viagem e atribuição de motorista. | Coleta mista até fiscalização; ida/retorno de Pato Branco por universidade no mesmo veículo que permanece lá; distribuição mista por regiões. Empresa atribui motorista por veículo/trecho. |
| R19 | Painel e falhas de mensagens. | Mostrar respostas/contagens por universidade, trecho, grupo e local, pendentes, origem padrão da volta, cancelamentos e falhas de envio. Equipe pode tentar reenviar; falha não sobrescreve confirmação prévia. |
| R20 | Perfis e múltiplos logins. | Supabase Auth com e-mail/senha individual, convite do admin e senha definida pelo usuário; recuperação por e-mail não reativa desativado. Token validado e permissões/usuário ativo conferidos no NestJS.  Só admin cria/convida usuários, atribui perfil e gerencia configurações gerais, sem cadastro público. Três perfis fixos, um por usuário, sem permissões personalizadas. Múltiplos admins permitidos; impedir desativar/rebaixar o último admin ativo, inclusive por ele próprio e sob concorrência. Admin/operador gerenciam cadastros, calendários e operação. Motorista só lê viagens atribuídas, nomes, locais, trajetos e telefones; sem edição. |
| R21 | Plano B de trajeto. | Quando necessário, filtrar locais confirmados por grupo/sentido na ordem cadastrada, sem reordenar nem prometer tempo/distância/otimização. Novo local permanece pendente até inserção manual pela equipe; publicação completa bloqueada até ordenar. Mudança padrão exige publicação explícita do dia (B16). |
| R22 | Limites dos registros. | Sem histórico operacional consultável no MVP e sem presença/check-in. Manter dados mínimos para operação e sequência de locais; retenção a definir, sem exclusão presumida ao fim do dia. |

**O01 — Trajeto automático:** alta prioridade, opcional se comprometer entrega; grupos continuam manuais. Serviço, critérios técnicos e mapas ainda não escolhidos. Plano B é contingência validada, não abandono imediato.

## Casos críticos para revisão e futura validação

Rastreabilidade e limites da revisão local: [matriz B17](../specs/016-revisao-backend/coverage.md). A evidência sintética não encerra requisitos dependentes de serviços reais ou da interface visual.

| Caso | Resultado esperado |
| --- | --- |
| Alteração recebida às 16:59:59 e interpretada após 17h | Usar recebimento durável anterior ao corte; conciliar fechamento sem tratar como nova confirmação tardia. |
| Alteração ordinária recebida exatamente às 17:00:00 | Rejeitar; a exceção permanece somente cancelamento de volta confirmada antes de 22h. |
| Cancelamento de volta recebido exatamente às 22:00:00 | Rejeitar alteração do aluno. |
| Reentrega da mesma mensagem ou evento comprovadamente antigo | Não repetir efeito nem sobrescrever revisão mais recente; ordem incerta vira pendência à equipe. |
| Contrato de 01 a 30/11; renovação desde 01/12 | Datas inicial/final cobertas; rejeitar datas invertidas e qualquer sobreposição para o mesmo aluno. |
| Usuário desativado recupera senha ou apresenta token ainda válido | Não liberar acesso operacional; verificar vínculo ativo e permissões no NestJS. |
| Convite inválido/expirado | Não liberar acesso; orientar e permitir reenvio pelo admin. |
| Nenhuma resposta até 17h | Nenhum trecho confirmado; lista própria destacada; zero contribuição à capacidade. |
| “Ainda não sei se vou”, sem confirmação posterior | Indecisão, não ausência de resposta; não confirma ida nem induz volta por padrão. |
| “Vou só na volta” até 17h | Apenas volta confirmada, mesmo sem ida. |
| “Vou só na ida” até 17h | Ida confirmada, volta recusada; padrão não reverte recusa explícita. |
| Ida confirmada e volta indecisa às 17h | Volta incluída por padrão com origem identificada; resumo explica e permite cancelar até 22h. |
| Após dizer “vou”, informa “não vou” antes de 17h | Última informação explícita válida remove ambos, salvo declaração de só volta. |
| Novo pedido às 17h30 ou mudança de endereço às 18h | Aluno não altera; não abrir aprovação tardia. Correções da equipe são operação separada. |
| Cancela volta às 21h | Atualizar volta/distribuição, sem trocar automaticamente veículo em Pato Branco. |
| Correção manual leva demanda de 40 a 42 para 40 assentos | Alertar e exigir ajuste de alocação antes de confirmar planejamento; sem WhatsApp automático. |
| Ida 30, volta 40; dois veículos disponíveis de 44 assentos | Demanda 40, não 70; opções de 44 equivalentes se forem as menores suficientes; empresa escolhe, sem dupla alocação simultânea. |
| Endereço fora da área após local válido | Preservar válido e solicitar alternativa; não substituir por inválido. |
| Alternativo usado sexta, segunda, quarta e sexta, sem uso do trecho entre esses dias | Quarta utilização consecutiva gera sugestão; aceitar muda padrão, recusar preserva. Usar outro local no trecho reinicia sequência. Não comprova presença física. |
| Falha em lembrete depois de resposta válida | Sinalizar falha sem apagar confirmação; reenvio disponível à equipe. |
| Motorista tenta editar ou consultar viagem não atribuída | Não permitir; leitura restrita às próprias atribuições, incluindo telefones autorizados. |

Pendências específicas em [decisões](decisoes.md#pendências); não reabrir regras já resolvidas.

## Precisão B07 — locais pendentes
Confirmado por Taís em 23/10/2026: intenção explícita sem local válido confirma e conta na demanda do trecho, sinalizando pendência. Não inventar endereço nem apresentar local inválido como validado. Resolver a pendência antes de concluir o planejamento operacional; não confundir confirmação do aluno com confirmação do planejamento.
## Precisão de R13 — B10
Confirmado B10: após recusa, não repetir sugestão na mesma sequência; outro local e quatro novas utilizações do alternativo permitem nova proposta. Uso confirmado sem local identificado suspende a sugestão até resolução e recálculo, preservando a confirmação na demanda.

## Precisão de R14/R18 — B11
Decisões B11 confirmadas em 25/10/2026: disponibilidade por faixas de início/fim informadas pela empresa e associadas às etapas; ciclo intermunicipal inclui ida, permanência e retorno. Programação semanal por veículo, com exceção por data prevalecendo. Sem configuração, não presumir disponibilidade.

## Precisão de R16/R17 — B12
Confirmado em 25/10/2026: opções/rascunhos antes das 17h; confirmação definitiva somente após fechamento e resolução das pendências. Empresa pode escolher veículo maior disponível e suficiente; recomendação permanece a menor capacidade adequada. Mudanças posteriores exigem revisão, sem troca automática do veículo. [Decisão B12](decisoes.md#b12--alocação-e-planejamento).

## Precisão de R11 — B13
Correção manual altera apenas trechos/campos selecionados; não infere volta ao confirmar ida pela equipe. Pendências anteriores só são encerradas mediante revisão explícita e justificativa, sem permitir que interpretação atrasada desfaça a correção. Prazos do aluno, validação de locais/elegibilidade e cancelamento posterior válido permanecem. [Spec B13](../specs/012-correcoes-equipe/spec.md).

## Precisão de R21/O01 — B16
Novo local confirmado sem posição permanece na demanda e impede publicar itinerário completo até inserção manual pela equipe. Alteração de ordem padrão exige publicação explícita do itinerário do dia; última ordem publicada permanece com alerta e cancelamentos filtram paradas vazias imediatamente. Publicação não altera grupos, veículos ou confirmações. Automático continua prioritário, com contrato e viabilidade condicionada preparados, sem integração real. [Decisões B16](decisoes.md#b16--trajeto-e-contingência).

## Precisão de R19/R20/R22 — B15
Consulta operacional inclui respostas, origens, contagens, pendências e comunicação. Motorista ativo e explicitamente vinculado lê somente seus trechos confirmados, com telefones necessários. Revisão não publica rascunhos nem reassocia passageiros; cancelados saem imediatamente. Janela: hoje e operação anterior enquanto algum trecho confirmado não atingiu o fim previsto. Sem histórico ou reabertura de comandos. [Spec B15](../specs/014-consultas-operacionais/spec.md).

## Precisão de R04/R19 — B14
Recuperação após indisponibilidade considera somente o contato mais recente ainda pertinente antes das 17h, sem acumular horários perdidos. Extra válido iniciado pelo aluno recebe próximos lembretes de pendências, sem consulta inicial não habitual. Reenvio exige falha conhecida e pertinência atual; não repete enviado nem resultado incerto. [Decisões B14](decisoes.md#b14--mensagens-e-agendamentos-simulados).
