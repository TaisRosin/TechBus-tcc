# Contratos — B09
- receiveUnordered(studentId,eventId): interno, recebe UUIDs já resolvidos pelo adaptador confiável; persiste ordering=uncertain, sem aceitar flag de promoção. Repetição conserva recibo original. Novo identificador desconhecido não pode produzir efeito automático em apply.
- receive: contrato B07 de entrada interna ordenada preservado; não é interface pública nem prova de ordem do provedor.
- apply: contratos B07/B08 preservados. Reentrega retorna resultado durável; falha antes do commit deixa tentativa repetível. Reinterpretação do mesmo recibo não troca intenção já processada.
- closeDay: results contém {studentId,status:processed,needsAdjustment,pending} ou {studentId,status:failed,code}; nextCursor limita navegação. Falha exige repetir ID/lote; avançar cursor não declara falhas resolvidas. processed não significa confirmação do planejamento.
- HTTP administrativo do dia permanece igual, sem novas rotas de recepção/IA.

Identidade e prova real de ordenação externa ficam para B18; até lá, ausência de prova gera ORDER_UNCERTAIN. Teste simulado não comprova assinatura/webhook real.
