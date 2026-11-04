# Tarefas B18.3

## Complemento autorizado — chave real
- [x] T008 Criar roteiro sintético opt-in, testar chave/modelo reais e registrar resultado e falha semântica fora do fluxo de regras.
- [x] T009 Habilitar Gemini somente na configuração privada, preservar envio WhatsApp desativado, repetir testes unitários e atualizar evidências.

## Preparação
- [x] T001 Consolidar pesquisa/contexto/ordem e artefatos em specs/019-interpretacao-mensagens/.
## US1 — regras
- [x] T002 [US1] Testar frases exatas/compostas/ambíguas em backend/test/unit/interpretation.spec.ts e implementar backend/src/interpretation/domain.ts.
## US2 — Gemini
- [x] T003 [US2] Testar esquema estrito, falha e chamada limitada em backend/test/unit/interpretation.spec.ts; implementar backend/src/interpretation/gemini.ts.
## US3 — persistência e acesso
- [x] T004 [US3] Testar claim/dedupe/recebimento/rollback e criar migração1794200000000-message-interpretation.ts e backend/src/interpretation/service.ts.
- [x] T005 [US3] Testar autorização/dia/consulta em backend/test/e2e/interpretation.e2e-spec.ts; implementar controller.ts e conectar WhatsAppModule/Environment.
## Encerramento
- [x] T006 Validar testes/tipos/lint/build e migrações locais; registrar ausência de ensaio Gemini sem chave em verification.md.
- [x] T007 Atualizar docs/AGENTS.md/quickstart e conferir links/limites antes de relatar conclusão local.

Dependências: T001→T002→T003→T004→T005→T006→T007. Pesquisa de fornecedor e ordenação delegadas em paralelo, implementação em fatias sequenciais. Cobertura FR001/002 T002; FR003/005/007 T003; FR004 T004; FR006 T005; SC001–004 T002–T005. Nenhum hook registrado. Critério de fechamento deste incremento é proposta interpretada segura, não confirmação automática nem teste real sem credencial.

## Tradução para jornada — continuidade
- [x] T010 Implementar tradução estrita de propostas para comandos existentes, sem reconfirmação e sem execução parcial de locais/padrões.
- [x] T011 Implementar política aprovada de ordenação original para aplicação controlada; risco residual aceito, sem promoção por chegada. Automação por worker permanece T019.
- [x] T012 Implementar e testar despacho controlado do recibo com reserva durável, revalidação e transporte simulado; envio real permanece desativado.

## Política de ordenação aprovada
- [x] T013 Registrar aceite do risco residual e implementar comparador conservador de evidência original (7 testes).
- [x] T014 Criar patch reproduzível do conector para preservar horário original separado de messageTimestamp; incluir na rotina de build.
- [x] T015 Validar preservação no buffer e persistência/conflitos com dados sintéticos antes de aplicação controlada. Ensaio real ponta a ponta permanece T019.

- [x] T016 Persistir evidência original sem modificar recebimento, com migração preservadora e teste de reentrega.
- [x] T017 Conectar aplicação explícita protegida à jornada na mesma transação, validando ordem e preservando revisões.
- [x] T018 Testar aplicação tardia de recebimento no prazo, duplicatas, chegada fora de ordem, empate e recusa anterior.
- [ ] T019 Ensaiar cadeia real com aluno fictício explícito e despachante; recibo persistido e worker concluídos em T020–T022.

## Processamento automático e recibo
- [x] T020 Persistir recibo junto da jornada, com texto baseado no estado/locais reais e sem reconfirmação.
- [x] T021 Criar executor interno opt-in, com reserva durável por evento, recuperação conservadora e desligamento limpo.
- [x] T022 Validar duplicatas/concorrência, indisponibilidade e ausência de recibo para pendências; não habilitar envio real.
