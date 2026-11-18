# Contrato interno

- `runOnce(): Promise<void>`: sem efeito se desativado; chamadas sobrepostas compartilham ciclo. Executa tick e despacha apenas IDs ready elegíveis para envio na allowlist. Cada dispatch revalida o conteúdo e reserva duravelmente.
- `onModuleInit`: inicia ciclo imediatamente e temporizador30s quando ativado.
- `onModuleDestroy`: cancela temporizador, impede próximos envios e aguarda o ciclo em curso. Sem retry de chamada incerta.
- Erros: `SCHEDULER_CYCLE_FAILED`, `SCHEDULER_PREPARATION_FAILED`, `SCHEDULER_DISPATCH_FAILED` sem payload/credenciais. Uma falha de envio não bloqueia os próximos IDs.
- `OPERATIONS_SCHEDULER_ENABLED`: ausente/false desativa, true ativa, outros valores rejeitados. Independente de `EVOLUTION_SEND_ENABLED`; sem envio, nenhuma tentativa é reservada pelo scheduler. Launcher de painel força false.
- Horário: regras existentes America/Sao_Paulo; apenas último slot corrente antes17h, fechamento após17h e aviso atualizado conforme o prazo22h. Depois22h o texto informa prazo encerrado, sem oferecer cancelamento. Nenhum endpoint público novo.
