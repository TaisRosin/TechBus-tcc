# Implementation Plan: B03 — Autorização da equipe

**Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)
**Git**: checkout existente preservado, sem commit inicial; feature independente em .specify/feature.json. Autorização integral concedida após respostas de negócio, sem nova aprovação por tarefa.

## Summary
Implementar política fixa por papel, vínculo ativo consultado no backend e alteração transacional de acesso que preserva o último administrador. Rotas protegidas por padrão; identidade real indisponível por padrão, substituída apenas no módulo de testes. Atribuição de viagem via porta, sem criar B15.

## Technical Context
Node 24.22.1/npm 11.17.0, TypeScript 5.8.3, Nest 11.2.7, TypeORM 0.3.31, pg 8.16.3 e PostgreSQL 17.11 da B02; nenhuma dependência nova. Backend modular Windows/local, mesmas duas instâncias. Jest unit/integration/e2e seriais. Sem SLA ou implantação inventados. Uma empresa, três histórias, uma tabela mínima de equipe.

## Constitution Check
Antes e após desenho: decisões preservadas; R20 detalhado pelas três respostas aceitas; TDD nas fronteiras HTTP/casos de uso/repositório transacional; PostgreSQL isolado; nenhuma integração real; sem dados de alunos, viagens ou passwords. A autorização concedida cobre decisões técnicas e interfaces de teste sem nova pergunta, conforme instrução expressa da usuária. Sem desvios arquiteturais.

## Project Structure
- src/access/domain/: perfis, política e erros seguros.
- src/access/application/: portas de identidade, equipe e atribuições; casos de autorização/alteração.
- src/access/http/: guard global, metadados, controller e filtro.
- src/access/infrastructure/: repositório TypeORM e adaptadores indisponíveis por padrão.
- src/access/access.module.ts; app.module.ts integra módulo; health declara exceção pública.
- src/infrastructure/database/migrations/: tabela mínima de equipe e grants locais específicos.
- test/unit/access.spec.ts, test/integration/access-store.spec.ts, test/e2e/access.e2e-spec.ts e support/.

## Execution and Validation
Fatias US1 → US2 → US3, com teste falhando antes do comportamento. Fronteiras: política/casos (negações e gestão), PostgreSQL (persistência/concorrência) e HTTP (não contornar política). Ver [contratos](contracts/access.md), [dados](data-model.md) e [quickstart](quickstart.md). Identidades, equipe e atribuições sintéticas somente nos testes. Migração de produção não semeia usuários. Aplicar explicitamente a dev/test; ciclo reversível somente test e sem destruir dados anteriores. Transações curtas sem chamadas externas sob lock; verificar ator novamente na mutação. Last-admin protegido por serialização de todas as alterações de acesso. Revisão esperada evita sobrescrita/repetição de comando. Alteração de papel/ativo vale na próxima requisição.

## Complexity Tracking
Nenhuma nova camada genérica, biblioteca, serviço ou infraestrutura. Sem JWT próprio, simulador acessível por rede, filas ou convites fictícios.
