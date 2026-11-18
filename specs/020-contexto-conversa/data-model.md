# Persistência B18.4

Migração prevista: `1794700000000-conversation-context.ts`, após pontos fixos.

- `whatsapp_events.reply_to`: identificador citado autenticado, opcional; não muda a ordem nem o recebimento original. Metadados contraditórios não produzem vínculo.
- `conversation_clarifications`: chave do evento inicial, aluno, instância, telefone, dia, finalidade, proposta original, hash do contexto, texto, estado, identificador do provedor e instantes de reserva/resultado. Uma pergunta por evento e uma cadeia ativa por aluno/dia. Resultado incerto permanece reservado sem reenvio.
- `message_interpretations.context_event_id`: pergunta utilizada para interpretar a resposta, revalidada na aplicação.

Estados: prepared → sending → sent/unknown; prepared/sent podem tornar-se superseded; sent → answered/escalated. Uma resposta insuficiente encerra a tentativa automática para revisão da equipe, conforme aprovação de Taís em 05/11. Não apaga evidências nem confirma viagem.

Aplicação e consumo são atômicos; somente o recibo de origem daquela pergunta pode ser encerrado junto à resposta válida. Hash inclui cadastro, padrões, jornada, vigência e calendário; correções invalidam contexto anterior. Índices atendem busca por identificação do provedor e fila preparada. Papel da aplicação tem SELECT/INSERT/UPDATE, sem DELETE.
