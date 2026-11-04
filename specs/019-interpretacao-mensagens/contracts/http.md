# Contrato HTTP B18.3

POST /api/v1/integrations/whatsapp/events/:id/interpret com corpo {}. Admin/operator ativos. UUID, evento do dia, tipo message. Repetir retorna tentativa persistida, sem chamada extra. Contato desconhecido, mídia, conflito, estudante inativo e ordem incerta não alteram jornada. Resposta contém state/source/proposal/code e instantes, nunca segredo/envelope. Código ORDER_UNCERTAIN para proposta interpretada com falta de ordem; AMBIGUOUS/PROVIDER_DISABLED/PROVIDER_UNAVAILABLE/INVALID_PROPOSAL etc explicam demais pendências.

GET /api/v1/integrations/whatsapp/events passa a incluir interpretação associada; mesma autorização e janela atual. Nenhum endpoint aceita texto arbitrário do operador para fingir mensagem do aluno.

GEMINI_ENABLED=false por padrão. Quando true exigir GEMINI_API_KEY e GEMINI_MODEL (nome de modelo, sem path/URL). Somente endpoint fixo generativelanguage.googleapis.com/v1beta/models/{model}:generateContent. Chamada depois do commit de recebimento e claim, nunca sob lock/transação. Sem envio de respostas WhatsApp.

Complemento: novas interpretações com local textual não resolvido retornam LOCATION_RESOLUTION_REQUIRED, preservando a proposta inteira. Esse código não comprova ordenação. Tentativas anteriores permanecem inalteradas; não são reinterpretadas automaticamente.

## Aplicação controlada

POST /api/v1/integrations/whatsapp/events/:id/apply, corpo {}. Admin/operator, evento conhecido do dia e aluno ativo. Proposta completa traduzível, evidência original válida do mesmo dia e não futura, ausência de empate/conflito. ORDER_PREDECESSOR_PENDING impede ignorar comando anterior não resolvido; STALE_PROVIDER_MESSAGE impede antigo substituir aplicado; REVISION_REVIEW_REQUIRED preserva sequência/revisão já existente. Comandos válidos seguem regras de elegibilidade e prazo originais. Transação única promove recibo segundo política aprovada e aplica jornada; falha reverte ambas. Repetição retorna resultado salvo. APPLIED na interpretação só após efetivar. Não equivale a envio ou entrega de resposta. Datas de fornecedor nunca substituem received_at.

Consulta GET events inclui processing (state/code/instantes) e acknowledgement (state/text/journeyVersion/deliveryCode/dispatchStartedAt/dispatchFinishedAt), sob autorização admin/operator. Nenhuma rota permite escolher o caminho interno sem autenticação; o executor usa métodos próprios não expostos por HTTP. Recibo prepared não comprova envio.
