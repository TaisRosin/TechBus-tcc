# Implementation Plan — B09
**Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)
**Branch real**: codex/001-base-backend.
## Summary
Consolidar invariantes B07/B08 com falhas transacionais e concorrência reais no PostgreSQL local. Acrescentar entrada explícita receiveUnordered e resultado do lote que distingue processamento de conclusão sem pendências.
## Technical Context
Mesmas versões verificadas: Node 24.22.1/npm 11.17.0, TS 5.8.3, NestJS 11.2.7, TypeORM 0.3.31, pg 8.16.3, PostgreSQL 17.11. Jest existente, sem dependências novas. dev 55432/test 55433, synchronize:false, papel app sem DELETE/DDL. Sem nova migração prevista: esquema B07/B08 suficiente.
## Constitution Check
Pré/pós-desenho aprovado: decisões existentes, fronteiras públicas já adotadas, testes críticos primeiro, transação real e relógio substituível, ausência de serviços externos. Sem violações ou perguntas artificiais.
## Project Structure
- backend/src/journey/application/journey.service.ts: receiveUnordered e resultados do lote.
- backend/test/integration/journey-resilience.spec.ts: serviço público com PostgreSQL real, falhas controladas por decorador da porta RegistryStore.
- backend/test/e2e/journey.e2e-spec.ts: reutilizar proteção HTTP existente; nenhuma nova mutação pública.
## Estratégia
Testar falha após INSERT de recibo e após save/finish dentro da mesma transação real, sem mock do banco nem trigger persistente. Decorador delega ao PostgresRegistryStore e lança falha controlada na fronteira da porta; verificação usa serviço público. Novas instâncias/conexões comprovam retomada. Nenhuma modificação dos arquivos de configuração/segredos. Cenários concorrentes limitados não são benchmark de carga.

receive continua entrada interna com ordem conhecida; receiveUnordered força uncertain sem parâmetro que permita promovê-la. Futuro adaptador sem prova usa essa entrada. Não inventar capacidade de ordenação do provedor. closeDay retorna processed/failed; processed inclui needsAdjustment e pending. Repetir lote desde início ou repetir IDs com falha é operação segura; cursor não representa quitação das falhas anteriores.
