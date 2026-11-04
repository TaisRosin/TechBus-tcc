# Validação B18.3

**Estado de 04/11/2026:** consultar [consolidação](../../docs/estado-atual.md). Envio/processamento habilitados no arquivo privado observado; afirmações de envio false/zero alunos abaixo são históricas. Iniciar o backend pode ativar executores. Casos manuais e T019 continuam pendentes; próximo incremento [B18.4](../020-contexto-conversa/tasks.md) apenas planejado.

Complemento vigente: [processamento interno e recibos](automation.md). O acionamento exclusivamente administrativo descrito na entrega inicial foi ampliado com executor interno opt-in, restrito a eventos persistidos de alunos ativos. Envio continua separado e desativado.

Ensaio real: em backend, executar `npm run gemini:smoke -- --live` com Node 24.22.1. Lê chave/modelo do .env, verifica sete casos fictícios com regras antes do Gemini e não acessa banco/WhatsApp. Faz até seis chamadas externas sequenciais sujeitas a cota/cobrança da conta; não integra a suíte automática. Sem --live, recusa execução. Resultado esperado: passed 7, total 7, HTTP200 nos casos Gemini. Testado em 29/10/2026; .env privado habilitado, padrão do projeto continua opt-in.

Executar testes unit/integration/e2e sequencialmente no ambiente isolado, mais tsc/lint/build. Regras exatas funcionam sem chave. Gemini é opt-in: configurar segredo no arquivo local backend/.env, modelo explícito e GEMINI_ENABLED=true; não enviar chave no chat. Primeiro ensaio externo usa texto fictício e resultado não altera jornada.

Com login admin/operator, enviar POST events/:id/interpret {} para evento do dia; repetir deve retornar mesma interpretação. GET events mostra proposta e motivo. Sem vínculo conhecido não interpretar como aluno nem converter evento antigo ao cadastrar. Após cadastrar aluno fictício com telefone autorizado, usar nova mensagem. Aplicação exige evidência original válida e as demais validações documentadas; eventos sem evidência continuam pendentes. O agendador de consultas/lembretes permanece separado.

Aplicação controlada após interpretar evento: POST /api/v1/integrations/whatsapp/events/:id/apply com {} e sessão admin/operator. Resposta applied só após transação concluída; pending/rejected não devem gerar mensagem de confirmação. Repetir é idempotente. Eventos anteriores sem original_order permanecem pendentes; não preencher evidência retroativamente. Antes de iniciar backend atualizado, executar migrações; conector exige build com preserve-order.cjs. Nenhuma permissão de autoenvio é habilitada por esses passos.

Estado local após validação: EVOLUTION_PROCESS_ENABLED=true no .env privado, aplicado no próximo início do backend. EVOLUTION_SEND_ENABLED=false. Zero alunos encontrados em dev; cadastre explicitamente o aluno fictício e use nova mensagem para o futuro ensaio. Despachante implementado e validado com transporte simulado; manter envio desativado até o ensaio real controlado. Aplicar também a migração1794500000000 antes de iniciar o backend atualizado.
