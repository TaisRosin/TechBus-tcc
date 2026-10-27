# Implementation Plan — B12
**Branch real**: codex/001-base-backend | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)
## Summary
Consolidar demanda atual, recomendar menores opções intermunicipais e persistir rascunho/confirmado com ocupações atômicas. Reutilizar B11 dentro da transação de confirmação; nenhuma reserva a partir de avaliação isolada.
## Technical Context
Mesmas versões: Node 24.22.1/npm 11.17.0, NestJS 11.2.7, TS 5.8.3, TypeORM 0.3.31, pg 8.16.3, PostgreSQL 17.11, Jest existente. Nenhuma dependência nova; dev 55432/test 55433 privados. synchronize:false; migração explícita.
## Constitution Check
Pré/pós-desenho aprovado. FR-006/007 confirmados, regras preservadas, testes de domínio/serviço/HTTP em interfaces públicas já adotadas. Sem recomendação local, repartição automática, histórico público ou serviços externos. Sem violações.
## Project Structure
backend/src/operation/{domain/operation.ts,application/operation.service.ts,application/ports.ts,infrastructure/operation-queries.ts,http/operation.controller.ts}; composição RegistryStore/RegistryModule. Migração 1793500000000-operation-planning.ts. Testes unit/operation.spec.ts, integration/operation.spec.ts, integration/operation-migration.spec.ts, e2e/operation.e2e-spec.ts.
## Concorrência e consistência
Reusar lock transacional de locais (82406,1) como barreira comum a planejamento, jornadas e recebimento; receive passa a adquiri-lo antes do aluno. Snapshot bloqueia alunos relevantes em ordem, lê calendários e vigências, valida locais e computa token opaco da demanda. B11 expõe evaluateInTransaction para reutilizar regras sob o mesmo lock, com veículos/motoristas ordenados.
Confirmação revalida versão/token, fechamento, pendências, cobertura e capacidade; consulta ocupações em timestamps absolutos, inclusive datas adjacentes. Substituição desativa ocupações anteriores da data e insere novas dentro da transação, sem DELETE. Falha preserva anterior. Repetição da mesma revisão confirmada não duplica. Ocupações são gravadas somente sob a mesma barreira pelos serviços autorizados.
Triggers de jornada/recibo marcam plano confirmado como necessitando revisão atomicamente, preservando veículos. Leitura também reavalia cadastros/eligibilidade/disponibilidade, sem depender de histórico público. B13 usará a mesma barreira. Sem meta de desempenho inventada; consultas por data/aluno e recursos indexados, sem benchmark.
