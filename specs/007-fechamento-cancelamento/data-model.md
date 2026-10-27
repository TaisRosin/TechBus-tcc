# Data model — B08
Migração aditiva preserva registros B07:
- daily_journeys.dropoff_state admite cancelado; dropoff_origin admite padrao_fechamento; pickup mantém estados/origens anteriores.
- closed_sequence integer nullable >0: última revisão ordinária conciliada com fechamento.
- closure_issue text nullable: motivo de bloqueio por elegibilidade/contexto na revisão fechada.
- closure_base_state text nullable em sem_resposta/indeciso: estado anterior à confirmação padrão; permite reconciliar comando tempestivo sem tratar padrão como resposta explícita.
- cancel_sequence integer nullable >0: cancelamento pós-17 efetivo. Não substitui last_sequence de comandos ordinários; nenhum deles restaura retorno cancelado.
- journey_receipts.cancel_requested boolean NOT NULL DEFAULT false: intenção validada para conciliar cancelamento pendente após interpretar comando anterior.
- Índice daily_journeys(date,student_id) para varredura limitada do dia. Reutilizar índices de recibos por aluno/data/sequence.

Fechar somente ida confirmada com volta sem_resposta/indeciso e elegibilidade atual; manter locais existentes e usar padrão ativo se retorno recém-confirmado ainda sem local. Sem local confirma com ajuste B07. Marca de fechamento não muda last_sequence. Cancelamento tira apenas retorno da demanda; informação explícita tardia tempestivamente recebida ainda pode atualizar ida sem restaurar volta. Sem DELETE, limpeza automática ou exposição de histórico.
