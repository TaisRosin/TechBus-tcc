# Implementation Plan: B07 — Jornada e comandos explícitos

**Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)
**Git branch**: codex/001-base-backend; seleção da feature independente da branch.

## Summary
Jornada única por aluno/dia, estados por sentido, comandos internos tipados e leitura administrativa do dia. Recusa explícita prevalece sobre volta implícita; confirmação sem local conta e sinaliza ajuste. Recebimento durável separado da interpretação, sem endpoint público de comandos enquanto identificação real não existe.

## Technical Context
Node 24.22.1/npm 11.17.0, TypeScript 5.8.3, NestJS 11.2.7, TypeORM 0.3.31, pg 8.16.3; versões existentes em package.json/lockfile, sem atualização ou dependência nova. PostgreSQL 17.11 local: dev 55432, test 55433. Migrações explícitas, synchronize:false, papel app sem DELETE/DDL. Jest 30, testes de domínio/serviço persistido/HTTP. Uma empresa, duas universidades; sem meta de carga inventada.

## Constitution Check
Antes e após desenho: aprovado. Decisões confirmadas preservadas; backend valida; TDD nas fronteiras públicas já adotadas (domínio, serviço, HTTP); tempo durável, duplicatas e revisões protegidos; somente dados sintéticos/local. B08 implementará fechamento/cancelamento; B09 ampliará ordenação de eventos externos. Não expor comando sem identidade confiável. Sem violações.

## Project Structure
- backend/src/journey/{domain,application,infrastructure,http}/: regras, serviço e persistência.
- backend/src/registry/: reutilizar a transação e as portas de cadastro/calendário/locais; registrar serviço/controlador sem novo pool.
- backend/src/infrastructure/database/migrations/1793100000000-daily-journey.ts.
- backend/test/{unit,integration,e2e}/journey*: testes por fronteira.
- spec.md, research.md, data-model.md, contracts/internal-http.md, quickstart.md, tasks.md e verification.md nesta pasta.

## Estratégia
Receber com relógio do backend e persistir antes de interpretar. Ordenar recebimentos internos por sequência sob trava do aluno. Aplicar comando em transação: trava de locais → aluno → calendário; reler elegibilidade e locais na mesma transação. Repetição retorna resultado armazenado, evento mais antigo não sobrescreve, ordem não comprovada vira pendência. Rejeições/pedidos de esclarecimento preservam estados. Contexto diário não muda silenciosamente quando cadastro muda. Leitura calcula pendências atuais sem reescrever confirmações.
