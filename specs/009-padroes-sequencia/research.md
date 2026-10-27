# Research — B10
- Decisão: reutilizar daily_journeys (única por aluno/data); selecionar somente trechos confirmados até data atual. Motivo: revisões/cancelamentos já persistem estado correto, evitando divergência de contadores. Alternativa rejeitada: segunda tabela de contribuições sincronizada em todos os caminhos.
- Decisão: proposta derivada com chave estável aluno/trecho/início/local; versão do padrão é precondição separada. Motivo: quinto uso não cria outra proposta; recusa continua válida na mesma sequência. Propostas não são comprovantes de envio.
- Decisão: persistir decisões imutáveis vinculadas a recibo, e padrão/evidência/resultados na mesma transação. Motivo: idempotência e rastreabilidade mínima; não manter texto bruto.
- Decisão: suspensão se uma confirmação sem local aparece na sequência potencial; local diferente conhecido delimita sequência. Após resolução, reavaliar. Sem padrão não presumir alternativo.
- Decisão: comandos internos separados de jornada, usando recibo B07 e limite estrito antes de 17h. Nenhuma mutação HTTP de aluno; equipe mantém cadastro B06. Falta de identidade real continua B18.
- Sem desconhecidos técnicos que exijam pesquisa externa, nova biblioteca ou delegação. Referências de locking/índices da skill PostgreSQL lidas; versões existentes preservadas.
