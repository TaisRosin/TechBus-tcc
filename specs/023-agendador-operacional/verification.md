# Verificação — agendador operacional

06/11/2026. Implementado e validado localmente com serviços e persistência existentes, sem migração ou nova dependência.

## Evidências

- TDD: suítes unit/integration falharam inicialmente pela ausência de OperationalScheduler; após implementação, **23 testes em duas suítes** passaram (7 testes de lifecycle/configuração novos e 16 de mensagens, incluindo 4 cenários novos de agendamento).
- Banco test isolado e transporte substituto. Horários05/11/13/16, recuperação16h20, corte17h, fechamento, concorrência entre duas instâncias do executor, reinício, envio incerto, allowlist e preparação com falha por aluno verificados. Casos existentes preservam aviso correto após22h e supressão após cancelamento.
- Tipos, lint e build backend aprovados. Regressão completa: **504 testes/82 suítes** aprovados em uma execução (167,457s), incluindo unit/integration/e2e. Logs de falha nos testes de provedores/rollback são deliberados e não representam chamadas reais.
- Nenhum envio real, nova conta, alteração de credenciais ou migração. Launcher do painel força scheduler false. Frontend não foi alterado neste incremento; a tela existente consulta os registros de mensagens.

## Rastreabilidade

| Requisito | Implementação/evidência |
|---|---|
| FR001/SC001 | Ciclo imediato e30s; integração de horários e recuperação da faixa mais recente. |
| FR002 | MessageService/JourneyService existentes; suíte de mensagens e regressão de fechamento. |
| FR003/SC002 | Reserva persistente existente; concorrência de runners e reinício sem reenvio de unknown. |
| FR004/SC003 | Configuração estrita opt-in, allowlist antes da reserva, sender revalida, launcher isolado. |
| FR005/SC001 | Testes de falha por aluno, falha por envio, recuperação de ciclo e desligamento. |
| FR006/SC004 | Testes, verificações estáticas e limites separados do ensaio externo. |

Limites: polling não é garantia de pontualidade sob indisponibilidade/sobrecarga. Serviço/banco precisam estar ligados. Recuperação contempla operação atual; nenhum lembrete anterior a17h é enviado depois do corte. Aviso de fechamento é distinto e atualiza o texto após22h. Ensaio WhatsApp/painel e hospedagem continuam pendentes. Testes manuais antigos de Taís e B18.3/T019 não são encerrados por esta validação.

## Spec Kit

Especificação, plano e tarefas gerados com templates locais; scripts setup-plan/setup-tasks/check-prerequisites executados. Checklist de qualidade:6/6. Análise final:6 FR,4 SC e9 tarefas com cobertura, sem requisito órfão ou conflito constitucional;5 princípios conferidos. Convergência entre código, artefatos e evidências sem lacuna acionável; nenhuma tarefa extra anexada. Sem extensions.yml/hooks. Testes de integração agrupados na suíte existente de mensagens para reaproveitar fixture; ver caminhos em tasks.md. Links relativos conferidos e git diff --check sem erro.
