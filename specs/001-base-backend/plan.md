# Implementation Plan: B02 — Base verificável do backend

**Branch**: `codex/001-base-backend` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)
**Input**: preparação técnica de B01 + B02. Implementação autorizada por Taís em 22/10/2026.

## Summary
Preparar ambiente reproduzível e um backend modular mínimo com prontidão, relógio substituível e persistência local isolada. Escopo incremental, sem permissões/cadastros nem conexões reais. Fontes de domínio continuam em docs/; não reproduzir o backlog inteiro aqui.

## Technical Context
- **Language/Version**: Node 24.22.1, TypeScript 5.8.3; npm 11.17.0 com engines conferidas e instalação validada.
- **Primary Dependencies**: Nest 11.2.7, CLI 11.0.10, @nestjs/typeorm 11.0.0, TypeORM 0.3.31, pg 8.16.3, reflect-metadata 0.2.2, rxjs 7.8.1. [Evidências e restrições](research.md).
- **Storage**: PostgreSQL 17.11, dois clusters locais privados por binários ZIP Windows; synchronize=false e migrationsRun=false; migrações explícitas via CLI.
- **Testing**: Jest do scaffold com versões fixadas/verificadas em T003; unitários de comportamento e integração/e2e local. Fixture de migração exclusiva dos testes.
- **Target Platform**: desenvolvimento Windows/PowerShell; hospedagem futura aberta.
- **Project Type**: backend web modular no mesmo projeto; não exige deploy separado.
- **Performance Goals**: sem SLA inventado; probe de banco tem timeout de 2s proposto para não pendurar prontidão.
- **Constraints**: apenas loopback; dados sintéticos; nenhum segredo versionado; nenhum provedor real.
- **Scale/Scope**: B02 e preparação remanescente de B01, três histórias técnicas. B03 será próxima especificação.

## Constitution Check

| Gate | Antes da pesquisa | Após desenho |
| --- | --- | --- |
| Decisões aprovadas e escopo preservados | Conforme | Conforme: B03–B20 não implementados |
| Backend valida regras e acessos | Conforme | Sem rotas de negócio; acesso será B03 |
| Testes de comportamento e PostgreSQL isolado | Previsto | Tarefas de TDD/integração incluídas |
| Tempo substituível e registros preservados | Previsto | Clock e conversão explícita; sem limpeza operacional |
| Backend primeiro, sem serviços reais | Conforme | Só instâncias locais sintéticas |

Sem desvios. Migração de teste não fecha modelo físico de domínio. Compatibilidade executável comprovada por instalação/build/testes; ver verification.md.

## Project Structure

### Documentation (this feature)
`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/base.md`, `quickstart.md`, `tasks.md`, `checklists/requirements.md`.

### Source Code (repository root)
Estrutura implementada nesta etapa:

```text
backend/
  package.json, package-lock.json, nest-cli.json, tsconfig.json
  .env.example, .env.test.example
  src/
    main.ts, app.module.ts
    config/environment.ts
    infrastructure/database/data-source.ts
    infrastructure/database/migrations/
    infrastructure/database/postgres-probe.ts
    shared/time/clock.ts, system-clock.ts, operational-date.ts
    health/application/check-readiness.ts
    health/application/ports/database-probe.ts
    health/http/health.controller.ts
    health/health.module.ts
  test/
    unit/, integration/, e2e/, fixtures/migrations/
    support/fixed-clock.ts, test-database.ts
scripts/local-postgres.ps1
.local/postgres/    # ignorado: binários e clusters locais
```

**Structure Decision**: separar apenas componentes necessários à primeira fatia, sem abstrações genéricas ou módulos vazios. Sem criar frontend agora. Manter migrações de domínio vazias até entidades reais; executor é provado com fixture isolada.

## Complexity Tracking
Nenhuma violação exige justificativa adicional. Dois clusters em vez de somente dois schemas impedem que credenciais/limpeza dos testes afetem desenvolvimento. Guia inclui validação prévia de alvo e portas.

## Entrega e aprovação
Entregar US1 primeiro como base mínima; US2 confirma persistência/migrações; US3 completa separação e tempo. B02 só concluída após todas as histórias e quickstart verificados. Não marcar backend completo antes de B17. Aprovar este conjunto não autoriza serviços reais ou publicação.
