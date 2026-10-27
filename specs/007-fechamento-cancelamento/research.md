# Research — B08
- Decisão: mesmas versões e pools B07, sem pesquisa de substitutos. Motivo: stack já testada; nenhum requisito novo exige dependência.
- Decisão: marca de revisão fechada e estado de volta anterior ao padrão. Motivo: evitar reprocessamento e distinguir derivação de informação explícita. Alternativa rejeitada: fechamento irreversível que descarta comando tempestivo.
- Decisão: sequência de cancelamento separada da revisão ordinária. Motivo: resposta de ida interpretada depois não deve ser perdida nem restaurar retorno cancelado. Alternativa rejeitada: usar exclusivamente lastSequence para ambos.
- Decisão: preservar intenção restrita de cancelamento quando falta interpretar mensagem anterior; reaplicar após conciliação, sem nova confirmação presumida. Sem texto bruto/IA armazenado.
- Decisão: bloqueio por inelegibilidade é registrado na revisão fechada. Repetir executor não cria nova confirmação após reativação; nova revisão tempestiva é conciliada com revalidação atual. Confirmações existentes preservadas.
- Decisão: operações internas e lote paginado, sem cron/provedor real. Estruturas/locks seguem habilidades PostgreSQL/NestJS já adotadas. TDD nas fronteiras públicas existentes, sem testes de métodos privados.
