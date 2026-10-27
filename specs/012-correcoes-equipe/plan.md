# Implementation Plan — B13
**Branch real**: codex/001-base-backend | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)
## Summary
Correção administrativa de jornada, revisão explícita de pendências, registro mínimo e invalidação de planejamento reutilizando B07–B12.
## Technical Context
Node 24.22.1/npm 11.17.0, NestJS 11.2.7, TypeScript 5.8.3, TypeORM 0.3.31, pg 8.16.3, PostgreSQL 17.11 e Jest existentes. Sem dependência nova. Dev 55432/test 55433, synchronize:false. Uma empresa; API local do dia atual. Sem meta de desempenho ou benchmark inventado.
## Constitution Check
Antes e depois do desenho: aprovado. Q1/Q2 confirmadas; autorização existente, nenhum serviço real, TDD no domínio/serviço público/HTTP e PostgreSQL isolado. Sem mudança de arquitetura ou retenção automática.
## Project Structure
backend/src/journey/domain/correction.ts; application/correction.service.ts, correction-ports.ts; infrastructure/correction-queries.ts; http/correction.controller.ts. Composição RegistryStore/RegistryModule, extensão mínima de JourneyService/domínio para preservar origem equipe. Migração 1793600000000-team-corrections.ts. Testes unit/correction.spec.ts, integration/correction.spec.ts e correction-migration.spec.ts, e2e/correction.e2e-spec.ts.
## Consistência
Mesma ordem: autorizar → places.lock (82406,1) → aluno FOR UPDATE → calendário compartilhado → jornada/recibos/registro. Revisão esperada e lista exata de recibos pendentes revisados impedem limpar mensagens que chegaram depois da leitura. Correção ocupa sequência via recibo interno já finalizado, criando barreira contra comandos anteriores; mensagens pendentes revisadas recebem RESOLVED_BY_TEAM. Origem equipe nos trechos explicitamente alterados; campos omitidos preservados.
Registro imutável de entrada normalizada/hash, ator, justificativa, instante e resultado para repetição idempotente. Colisão do mesmo ID com conteúdo/ator diferente rejeitada. Mudança da jornada ativa o trigger B12 na mesma transação; ocupações não são liberadas. Consultas B10 usam jornadas atualizadas, sem contador separado.
Ida confirmada pela equipe não gera volta implícita/default; confirmação posterior explícita do aluno segue B07. Correção somente de local não muda intenções nem antecipa fechamento; cancelamento posterior válido segue B08. Atualização explícita de universidade só pode adotar a universidade atual do cadastro, revalidando elegibilidade; sem migração silenciosa.
