# Dados — B09
Reutilizar integralmente [B07](../006-jornada-comandos/data-model.md) e [B08](../007-fechamento-cancelamento/data-model.md). Nenhum campo/tabela/migração novo. O recebimento só é autoritativo depois de concluído; tentativa revertida não reserva instante nem consome idempotência. Estado e resultado são atômicos na transação existente.
Identidade corrente: (student_id,id interno UUID). Chaves/namespace/digest de envelope do provedor ainda não são contrato real entregue. Não armazenar texto bruto ou criar retenção por conveniência de teste.
