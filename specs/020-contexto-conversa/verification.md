# Verificação B18.4 — 05/11/2026

Implementação validada localmente. Migração `1794700000000-conversation-context.ts` aplicada em PostgreSQL local dev/test, sem conversão de eventos antigos.

Cadeia pergunta/resposta, resolução de ponto fixo, reserva concorrente, despacho incerto/interrompido, rollback atômico, prazo/virada de dia, contexto alterado, predecessor pendente e revisão administrativa passaram nos testes isolados. Regressão geral: **490 testes/81 suítes** aprovados. Após acrescentar resposta sobre somente volta, outra instância e reentrega contraditória, verificação direcionada final: **29 testes/3 suítes** aprovados; **493 testes distintos** cobertos considerando essa reexecução. Não somar reexecuções como testes novos. **11 testes de navegador** aprovados, incluindo diagnóstico de esclarecimento para equipe. Tipos/lint backend aprovados após corrigir dois callbacks de teste sem await; build backend e tipos/build frontend aprovados.

## Rastreabilidade Spec Kit

| Requisito | Evidência principal |
|---|---|
| FR001–FR003 / SC001, SC003 | Projeção mínima, lookup por aluno/telefone/instância/dia, hash de contexto, prazo durável e ordenação; testes de instância, outro aluno, reentrega, atraso, dia e revisão. |
| FR004 / SC001 | Comando completo viagem+local, resposta por trecho preservando intenção explícita; transação e rollback de origem/jornada/recibo. |
| FR005 / SC002 | PK/índice de cadeia ativa, reserva sending, concorrência, timeout/HTTP/resposta excessiva/interrupção sem retry. |
| FR006 / SC003 | API protegida, motorista bloqueado, contexto fabricado rejeitado, painel, revisão com justificativa sem recibo automático. |
| FR007 | Regras e contexto antes de Gemini; IA sem identidade, snapshot ou controle de aplicação. |
| FR008 / SC004 | TDD crítico, PostgreSQL isolado, transporte substituto, regressão e verificações acima. |

Análise: 8 FR e 4 SC com cobertura nas 16 tarefas originais; 5 princípios constitucionais conferidos, sem conflito de domínio. Encontrados resíduos editoriais e cobertura explícita incompleta para instância/reentrega. Convergência acrescentou T017/T018 (partial); corrigidos e verificados sem ampliar o escopo. Sem extensions.yml nem hooks registrados. Roteiros de testes agrupados nas suítes existentes em vez de duplicar fixtures.

TDD: testes iniciais de contexto/pontos e cadeia falharam pela ausência dos módulos; a implementação os tornou verdes. Refinamento de resposta sobre volta começou com testes falhando por perda do outro trecho e falta de finalidade; implementação preserva a intenção original. Uma falha posterior de expectativa sobre reconsulta de pergunta já escalada foi corrigida: primeiro resultado permanece ORDER_PREDECESSOR_PENDING no job, reconsulta requer revisão do contexto. Falha de conexão inicial ocorreu porque o cluster test estava parado; cluster iniciado e testes reexecutados. Logs WHATSAPP_UNAVAILABLE nos casos de rollback são falhas deliberadamente injetadas.

Limites: nenhum WhatsApp/Gemini real nesta validação, nenhuma credencial alterada, nenhum fornecedor/hospedagem contratado. Aceite do provedor não prova entrega. Respostas precisam usar Responder na pergunta; sem vínculo permanecem pendentes. Ambiguidades compostas sem finalidade inequívoca e mudança de padrão vão à equipe. Horários/fechamento automático e B18.3/T019 permanecem abertos; testes manuais antigos de Taís continuam adiados.
