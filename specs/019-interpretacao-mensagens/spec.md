# Feature Specification: B18.3 — interpretação de mensagens

**Estado de 04/11/2026:** consultar [consolidação](../../docs/estado-atual.md). Envio/processamento habilitados no arquivo privado observado; afirmações de envio false/zero alunos abaixo são históricas. Iniciar o backend pode ativar executores. Casos manuais e T019 continuam pendentes; próximo incremento [B18.4](../020-contexto-conversa/tasks.md) apenas planejado.

Complemento vigente: [processamento interno e recibos](automation.md). O acionamento exclusivamente administrativo descrito na entrega inicial foi ampliado com executor interno opt-in, restrito a eventos persistidos de alunos ativos. Envio continua separado e desativado.

Created: 28/10/2026. Status: implementação autorizada pela continuidade. Diretório independente, sem branch Git nova.

## User Scenarios & Testing

### US1 — Entender respostas simples sem IA (P1)
Como equipe, preciso reconhecer comandos inequívocos sem consulta externa. Aceite: vou, não vou, só ida, só volta e cancelar volta geram propostas conhecidas; sim/não isolados sem pergunta comprovada permanecem ambíguos. Mensagem composta não pode perder ressalvas por correspondência parcial. Teste independente: tabela de frases, preservando indecisão e negações.

### US2 — Interpretar linguagem natural com limites (P1)
Como equipe, preciso de proposta estruturada para textos complexos, sem permitir que o interpretador decida identidade, prazo ou geografia. Aceite: intenção de ida/volta, pedido de local e pedido de padrão são preservados como proposta; saída inválida, falha, instruções maliciosas e ambiguidade não alteram viagem. Nenhuma aplicação parcial de uma mensagem composta. Teste independente com fornecedor substituto; uso real requer chave local.

### US3 — Processar recebimentos com rastreabilidade (P1)
Como operador/admin, preciso solicitar interpretação de uma mensagem recebida e consultar o resultado do dia. Aceite: uma tentativa por evento mesmo sob concorrência; manter recibo e primeiro instante; não reenviar ao fornecedor automaticamente após incerteza/interrupção. Desconhecido/mídia/conflito não são promovidos a aluno ou comando. Ordem não comprovada continua pendente; proposta não confirma viagem. Motorista não acessa interpretação.

## Requirements
- FR001: regras exatas primeiro; texto composto vai ao interpretador, nunca ao atalho por prefixo.
- FR002: sim/não sem contexto inequívoco ficam pendentes; não inferir pergunta a partir do último envio apenas.
- FR003: propostas complexas preservam todos os pedidos, sem execução parcial e sem inventar identidade, local validado ou permissão.
- FR004: interpretar somente após recebimento durável; revalidar conflito, identidade e autorização; preservar recibo/horário e ordem incerta.
- FR005: falhas do fornecedor, resposta inválida/bloqueada e interrupção ficam pendentes, sem retry automático nem confirmação.
- FR006: consulta e acionamento apenas por equipe ativa autorizada no dia corrente; nenhuma resposta WhatsApp automática.
- FR007: segredos locais e contexto mínimo; não enviar telefone/cadastro ao interpretador, nem guardar envelope bruto.

## Success Criteria
SC001: todos os exemplos inequívocos especificados são reconhecidos sem fornecedor. SC002: todos os casos ambíguos/compostos do ensaio preservam ressalvas ou permanecem pendentes. SC003: duplicatas concorrentes fazem no máximo uma consulta externa. SC004: nenhuma mensagem com ordem incerta modifica viagem, e seu primeiro recebimento é conservado.

## Key Entities
Mensagem recebida; tentativa de interpretação; proposta de ida/volta/local/padrão; motivo de pendência.

## Complemento de aceite — processamento e despacho

O complemento em automation.md amplia FR006: endpoints permanecem protegidos, enquanto executores internos opt-in processam eventos persistidos e despacham recibos. A configuração de envio real continua desativada; a restrição inicial de ausência de resposta automática descreve a entrega inicial.

- FR008: preparar o recibo atomicamente com a viagem aplicada, informando estados e locais registrados sem reconfirmação.
- FR009: reservar o despacho antes da chamada externa, revalidando destinatário, instância, jornada e contexto; nunca reenviar automaticamente tentativa incerta ou interrompida.
- SC005: execuções concorrentes geram uma única chamada de despacho; mudança anterior à reserva invalida recibo desatualizado. Aceite do provedor não comprova entrega/leitura. Mudança durante a chamada externa não permite retirar mensagem em trânsito.

## Assumptions and limits
B18.2 já recebe texto real, mas todos os recibos Evolution têm ordem incerta. Interpretar não resolve essa prova: revisão B13 permanece o caminho aprovado para correções. A confirmação automática completa depende de mecanismo posterior comprovado de contexto/ordem; não relaxar a regra. Não habilitar envio, agendador, geocodificação, cadastro público nem IA antes de credencial configurada. Cadastro fictício para ensaio será explícito, sem converter o contato desconhecido retroativamente. Modelo/parâmetros são escolhas técnicas documentadas na pesquisa, não promessa de custo ou disponibilidade da conta.
