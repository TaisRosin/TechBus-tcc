# Research — B09
- Decisão: preservar núcleo transacional B07/B08. Motivo: invariantes já cobertas; B09 adiciona prova de rollback/retomada em pontos de falha ainda não exercitados. Não refazer arquitetura.
- Decisão: nenhuma nova tabela/migração. Recibos, resultados e marcas atuais suportam deduplicação e retomada.
- Decisão: injeção de falha na porta pública do store, delegando à transação PostgreSQL real. Alternativa rejeitada: simular banco em memória, que não comprova rollback.
- Decisão: entrada nomeada para ordem desconhecida. Motivo: um futuro adaptador não deve confundir sequência de chegada com prova externa. Sem novo formato presumido do Evolution ou verificador fictício.
- Decisão: lote usa processed/failed e expõe pendências. Motivo: “executado” não equivale a planejamento aprovado. Sem mudar estados de jornada ou regras da empresa.
