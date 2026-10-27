# Implementation Plan — B10
**Branch real**: codex/001-base-backend | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)
## Summary
Derivar sequência das jornadas atuais, sem tabela de contribuições duplicada. Persistir somente decisões sobre padrões/sugestões. Porta interna recebe recibos duráveis B07; leitura administrativa apresenta sugestão atual por trecho, sem histórico público.
## Technical Context
Backend NestJS 11.2.7, Node 24.22.1, npm 11.17.0, TypeScript 5.8.3, TypeORM 0.3.31, pg 8.16.3, PostgreSQL 17.11, Jest existente. Mesmas dependências/lockfile B02, sem instalação. Dev 55432/test 55433 isolados; synchronize:false. Uma empresa, operação noturna. Sem metas artificiais de carga: consulta indexada por aluno/data e transações curtas; nenhum benchmark alegado.
## Constitution Check
Pré e pós-desenho: aprovado. Decisões confirmadas, testes em interfaces públicas já adotadas (domínio, serviço com PostgreSQL real, HTTP), recebimento durável, autorização, dados mínimos, nenhuma integração real. Sem violações. FR-005/006 aprovados; arquitetura preservada.
## Project Structure
- backend/src/journey/domain/patterns.ts: sequência e comando restrito.
- backend/src/journey/application/pattern.service.ts e pattern-ports.ts: avaliação e decisão transacional.
- backend/src/journey/infrastructure/pattern-queries.ts: leitura das contribuições existentes e decisões.
- backend/src/journey/http/pattern.controller.ts: leitura administrativa atual.
- backend/src/registry/application/ports.ts, infrastructure/postgres-registry-store.ts e registry.module.ts: composição das portas/providers.
- backend/src/infrastructure/database/migrations/1793300000000-place-patterns.ts: tabela mínima de decisões, restrições e privilégios.
- backend/test/unit/patterns.spec.ts, integration/patterns.spec.ts, integration/patterns-migration.spec.ts e e2e/patterns.e2e-spec.ts.
## Estratégia
Fatias TDD: contagem → persistência/recusa → aceite/pedido → concorrência/HTTP. Reusar lock de locais antes de aluno, comum às jornadas e padrões. Avaliação atual e aceite usam a mesma transação. Não materializar sugestões em GET: identificador determinístico da sequência; recusa registrada impede repetição. Recalcular antes de aceitar torna cancelamentos/revisões imediatamente efetivos. Sem fila nem alteração de B07–B09.
