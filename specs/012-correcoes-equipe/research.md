# Research B13
- Decisão: reutilizar sequência de recibos com entrada interna finalizada para a correção. Justificativa: barreira única já serializada pelo aluno e lock de locais; alternativa de relógios/ordens independentes complicaria conciliação.
- Decisão: informar IDs pendentes revisados, exigindo conjunto exato atual. Justificativa: não encerrar mensagem nova que equipe não viu; flag genérica de revisão foi descartada.
- Decisão: registrar correção em tabela imutável com hash e resultado. Justificativa: distinguir repetição de reuso indevido de chave, preservar responsável/motivo sem oferecer histórico público.
- Decisão: status manual definitivo por trecho (confirmado/recusado), não reaplicar atalhos de conversa. Justificativa: Q1 aprovada; cancelar/remover administrativamente equivale a recusar o trecho, origem equipe. Não inventar resposta de aluno.
- Decisão: reaproveitar trigger B12 e derivações B10. Justificativa: atomicidade com a jornada e ausência de contadores divergentes. Nenhuma escolha tecnológica nova ou dúvida técnica pendente.
