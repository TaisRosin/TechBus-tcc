# Implementation Plan — B15
**Date**: 2026-10-26 | **Branch**: codex/001-base-backend | [Spec](spec.md)
## Summary
Consulta administrativa consolidada, vínculo exclusivo conta/motorista e consultas das atribuições confirmadas. Data atual e anterior enquanto o último trecho confirmado não terminou; leitura não reabre comandos. Cancelados saem imediatamente; mudanças de grupo/universidade não transferem aluno automaticamente.
## Technical Context
Mesmas versões/dependências B14: NestJS 11.2.7, Node 24.22.1, TypeORM 0.3.31, pg 8.16.3, TS 5.8.3, PostgreSQL 17.11, Jest 30. Sem serviços reais, frontend, infraestrutura nova ou pesquisa repetida de versões.
## Constitution Check
Aprovado antes/depois do desenho: Q1/Q2 explícitas, perfis fixos, consulta restrita, sem histórico público, retenção preservada, banco local isolado. Testes nas interfaces públicas de serviços/HTTP e restrições reais do PostgreSQL, como incrementos anteriores.
## Structure
backend/src/operation/{application/consultation.service.ts,application/consultation-ports.ts,infrastructure/consultation-queries.ts,domain/consultation.ts,http/consultation.controller.ts}; composição RegistryStore/RegistryModule. Migração 1793800000000-operational-queries.ts. Testes unit/consultation.spec.ts, integration/consultation.spec.ts, integration/consultation-migration.spec.ts, e2e/consultation.e2e-spec.ts.
## Consistência
Ordem: lock de usuários B03 → ator/vínculo → places.lock B06 → alunos/calendários → plano. Leituras reutilizam avaliação B12, coletam listas paginadas e não escrevem estado operacional. Vínculo só admin, versão esperada, restrição única por motorista; revogação conserva linha com driverId null. Não inferir identidade por telefone.
Fotografia mínima dos vínculos aluno/sentido/grupo/universidade gravada na confirmação B12. Necessária para não redistribuir aluno automaticamente se mudar de grupo/universidade durante revisão. Driver vê interseção da fotografia com confirmação e associação atuais; detalhes ambíguos omitidos, alerta sem expor alunos alheios. Snapshot ausente em plano anterior exige reconfirmação, nunca backfill especulativo. Mantém ocupações existentes. Sentidos intermunicipais reutilizam ordem outbound/return já definida pelo parser.
Guard HTTP valida sessão; serviço revalida perfil e atribuição transacionalmente em todas as rotas de motorista. Não usar a porta B03 de exemplo como autorização definitiva. Identificadores de trecho incluem data/versão/índices; revisão substituída não mantém acesso pelo identificador anterior. Nenhuma rota de histórico ou cálculo de trajeto B16.
