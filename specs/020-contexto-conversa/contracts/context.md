# Contrato de contexto e esclarecimento

Decisão aprovada em 05/11/2026: uma pergunta objetiva; resposta ainda ambígua encaminha à equipe. Não repetir pergunta na mesma cadeia. Expira no corte das 17h da operação; novo recebimento não herda prazo anterior. Cancelamento explícito permanece regido pelo prazo das 22h.

Vínculo: ID citado proveniente do webhook autenticado deve coincidir com provider_id de pergunta enviada pelo TechBus para o mesmo aluno/telefone/instância/dia. Resposta curta sem esse vínculo continua ambígua. Texto citado não é fonte de verdade. Pergunta precisa estar enviada, não consumida, anterior ao recebimento, sem alteração de cadastro, padrão, jornada ou revisão desde a preparação. Falta de evidência não habilita heurística pelo último envio.

Propósitos: viagem completa, ida, volta, ponto de embarque ou ponto de desembarque. Pergunta de trecho só preenche esse trecho. Pergunta de local preserva a proposta original completa; ponto deve ser cadastrado, ativo, do sentido correto e identificável sem ambiguidade. Homônimos/locais desconhecidos ficam para equipe. Pedido de mudança permanente de padrão continua separado de troca diária; nunca ignorar esse pedido e aplicar apenas parte.

Persistência: pergunta por evento de origem; estados prepared/sending/sent/unknown/superseded/answered/escalated. Reserva antes do transporte, uma tentativa; interrupção/resultado incerto não tem retry automático. Contexto consumido e recibo de origem encerrado somente na transação que aceita a resposta validada; demais pendências não são apagadas. Ordem original, elegibilidade, prazo, revisão e idempotência continuam obrigatórios.

Diagnóstico disponível à equipe no endpoint protegido de eventos do dia. Correção B13 permanece explícita, com justificativa e sem envio. Nenhuma nova API pública permite fabricar contexto. Validação inicial usa transporte substituto; envios reais permanecem restritos ao ensaio autorizado.
