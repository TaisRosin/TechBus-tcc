# Tasks — B07

## Setup
- [x] T001 Incorporar decisões confirmadas e concluir desenho em specs/006-jornada-comandos/spec.md, plan.md, research.md, data-model.md e contracts/internal-http.md.

## Fundação
- [x] T002 Criar primeiro teste de intenção em backend/test/unit/journey.spec.ts e observar falha antes de implementar.
- [x] T003 Criar migração backend/src/infrastructure/database/migrations/1793100000000-daily-journey.ts e portas/consultas em backend/src/journey/: chave (student_id UUID, date DATE), sequence/version integer >0, estados sem_resposta/indeciso/confirmado/recusado, origens none/aluno_explicito/implicito_da_ida, locais opcionais FK e permissões sem DELETE/DDL; validar via backend/test/integration/journey.spec.ts.

## US1 — Intenção por sentido
Critério independente: comandos explícitos produzem estados e origens corretos; silêncio não confirma.
- [x] T004 [US1] Implementar domínio em backend/src/journey/domain/journey.ts com testes incrementais em backend/test/unit/journey.spec.ts.
- [x] T005 [US1] Implementar recebimento durável e aplicação transacional com elegibilidade em backend/src/journey/application/journey.service.ts; testes persistidos em backend/test/integration/journey.spec.ts.

## US2 — Revisões e esclarecimento
Critério independente: recusa preservada, incompreensão sem efeito, prazo por recebimento e repetição sem sobrescrita.
- [x] T006 [US2] Testar e implementar revisões, indecisão, duplicatas, evento antigo e ordem incerta em backend/test/unit/journey.spec.ts, backend/test/integration/journey.spec.ts e backend/src/journey/application/journey.service.ts.
- [x] T007 [US2] Registrar serviço e leitura administrativa do dia em backend/src/registry/registry.module.ts e backend/src/journey/http/journey.controller.ts; validar autorização e ausência de comando público em backend/test/e2e/journey.e2e-spec.ts.

## US3 — Locais diários
Critério independente: confirmar sem local conta e indica ajuste; seleção válida não muda padrão, desativação preserva confirmação.
- [x] T008 [US3] Testar e implementar seleção/revalidação transacional de locais e padrões iniciais em backend/test/integration/journey.spec.ts e backend/src/journey/application/journey.service.ts.
- [x] T009 [US3] Testar pendências dinâmicas de locais/contexto na leitura, contagem 0/1 e preservação em backend/test/integration/journey.spec.ts e backend/src/journey/application/journey.service.ts.

## Validação e entrega
- [x] T010 Executar migrações dev/test, suíte completa, build/lint/tipos; registrar resultados e limites em specs/006-jornada-comandos/verification.md.
- [x] T011 Atualizar README.md, AGENTS.md, docs/decisoes.md, docs/backlog.md e referências pertinentes; conferir links e progresso em specs/006-jornada-comandos/tasks.md.

## Dependências e estratégia
T001 → T002 → T003 → US1 → US2 → US3 → T010 → T011. Implementação sequencial conforme pedido, ciclos teste falhando → implementação → teste passando por comportamento. MVP técnico US1, entrega autorizada inclui todas as histórias. Oportunidades opcionais: documentação/testes HTTP em arquivos separados após contratos estáveis, sem delegação necessária. Sem novas instalações, frontend, fechamento automático, mensagens reais ou mudanças arquiteturais.
