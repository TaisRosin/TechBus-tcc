# Plano B18.3

**Estado de 04/11/2026:** consultar [consolidação](../../docs/estado-atual.md). Envio/processamento habilitados no arquivo privado observado; afirmações de envio false/zero alunos abaixo são históricas. Iniciar o backend pode ativar executores. Casos manuais e T019 continuam pendentes; próximo incremento [B18.4](../020-contexto-conversa/tasks.md) apenas planejado.

Atualização 29/10/2026: chave disponível; modelo gemini-3.1-flash-lite e formato REST comprovados com HTTP200. Roteiro opt-in backend/scripts/gemini-smoke.cjs; [resultados e limites](verification.md). Supera a ausência de chave/ensaio registrada abaixo, sem prometer precisão geral ou gratuidade.

Stack existente NestJS/TypeORM/PostgreSQL, fetch Node; nenhuma dependência nova. Proposta sem execução automática porque B18.2 não prova ordem. Constitution Check antes/depois: preserva autorização, tempo, recibos, ausência de presunção e sem mudanças no escopo de grupos/rotas.

Fronteiras TDD reutilizadas da autorização de implementação: interpretador público (frases e falhas), serviço persistente (concorrência/primeiro recibo), HTTP protegido. Uma fatia por vez; não testar métodos privados. Testes sintéticos isolados não comprovam Gemini real.

Arquivos: backend/src/interpretation/{domain.ts,gemini.ts,service.ts,controller.ts}; migration1794200000000-message-interpretation.ts; providers no WhatsAppModule, configuração repassada via Environment/AppModule/RegistryModule. Testes unit/interpretation.spec.ts, integration/interpretation.spec.ts e e2e/interpretation.e2e-spec.ts.

Persistir claim antes da IA e finalizar depois em nova transação; chamada fora de locks. Consulta retorna proposta ou pendência; não chama JourneyService.apply nem promove ordering. Requisição admin não pode fabricar texto, contexto ou comando. Serviço lê evento já existente. Versão técnica inicial rule-v1; sem retry automático. Processamento manual explícito permite validar antes de introduzir worker/agendador.

Riscos: chave ausente impede ensaio Gemini real; proposta válida estruturalmente ainda pode estar errada; timestamp/citação não prova ordem total. Sem intervenção humana de cadastro, contato unknown continua desconhecido. Esses limites não podem ser descritos como automação completa entregue.

Continuidade: processamento interno limitado a eventos recebidos autenticadamente e vinculados a aluno, sem fingir identidade administrativa. Acionamento HTTP continua autorizado separadamente. Executor opt-in reserva evento no banco antes do processamento, não repete tentativa de fornecedor incerta; interrupção exige revisão. Recibo é preparado na mesma transação da jornada e não significa envio/entrega. Despachante implementado com reserva durável e destinatário autorizado; envio real permanece desativado. Ver limites e estados em [automação](automation.md).
