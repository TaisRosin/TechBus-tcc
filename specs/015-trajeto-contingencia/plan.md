# Implementation Plan — B16
**Branch**: codex/001-base-backend (preservada) | **Date**: 2026-10-26 | [Spec](spec.md)
## Summary
Ordem padrão por grupo/sentido e publicação explícita do itinerário local por operação/grupo, preservando a última publicação durante revisão. Cancelamentos filtram paradas vazias imediatamente; locais novos permanecem pendentes. Reutilizar listas/autorização B15 em uma mesma transação.
## Technical Context
Backend NestJS 11.2.7, Node 24.22.1/npm 11.17.0, TypeScript 5.8.3, TypeORM 0.3.31, pg 8.16.3, PostgreSQL 17.11 e Jest 30 existentes. Sem novas dependências. PostgreSQL dev/test isolados; synchronize false. Uma empresa; sem meta de carga inventada. Limite técnico de 1000 locais por ordem, com IDs únicos. Nenhum serviço real ou frontend.
## Constitution Check
Antes/depois do desenho: decisões Q1/Q2 explícitas, comandos e alocações preservados, dados mínimos sem exclusão automática, mesma arquitetura e bancos locais. Interfaces de teste reutilizam serviços públicos, HTTP, funções puras e restrições PostgreSQL dos incrementos anteriores. Sem necessidade de nova aprovação técnica por tarefa.
## Project Structure
backend/src/itinerary/{domain/itinerary.ts,application/ports.ts,application/itinerary.service.ts,application/routing.ts,infrastructure/itinerary-queries.ts,http/itinerary.controller.ts}; composição RegistryStore/RegistryModule e leitura transacional de ConsultationService. Migração 1793900000000-itineraries.ts. Testes unit/itinerary.spec.ts, unit/routing.spec.ts, integration/itinerary.spec.ts, integration/itinerary-migration.spec.ts, e2e/itinerary.e2e-spec.ts.
## Consistência e publicação
Ordem: autorização → places.lock B06 → alunos/calendários → planejamento/publicação. Motorista usa lock de acesso B15 antes de places.lock. Não invocar outra transação dentro da leitura do itinerário; extrair leitura B15 reutilizável por transação.
Preview administrativo usa confirmações atuais por grupo e mostra locais sem posição; publicação exige planejamento confirmado sem pendências, locais ordenados, versão esperada da publicação e token do preview ainda atual. Guardar vínculo com versão confirmada do plano. Substituição confirmada do plano exige nova publicação; rascunho não revoga última atribuição B15.
Ordem padrão e publicação são registros distintos. Motorista filtra a última ordem publicada pelos locais de seus passageiros atuais B15. Novos locais são pendências, nunca anexados ao final. Alerta por ordem padrão/revisão/demanda alterada; não precisa republicar para retirar cancelados. Nenhum cálculo é executado em uma leitura ou dentro de transação.
## Integração automática
Contrato interno sem nomes/telefones, contendo referências locais e coordenadas/âncoras fornecidas por integração confiável futura. Adaptador padrão indisponível; validação de resposta como permutação exata. Sem rota HTTP que aceite coordenadas como prova de área. Contingência informa método manual; trajetória intermunicipal geográfica aguarda âncoras/provedor B18, não inventa paradas locais nesse trecho.
