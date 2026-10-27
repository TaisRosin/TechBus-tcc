# Research B14
- Decisão: outbox + tentativa durável, adaptador fora da transação. Evita manter locks durante comunicação e distingue falha de resultado desconhecido; transação única envolvendo rede foi descartada.
- Decisão: sending/unknown não reenviam automaticamente. Sem prova do fornecedor, timeout não prova ausência de entrega; reconciliação real fica B18.
- Decisão: chave única aluno/data/slot e retry versionado. Diferentes workers/requisições não repetem a oportunidade; falha conhecida pode ser reenviada após nova validação.
- Decisão: marcador explícito studentInitiated preservado na jornada. Origem atual dos trechos pode ter sido substituída pela equipe; não inferir solicitação extra apenas pela existência da jornada. Registros anteriores sem prova ficam false, sem contato automático adicional; dados reais ainda não cadastrados. studentInitiatedAt registra o primeiro recebimento elegível para selecionar os próximos lembretes.
- Decisão: slots e texto determinísticos, reutilizando returnGuidance B08. Não instalar fornecedor/fila/cron; testes controlam relógio e porta.
