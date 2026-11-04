# Tarefas B18.2

Entrada: [spec](spec.md), [plano](plan.md), [pesquisa](research.md), [dados](data-model.md), [contrato](contracts/whatsapp.md). TDD em interfaces públicas, fixtures sintéticas. Checklist documental aprovado; envio real permanece bloqueado até destinatário autorizado.

## Preparação
- [x] T001 Fixar/revisar fonte e requisitos nativos em specs/018-whatsapp-local/research.md.

## Fundação
- [x] T002 Testar configuração/projeção e implementar backend/src/whatsapp/config.ts e domain.ts com backend/test/unit/whatsapp.spec.ts: segredo distinto, URL fixa, campos permitidos, texto <=4096, ID1–200, sem inferir LID.
- [x] T003 Testar e criar backend/src/infrastructure/database/migrations/1794100000000-whatsapp-channel.ts e backend/src/whatsapp/store.ts: tipos/FKs/UNIQUE de data-model.md, estados em enums, recebimento timestamptz obrigatório, reversão sem perda, aplicação sem DDL/DELETE.

## US1 — Entrada durável
- [x] T004 [US1] Testar repetição/conflito/identidade/transação em backend/test/integration/whatsapp.spec.ts.
- [x] T005 [US1] Implementar backend/src/whatsapp/service.ts e store.ts com recibo B07 atômico, primeira chegada preservada e ordering uncertain, sem interpretação.
- [x] T006 [US1] Testar HTTP e ligar backend/src/whatsapp/controller.ts e whatsapp.module.ts em backend/src/app.module.ts; consulta admin/operator e webhook autenticado, limites seguros, backend/test/e2e/whatsapp.e2e-spec.ts.

## US2 — Saída controlada
- [x] T007 [US2] Testar aceitação, timeout, erro pós-envio, duplicata e allowlist em backend/test/integration/whatsapp.spec.ts usando HTTP substituto, sem WhatsApp real.
- [x] T008 [US2] Implementar backend/src/whatsapp/sender.ts e ligação em backend/src/registry/registry.module.ts, ledger antes do despacho e correlação somente por ID comprovado.

## US3 — Serviço local
- [x] T009 [US3] Preparar scripts/local-evolution.ps1 e infrastructure/evolution/README.md com patches rastreáveis, cluster próprio, segredos ignorados e processo loopback.
- [x] T010 [US3] Validar inicialização nativa sem WhatsApp vinculado e registrar resultados em specs/018-whatsapp-local/verification.md; pareamento real depende do aparelho, não marcar comprovado sem evidência.

## Encerramento
- [x] T011 Executar testes/lint/tipos/build e atualizar specs/018-whatsapp-local/verification.md, quickstart.md e docs/b18-preparacao.md; preservar limites externos e pendência do ensaio real.

## Dependências e paralelismo

T001→T002/T003→T004–T006→T007/T008→T009/T010→T011. Testar cada regra antes de implementar. Não há tarefas de escrita simultânea nos mesmos arquivos. Pesquisa e download de dependências independem dos testes backend. US1 é ensaio independente de entrada; US2 usa tentativa B14 sintética; US3 prova somente prontidão até pareamento humano. Todos FR-001–008/SC-001–004 têm cobertura respectivamente em T002–T010; teste real permanece fronteira explícita de T010.
