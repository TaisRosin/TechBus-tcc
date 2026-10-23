# Plano B05 — Calendários e elegibilidade
Data: 23/10/2026. [Spec aprovada](spec.md). Checklist 16/16; confirmação de Taís autoriza implementação integral.

## Summary
Ampliar módulo registry da B04 com CalendarService e EligibilityService, domínio puro de calendário e avaliação, portas transacionais no mesmo adaptador. Evita duplicação de conexões, cadastro e autorização. Sem efeitos em confirmações ou mensagens. Correção vale na próxima avaliação.

## Technical Context
Reutilizar Node 24.22.1/npm 11.17.0, NestJS 11.2.7, TS 5.8.3, TypeORM 0.3.31, pg 8.16.3 e PostgreSQL 17.11 locais, sem novas dependências. Backend HTTP Nest; Jest unit/integration/e2e; dev/test isolados 55432/55433. Uma empresa e duas universidades; listagem de exceções limitada a 366 dias, consultas por chave/índice. Sem meta de latência inventada.

## Constitution Check
Antes/depois do desenho: aprovado. R03, vigência B04, precisão temporal e decisão confirmada preservados. TDD de regras e concorrência, avaliação sem confirmação implícita, dados sintéticos, sem Supabase/serviço real. Nenhuma alteração arquitetural relevante. Interfaces de teste: domínio de elegibilidade, serviços com PostgreSQL real e HTTP autenticado; escolhas técnicas já autorizadas pelo fluxo do usuário.

## Project Structure
`backend/src/registry/domain/calendar.ts`, `application/{calendar.service,eligibility.service}.ts`, `http/calendar.controller.ts`; ampliar ports.ts, postgres-registry-store.ts e registry.module.ts. Migração `1792900000000-university-calendar.ts`. Testes `test/unit/calendar.spec.ts`, `test/integration/calendar.spec.ts`, `test/e2e/calendar.e2e-spec.ts`. Artefatos complementares: [dados](data-model.md), [contratos](contracts/http.md), [pesquisa](research.md), [guia](quickstart.md).

Transação READ COMMITTED. Escritas: executor FOR SHARE → calendário FOR UPDATE → exceção. Uma revisão por calendário serializa semana e exceções; expectedVersion obrigatório. Avaliação interna: aluno FOR UPDATE → calendário FOR SHARE → ler vigências/exceção; escritores B04 já bloqueiam aluno. Resultado é fotografia, não autorização permanente; futuros comandos devem revalidar na própria transação. Nenhuma avaliação recebe token público ou telefone por endpoint anônimo.

## Validação
RED/GREEN por fatia; precedência, falta de configuração, dias vazios, vigência, inatividade, fuso, 17h estrito, instante recebido e correções; PostgreSQL concorrente com revisões e permissões; HTTP RBAC; regressão/build/lint/types. Reversões históricas não podem remover tabelas agora referenciadas: manter testes de idempotência e verificar reversão B05 isolada antes de dados operacionais. Sem execução de integrações futuras.
