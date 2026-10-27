# Tasks — B17
## Preparação
- [x] T001 Preparar spec/plano/pesquisa/modelo/contratos em specs/016-revisao-backend/ com autorização e escopo local explícitos.
## Fundamentos
- [x] T002 Mapear R01–R22/O01 e evidências existentes em specs/016-revisao-backend/coverage.md.
## US1 — Operação integrada
Teste independente: falha de envio, resposta atrasada, fechamento, alocação, correção, publicação e cancelamento permanecem coerentes.
- [x] T003 [US1] Criar e executar cenário integrado em backend/test/integration/backend-review.spec.ts usando serviços reais, dados sintéticos e PostgreSQL isolado.
## US2 — Limites e regressões
Teste independente: intermunicipal mantém confirmado inequívoco mesmo sem local ativo, enquanto local permanece pendente; permissões e concorrência preservadas.
- [x] T004 [US2] Reproduzir e corrigir exclusão indevida intermunicipal em backend/test/integration/consultation.spec.ts e backend/src/operation/application/consultation.service.ts; registrar achado em specs/016-revisao-backend/verification.md.
- [x] T005 [US2] Executar build, regressão backend/test/, lint/tipos e conferir migrações/fixtures locais; registrar resultados em specs/016-revisao-backend/verification.md.
## US3 — Prontidão e lacunas
Teste independente: 23 requisitos classificados e integrações futuras claramente separadas da entrega local.
- [x] T006 [US3] Consolidar matriz/pendências em specs/016-revisao-backend/{coverage.md,verification.md} e atualizar README.md, AGENTS.md e docs/ sem alegar produto em produção.
## Finalização
- [x] T007 Conferir links, tarefas e limpeza em specs/016-revisao-backend/tasks.md; encerrar bancos locais ao finalizar.
## Dependências e estratégia
T001 → T002 → T003/T004 → T005 → T006 → T007. US1 primeiro demonstra fluxo integrado; US2 acrescenta regressão do defeito encontrado; US3 depende das evidências. Revisão estática US2 pode ocorrer em paralelo à matriz; execução de banco sequencial para isolamento. TDD para correção, sem aprovação por tarefa nem commit automático.
