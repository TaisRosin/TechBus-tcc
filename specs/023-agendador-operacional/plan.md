# Plano — agendador operacional

06/11/2026. NestJS/TypeScript existentes; nenhum pacote, migração ou serviço novo. Base: [spec](spec.md), [pesquisa](research.md), [contrato](contracts/scheduler.md).

## Constituição
Princípios I–V preservados: regras B08/B14, backend valida, testes críticos primeiro, tempo durável e evidência isolada. Envio real e hospedagem não ativados por este incremento.

## Implementação
1. `messaging/application/operational-scheduler.ts`: ciclo imediato e a cada30s; exclusão de sobreposição por processo; shutdown aguarda trabalho em curso e impede novo despacho.
2. Reutilizar `MessageService.tick/dispatch` e `JourneyService.closeDay`. Isolar erro por aluno em tick; cada envio revalida pertinência na transação existente. Concorrência entre processos usa unicidade/reserva existentes, sem lock mantido durante rede.
3. Configuração `OPERATIONS_SCHEDULER_ENABLED` estrita/opt-in, independente de Evolution. Registrar provider em RegistryModule/AppModule. Sem envio habilitado, preparar/fechar sem reservar tentativas. Envio requer sendEnabled e allowlist do Evolution; launcher do painel força flag false.
4. Testes de lifecycle e erro com portas substitutas; integração do runner com MessageService/JourneyService no banco test; regressão geral, tipos/lint/build. Diagnósticos de mensagens continuam no painel atual.

## Limites técnicos
Sem nova fila ou tabela: mensagens/tentativas já são persistentes. Ciclo repetido recupera erro interno de preparação; nunca escolhe failed/unknown/sending para reenvio. Sem recuperar dias anteriores. Não expor endpoint para executar rotina. Nenhuma alteração em credenciais privadas.
