# Implementation Plan — B14
**Branch real**: codex/001-base-backend | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)
## Summary
Outbox local de consultas/lembretes/aviso de volta padrão, tentativas persistidas e executor interno invocável com relógio simulado. Recuperar somente slot atual; extra iniciado pelo aluno participa de lembretes futuros.
## Technical Context
Mesmas versões: Node 24.22.1/npm 11.17.0, NestJS 11.2.7, TS 5.8.3, TypeORM 0.3.31, pg 8.16.3, PostgreSQL 17.11 e Jest existente. Sem novas dependências, processos agendados, serviços remotos ou alterações de infraestrutura. Dev/test locais 55432/55433.
## Constitution Check
Pré/pós desenho aprovado: Q1/Q2 confirmadas, autorização no backend, datas estritas, TDD nas interfaces públicas e PostgreSQL isolado; nenhuma comunicação real. Não prometer exactly-once externo.
## Project Structure
backend/src/messaging/{domain/messages.ts,application/ports.ts,application/message.service.ts,infrastructure/message-queries.ts,http/message.controller.ts}; composição RegistryStore/RegistryModule. Migração 1793700000000-messages.ts. Testes unit/messages.spec.ts, integration/messages.spec.ts, integration/messages-migration.spec.ts e e2e/messages.e2e-spec.ts.
## Consistência e despacho
Preparar/claim: autorizar quando administrativo → places.lock → aluno → calendário → mensagem. Claim revalida data/slot, elegibilidade, trechos, telefone/conteúdo atuais e grava tentativa/sending/version antes de chamar porta fora da transação. Resposta posterior à decisão de despacho não pode recolher mensagem já em trânsito; futuras tentativas revalidam. Finalização altera somente mensagem/tentativa. Falha antes de claim não envia; falha ao finalizar conserva sending e bloqueia reenvio cego. Exceção do adaptador marca unknown. Failed permite retry administrativo com versão esperada; sent/sending/unknown não permitem nova tentativa. Nenhuma recuperação automática por timeout presumido.
Slots anteriores ready/failed ficam skipped, sem apagar tentativas. Sent e unknown anteriores não são reclassificados. Execução concorrente só pode reservar uma tentativa. Porta padrão desabilitada retorna falha SENDER_NOT_CONFIGURED; testes substituem por adaptador simulado. Não criar cron/automação real.
Journey recebe marcador studentInitiated para distinguir extra realmente iniciado por comando de aluno de jornada manual; booleano false conservador em registros existentes sem evidência, true após comando aplicado com elegibilidade válida. studentInitiatedAt preserva o primeiro recebimento válido e limita extras aos próximos slots. Correções preservam marcador e instante. Sem confirmação implícita extra pela rotina. Fechamento invoca B08, depois prepara aviso somente se volta ainda tem origem padrao_fechamento.
