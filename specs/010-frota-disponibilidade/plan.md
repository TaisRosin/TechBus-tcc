# Implementation Plan — B11
**Branch real**: codex/001-base-backend | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)
## Summary
Cadastros de veículos/motoristas; semana por veículo e exceção por data; avaliação de propostas locais/intermunicipais com motoristas por trecho. Nenhuma alocação confirmada, mensagem ou integração real.
## Technical Context
Mesmas versões locais verificadas: Node 24.22.1/npm 11.17.0, NestJS 11.2.7, TS 5.8.3, TypeORM 0.3.31, pg 8.16.3, PostgreSQL 17.11. Jest existente. Bancos dev 55432/test 55433; synchronize:false, migrações explícitas. Nenhuma dependência nova ou pesquisa de versões necessária.
## Constitution Check
Pré/pós-desenho aprovado: decisões existentes, disponibilidade confirmada, TDD nas interfaces públicas já usadas (domínio, serviços com PostgreSQL real e HTTP), sem recomendações locais, identidade real ou infraestrutura externa. Sem violações.
## Project Structure
backend/src/fleet/{domain/fleet.ts,application/fleet.service.ts,application/ports.ts,infrastructure/fleet-queries.ts,http/fleet.controller.ts}; integração pela RegistryTransaction e RegistryModule. Migração backend/src/infrastructure/database/migrations/1793400000000-fleet.ts. Testes backend/test/{unit/fleet.spec.ts,integration/fleet.spec.ts,integration/fleet-migration.spec.ts,e2e/fleet.e2e-spec.ts}.
## Estratégia
Reusar autorização, paginação, erros seguros e versões. Linha do veículo bloqueada antes de editar calendário/exceções; avaliação bloqueia locais e veículos em ordem estável, depois motoristas. Semana e exceções compartilham versão do veículo. Proposta de etapas recebida/avaliada sem persistir ocupação; B12 deverá revalidar na própria transação e comparar alocações persistidas.
Disponibilidade usa minutos a partir da meia-noite da data operacional America/Sao_Paulo, com fim até 2880 para cruzar meia-noite sem inventar horários. Faixas [início,fim), etapas collection/intermunicipal/distribution. Faixas adjacentes cobrem período contínuo, lacunas não. Semana exatamente sete dias (0 domingo); null não configurada, lista vazia indisponível. Exceção substitui toda disponibilidade da data.
Dados JSON estruturados têm validação de formato/intervalos também no banco; nenhuma permissão DELETE da aplicação. Não criar contas para motoristas nem persistir acesso por inferência.
