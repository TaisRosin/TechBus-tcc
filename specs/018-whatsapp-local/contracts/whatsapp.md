# Contrato B18.2

- POST /api/v1/integrations/whatsapp/webhook: cabeçalho X-TechBus-Webhook-Secret, instância exata; rota dispensada do login de equipe mas autenticação própria obrigatória. Desativada →503; segredo/instância incorretos →401; estrutura inválida →400; aceito após commit →202. Corpo nunca ecoado. Apenas projeção de messages.upsert/messages.update/connection.update; eventos irrelevantes ignorados sem comando.
- GET /api/v1/integrations/whatsapp/events?limit&offset: admin/operator, paginação padrão existente; dados normalizados/pendência, sem envelope ou segredos. Motorista403.
- Saída usa MessageSender B14: enviar somente com EVOLUTION_SEND_ENABLED=true e telefone em allowlist. Adaptador persiste tentativa antes de fetch; request conhecido repetido não despacha. Sem redirects; timeout limitado; JSON inválido/erro após despacho →unknown. Resposta válida com key.id →sent (aceito, não entregue). Sem endpoint novo de envio livre.

Configuração opcional no backend: EVOLUTION_ENABLED, EVOLUTION_BASE_URL (somente http://127.0.0.1:8085), EVOLUTION_INSTANCE, EVOLUTION_API_KEY, EVOLUTION_WEBHOOK_SECRET, EVOLUTION_SEND_ENABLED e EVOLUTION_TEST_PHONES (E.164). Sem flag: integração/saída desativadas. Exigir campos quando habilitada; segredos distintos com ao menos 32 caracteres. Nenhuma chamada usa URL ou destino fornecido no webhook.

Serviço nativo: porta8085, banco exclusivo55434. Criar instância WHATSAPP-BAILEYS apenas após preparar receptor; pareamento pelo aparelho de Taís, nenhuma mensagem automática. Configurar webhook base64=false/byEvents=false e somente eventos necessários, sem grupos/histórico/bots. Dados com LID sem PN explícito ficam pendentes; mídias recebem estado needs_text, sem confirmar por legenda ou IA nesta etapa.
