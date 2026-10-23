# Verificação B05 — 23/10/2026

## Fluxo e autorização
Taís confirmou a única dúvida US3/FR-008: novas avaliações usam calendário corrigido imediatamente; confirmações existentes ficam para ajuste manual, sem mensagem automática. Spec atualizada, checklist 16/16 aprovado antes da implementação. Executados setup-plan.ps1, setup-tasks.ps1 e check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks. Artefatos de pesquisa, dados, contratos, guia e tarefas preenchidos. Nenhum hook de extensão configurado. Constituição 1.0.0 respeitada antes/depois do desenho e na entrega.

## Entrega
Calendário semanal e exceções por universidade com precedência explícita, ausência de configuração sem presunção de operação, restauração de herança sem exclusão. HTTP restrito a admin/operador, revalidação do executor na transação, limites de entrada e listagem por período. Revisão compartilhada rejeita alterações antigas e concorrentes. Integração no módulo registry existente, sem novos pools ou dependências.

EligibilityService interno avalia cadastro, vigência e calendário na mesma transação, coordenada com escritores B04/B05. Consulta exige dia habitual; pedido extra usa recebimento durável confiável anterior a 17h. Zero dias habituais permanece válido para extras. Resultado informa elegibilidade/motivo/data/revisão, sem dados pessoais, confirmação ou mensagem. Edição de calendário não modifica alunos/vigências.

## Testes e validação
- RED observado antes do domínio calendário, serviço persistido, rotas HTTP, função de elegibilidade e integração do serviço interno; GREEN após cada fatia.
- `node node_modules/jest/bin/jest.js --runInBand`: **20 suítes, 132 testes aprovados**, incluindo 22 novos B05 e 110 regressões B02–B04.
- Novos testes: 15 unitários, 6 de integração, 1 jornada HTTP com múltiplas verificações de contrato/autorização.
- Cobertura comportamental: exceção versus semana; semana vazia/não configurada; revisão antiga; conflito semana/exceção em conexões independentes; ator desativado; dados preservados; vigência inclusiva; 17:00:00 estrito; fuso e atraso de interpretação; consulta versus extra; permissões e migração reversível.
- `npm run build`, `npm run lint`, `tsc --noEmit`: aprovados.
- Migração B05 aplicada em test e dev; reversão de teste limitada à última migração B05 e calendário ainda não configurado, preservando tabelas anteriores. Reaplicação idempotente. Testes históricos B03/B04 não revertem migrações posteriores.

Nenhum problema técnico ou de negócio bloqueante permaneceu. Nenhuma atualização de versões ou mudança arquitetural foi necessária. Conferência final dev/test: zero alunos, vigências e usuários de teste; duas linhas de calendário não configuradas em cada banco, zero exceções, nenhuma migração pendente. Na retomada, ambos os clusters foram confirmados parados. Links locais conferidos e git diff --check sem erros. 10/10 tarefas concluídas.

## Limites
Não implementa recepção de eventos, envio/agendamento de mensagens, jornada ou correção de confirmações; esses consumidores precisam aplicar as regras já aprovadas e revalidar na própria transação. A avaliação é uma fotografia, não autorização permanente. Auth real continua indisponível fora dos testes. SQL administrativo direto deve respeitar os protocolos de revisão/locks. Sem Supabase/produção, serviços externos, commit ou push nesta etapa. B04 permanece no working tree junto da B05. Próxima etapa B06 — grupos e locais.
