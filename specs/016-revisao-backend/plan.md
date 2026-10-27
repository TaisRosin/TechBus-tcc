# Implementation Plan — B17
**Branch**: codex/001-base-backend (preservada) | **Date**: 2026-10-26 | [Spec](spec.md)
## Summary
Revisão orientada aos requisitos, matriz de evidências e cenário integrado adicional. Não reescrever módulos nem repetir decisões. Corrigir apenas falhas comprovadas pelos testes/revisão.
## Technical Context
Runtime/dependências B16 preservados: Node 24.22.1, npm 11.17.0, NestJS 11.2.7, TypeScript 5.8.3, TypeORM 0.3.31, pg 8.16.3, PostgreSQL 17.11 e Jest 30. Mesmos dev/test isolados; sem migração nova prevista, synchronize false. Testes observam serviços públicos, HTTP e restrições reais, com Clock/portas externas simulados. Sem meta de carga presumida.
## Constitution Check
Antes/depois: regras de AGENTS/docs preservadas, aprovação por pedido de iniciar B17, nenhuma nova regra nem serviço externo, registros mínimos mantidos. TDD para qualquer defeito encontrado; revisão/teste integrado de comportamento existente pode passar na primeira execução sem forçar alteração artificial. Sem novas interfaces de produto.
## Structure
specs/016-revisao-backend/{coverage.md,verification.md,plan.md,research.md,data-model.md,contracts/internal.md,quickstart.md,tasks.md}; backend/test/integration/backend-review.spec.ts. Correções pontuais nos módulos/testes afetados somente quando comprovadas. Docs e README apontam para evidências sem duplicar requisitos.
## Estratégia
1. Mapear R01–R22/O01 para testes existentes e limites. Revisão direcionada às transações B07–B16 e autorização B03.
2. Novo cenário contínuo: consulta com falha → resposta durável atrasada → fechamento/volta padrão → alocação → publicação → correção de endereço → revisão/republicação → cancelamento recebido no prazo e interpretado depois → listas/itinerário/ocupações preservados.
3. Executar regressão completa após build; lint/tipos, migrações pendentes e limpeza de fixtures. Não reverter migrações de etapas anteriores desnecessariamente.
4. Registrar classificação e pendências B18/B19/B20. Não declarar produto completo ou integração real.
