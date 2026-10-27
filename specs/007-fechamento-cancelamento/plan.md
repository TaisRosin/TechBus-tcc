# Implementation Plan — B08
**Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)
**Branch real**: codex/001-base-backend; seleção da feature independente da branch.

## Summary
Fechamento interno por jornada/data e lote paginado; cancel_return somente entre 17h inclusive e 22h exclusive pelo recebimento durável; reconciliação de interpretação atrasada. Sem novos endpoints de mutação nem integração real.

## Technical Context
Reutilizar Node 24.22.1, npm 11.17.0, TS 5.8.3, NestJS 11.2.7, TypeORM 0.3.31, pg 8.16.3 e PostgreSQL 17.11 locais já verificados. Sem novas dependências ou decisões de infraestrutura. dev 55432/test 55433, migrations explícitas, synchronize:false, app sem DELETE/DDL. Jest em domínio, serviço real PostgreSQL e HTTP. Sem meta de carga inventada.

## Constitution Check
Pré/pós-desenho: aprovado. FR-008 confirmada; sem novas regras presumidas. Relógio substituível e tempo durável; controles transacionais, testes primeiro nas regras críticas, autorização existente. Dados sintéticos, nenhuma mensagem enviada. Registros B07 preservados, migração aditiva B08.

## Project Structure
- backend/src/journey/domain/closing.ts: cortes, decisão de fechamento, orientação fiel ao aluno.
- backend/src/journey/application/journey.service.ts: fechar, cancelar, conciliar, leitura atual.
- backend/src/journey/{application/ports.ts,infrastructure/journey-queries.ts}: persistência e lote paginado.
- backend/src/infrastructure/database/migrations/1793200000000-journey-closing.ts.
- backend/test/{unit,integration}/journey-closing.spec.ts; backend/test/integration/journey-closing-migration.spec.ts; HTTP existente estendido quando necessário.

## Estratégia
Manter ordem locais → aluno → calendário. Fechamento serializado com comandos; lote em transações individuais, limite 100 e cursor por aluno. Marca closed_sequence registra a revisão ordinária avaliada: repetição não reconfirma nem reavalia indevidamente bloqueio antigo. Nova informação tempestiva válida permite reconciliação nessa revisão. Guardar estado anterior à volta padrão para retirar somente o efeito derivado quando comando tempestivo muda a base. Cancelamento tem sequência própria, não oculta alterações anteriores de ida e não é desfeito por elas.

Cancelamento com confirmação ainda não interpretada fica pendente, sem presumir viagem; recibo armazena intenção restrita de cancelar para conciliação posterior. Nenhum processo fica esperando a IA com trava aberta. Leitura mostra recebimentos não interpretados e orientação sobre padrão/cancelamento sem afirmar envio. Validação da hora independe do agendador. Agendamento efetivo B14/B18.
