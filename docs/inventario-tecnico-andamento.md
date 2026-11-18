# TechBus — inventário técnico do andamento

**Levantamento de fonte: 17/11/2026.** Complemento ao [guia de apresentação](guia-apresentacao-andamento.md). Não é consulta ao banco nem teste de disponibilidade de endpoints. Os controllers e serviços definem autorização e validações.

## 1. Referências técnicas

- [Manifesto backend](../backend/package.json) e [lockfile](../backend/package-lock.json).
- [Manifesto frontend](../frontend/package.json) e [lockfile](../frontend/package-lock.json).
- [Inicialização NestJS](../backend/src/main.ts), [composição](../backend/src/app.module.ts) e [configuração](../backend/src/config/environment.ts).
- [Aplicação React](../frontend/src/App.tsx) e [cliente HTTP](../frontend/src/lib/api.ts).
- [DataSource de migrações](../backend/src/infrastructure/database/data-source.ts).
- [Evolution e patches](../infrastructure/evolution/README.md).
- [Execução do painel](../frontend/README.md) e [launcher](../scripts/painel-local.ps1).

## 2. Incrementos e evidências

Numeração Spec Kit e blocos B não são iguais: 017 é B18.1; 021 é painel B19.1. Leia os registros históricos junto das mudanças posteriores.

| Incremento | Artefatos |
| --- | --- |
| 001-base-backend | [spec.md](../specs/001-base-backend/spec.md) · [plan.md](../specs/001-base-backend/plan.md) · [tasks.md](../specs/001-base-backend/tasks.md) · [verification.md](../specs/001-base-backend/verification.md) |
| 002-autorizacao-equipe | [spec.md](../specs/002-autorizacao-equipe/spec.md) · [plan.md](../specs/002-autorizacao-equipe/plan.md) · [tasks.md](../specs/002-autorizacao-equipe/tasks.md) · [verification.md](../specs/002-autorizacao-equipe/verification.md) |
| 003-cadastros-vigencias | [spec.md](../specs/003-cadastros-vigencias/spec.md) · [plan.md](../specs/003-cadastros-vigencias/plan.md) · [tasks.md](../specs/003-cadastros-vigencias/tasks.md) · [verification.md](../specs/003-cadastros-vigencias/verification.md) |
| 004-calendarios-elegibilidade | [spec.md](../specs/004-calendarios-elegibilidade/spec.md) · [plan.md](../specs/004-calendarios-elegibilidade/plan.md) · [tasks.md](../specs/004-calendarios-elegibilidade/tasks.md) · [verification.md](../specs/004-calendarios-elegibilidade/verification.md) |
| 005-grupos-locais | [spec.md](../specs/005-grupos-locais/spec.md) · [plan.md](../specs/005-grupos-locais/plan.md) · [tasks.md](../specs/005-grupos-locais/tasks.md) · [verification.md](../specs/005-grupos-locais/verification.md) |
| 006-jornada-comandos | [spec.md](../specs/006-jornada-comandos/spec.md) · [plan.md](../specs/006-jornada-comandos/plan.md) · [tasks.md](../specs/006-jornada-comandos/tasks.md) · [verification.md](../specs/006-jornada-comandos/verification.md) |
| 007-fechamento-cancelamento | [spec.md](../specs/007-fechamento-cancelamento/spec.md) · [plan.md](../specs/007-fechamento-cancelamento/plan.md) · [tasks.md](../specs/007-fechamento-cancelamento/tasks.md) · [verification.md](../specs/007-fechamento-cancelamento/verification.md) |
| 008-idempotencia-concorrencia | [spec.md](../specs/008-idempotencia-concorrencia/spec.md) · [plan.md](../specs/008-idempotencia-concorrencia/plan.md) · [tasks.md](../specs/008-idempotencia-concorrencia/tasks.md) · [verification.md](../specs/008-idempotencia-concorrencia/verification.md) |
| 009-padroes-sequencia | [spec.md](../specs/009-padroes-sequencia/spec.md) · [plan.md](../specs/009-padroes-sequencia/plan.md) · [tasks.md](../specs/009-padroes-sequencia/tasks.md) · [verification.md](../specs/009-padroes-sequencia/verification.md) |
| 010-frota-disponibilidade | [spec.md](../specs/010-frota-disponibilidade/spec.md) · [plan.md](../specs/010-frota-disponibilidade/plan.md) · [tasks.md](../specs/010-frota-disponibilidade/tasks.md) · [verification.md](../specs/010-frota-disponibilidade/verification.md) |
| 011-alocacao-planejamento | [spec.md](../specs/011-alocacao-planejamento/spec.md) · [plan.md](../specs/011-alocacao-planejamento/plan.md) · [tasks.md](../specs/011-alocacao-planejamento/tasks.md) · [verification.md](../specs/011-alocacao-planejamento/verification.md) |
| 012-correcoes-equipe | [spec.md](../specs/012-correcoes-equipe/spec.md) · [plan.md](../specs/012-correcoes-equipe/plan.md) · [tasks.md](../specs/012-correcoes-equipe/tasks.md) · [verification.md](../specs/012-correcoes-equipe/verification.md) |
| 013-mensagens-agendamentos | [spec.md](../specs/013-mensagens-agendamentos/spec.md) · [plan.md](../specs/013-mensagens-agendamentos/plan.md) · [tasks.md](../specs/013-mensagens-agendamentos/tasks.md) · [verification.md](../specs/013-mensagens-agendamentos/verification.md) |
| 014-consultas-operacionais | [spec.md](../specs/014-consultas-operacionais/spec.md) · [plan.md](../specs/014-consultas-operacionais/plan.md) · [tasks.md](../specs/014-consultas-operacionais/tasks.md) · [verification.md](../specs/014-consultas-operacionais/verification.md) |
| 015-trajeto-contingencia | [spec.md](../specs/015-trajeto-contingencia/spec.md) · [plan.md](../specs/015-trajeto-contingencia/plan.md) · [tasks.md](../specs/015-trajeto-contingencia/tasks.md) · [verification.md](../specs/015-trajeto-contingencia/verification.md) |
| 016-revisao-backend | [spec.md](../specs/016-revisao-backend/spec.md) · [plan.md](../specs/016-revisao-backend/plan.md) · [tasks.md](../specs/016-revisao-backend/tasks.md) · [verification.md](../specs/016-revisao-backend/verification.md) · [coverage.md](../specs/016-revisao-backend/coverage.md) |
| 017-autenticacao-propria | [spec.md](../specs/017-autenticacao-propria/spec.md) · [plan.md](../specs/017-autenticacao-propria/plan.md) · [tasks.md](../specs/017-autenticacao-propria/tasks.md) · [verification.md](../specs/017-autenticacao-propria/verification.md) |
| 018-whatsapp-local | [spec.md](../specs/018-whatsapp-local/spec.md) · [plan.md](../specs/018-whatsapp-local/plan.md) · [tasks.md](../specs/018-whatsapp-local/tasks.md) · [verification.md](../specs/018-whatsapp-local/verification.md) |
| 019-interpretacao-mensagens | [spec.md](../specs/019-interpretacao-mensagens/spec.md) · [plan.md](../specs/019-interpretacao-mensagens/plan.md) · [tasks.md](../specs/019-interpretacao-mensagens/tasks.md) · [verification.md](../specs/019-interpretacao-mensagens/verification.md) · [automation.md](../specs/019-interpretacao-mensagens/automation.md) |
| 020-contexto-conversa | [spec.md](../specs/020-contexto-conversa/spec.md) · [plan.md](../specs/020-contexto-conversa/plan.md) · [tasks.md](../specs/020-contexto-conversa/tasks.md) · [verification.md](../specs/020-contexto-conversa/verification.md) |
| 021-painel-operacional | [spec.md](../specs/021-painel-operacional/spec.md) · [plan.md](../specs/021-painel-operacional/plan.md) · [tasks.md](../specs/021-painel-operacional/tasks.md) · [verification.md](../specs/021-painel-operacional/verification.md) |
| 022-desembarque-fixo | [spec.md](../specs/022-desembarque-fixo/spec.md) · [plan.md](../specs/022-desembarque-fixo/plan.md) · [tasks.md](../specs/022-desembarque-fixo/tasks.md) · [verification.md](../specs/022-desembarque-fixo/verification.md) |
| 023-agendador-operacional | [spec.md](../specs/023-agendador-operacional/spec.md) · [plan.md](../specs/023-agendador-operacional/plan.md) · [tasks.md](../specs/023-agendador-operacional/tasks.md) · [verification.md](../specs/023-agendador-operacional/verification.md) · [ensaio-real.md](../specs/023-agendador-operacional/ensaio-real.md) |
| 024-itinerario-diario | [plan.md](../specs/024-itinerario-diario/plan.md) · [verification.md](../specs/024-itinerario-diario/verification.md) |
| 025-enderecos-pontos | [plan.md](../specs/025-enderecos-pontos/plan.md) · [verification.md](../specs/025-enderecos-pontos/verification.md) |
| 026-mapas-rotas | [plan.md](../specs/026-mapas-rotas/plan.md) · [verification.md](../specs/026-mapas-rotas/verification.md) |

### Caixas de tarefas abertas

Apenas caixas desmarcadas em tasks.md; não substituem as pendências operacionais e acadêmicas do guia.

- T019 Ensaiar cadeia real com aluno fictício explícito e despachante; recibo persistido e worker concluídos em T020–T022. ([019-interpretacao-mensagens](../specs/019-interpretacao-mensagens/tasks.md)).

## 3. Rotas HTTP declaradas

Extraídas dos decorators; presença no backend não significa botão disponível no painel. Nenhuma rota foi chamada durante esta consolidação.

| Método | Caminho | Fonte |
| --- | --- | --- |
| GET | `/api/v1/session` | [access.controller.ts](../backend/src/access/http/access.controller.ts) |
| PATCH | `/api/v1/users/:id/access` | [access.controller.ts](../backend/src/access/http/access.controller.ts) |
| POST | `/api/v1/users/invitations` | [access.controller.ts](../backend/src/access/http/access.controller.ts) |
| POST | `/api/v1/auth/login` | [auth.controller.ts](../backend/src/access/http/auth.controller.ts) |
| POST | `/api/v1/auth/password` | [auth.controller.ts](../backend/src/access/http/auth.controller.ts) |
| POST | `/api/v1/auth/logout` | [auth.controller.ts](../backend/src/access/http/auth.controller.ts) |
| POST | `/api/v1/users` | [auth.controller.ts](../backend/src/access/http/auth.controller.ts) |
| POST | `/api/v1/users/:id/credentials` | [auth.controller.ts](../backend/src/access/http/auth.controller.ts) |
| GET | `/api/v1/users/:id/credentials` | [auth.controller.ts](../backend/src/access/http/auth.controller.ts) |
| POST | `/api/v1/users/:id/password-reset` | [auth.controller.ts](../backend/src/access/http/auth.controller.ts) |
| GET | `/api/v1/vehicles` | [fleet.controller.ts](../backend/src/fleet/http/fleet.controller.ts) |
| POST | `/api/v1/vehicles` | [fleet.controller.ts](../backend/src/fleet/http/fleet.controller.ts) |
| PATCH | `/api/v1/vehicles/:id` | [fleet.controller.ts](../backend/src/fleet/http/fleet.controller.ts) |
| GET | `/api/v1/drivers` | [fleet.controller.ts](../backend/src/fleet/http/fleet.controller.ts) |
| POST | `/api/v1/drivers` | [fleet.controller.ts](../backend/src/fleet/http/fleet.controller.ts) |
| PATCH | `/api/v1/drivers/:id` | [fleet.controller.ts](../backend/src/fleet/http/fleet.controller.ts) |
| GET | `/api/v1/vehicles/:id/availability` | [fleet.controller.ts](../backend/src/fleet/http/fleet.controller.ts) |
| PUT | `/api/v1/vehicles/:id/availability` | [fleet.controller.ts](../backend/src/fleet/http/fleet.controller.ts) |
| GET | `/api/v1/vehicles/:id/availability/exceptions` | [fleet.controller.ts](../backend/src/fleet/http/fleet.controller.ts) |
| PUT | `/api/v1/vehicles/:id/availability/exceptions/:date` | [fleet.controller.ts](../backend/src/fleet/http/fleet.controller.ts) |
| POST | `/api/v1/fleet/evaluate` | [fleet.controller.ts](../backend/src/fleet/http/fleet.controller.ts) |
| GET | `/health/live` | [health.controller.ts](../backend/src/health/http/health.controller.ts) |
| GET | `/health/ready` | [health.controller.ts](../backend/src/health/http/health.controller.ts) |
| GET | `/api/v1/groups/:id/stop-order` | [itinerary.controller.ts](../backend/src/itinerary/http/itinerary.controller.ts) |
| PUT | `/api/v1/groups/:id/stop-order` | [itinerary.controller.ts](../backend/src/itinerary/http/itinerary.controller.ts) |
| GET | `/api/v1/operations/groups/:id/itinerary` | [itinerary.controller.ts](../backend/src/itinerary/http/itinerary.controller.ts) |
| POST | `/api/v1/operations/groups/:id/itinerary/publish` | [itinerary.controller.ts](../backend/src/itinerary/http/itinerary.controller.ts) |
| GET | `/api/v1/driver/trips/:id/itinerary` | [itinerary.controller.ts](../backend/src/itinerary/http/itinerary.controller.ts) |
| GET | `/api/v1/students/:id/journey/correction` | [correction.controller.ts](../backend/src/journey/http/correction.controller.ts) |
| POST | `/api/v1/students/:id/journey/correction` | [correction.controller.ts](../backend/src/journey/http/correction.controller.ts) |
| GET | `/api/v1/students/:id/journey` | [journey.controller.ts](../backend/src/journey/http/journey.controller.ts) |
| GET | `/api/v1/students/:id/location-suggestions` | [pattern.controller.ts](../backend/src/journey/http/pattern.controller.ts) |
| POST | `/api/v1/maps/geocode` | [maps.controller.ts](../backend/src/maps/maps.controller.ts) |
| GET | `/api/v1/maps/groups/:id` | [maps.controller.ts](../backend/src/maps/maps.controller.ts) |
| POST | `/api/v1/maps/route` | [maps.controller.ts](../backend/src/maps/maps.controller.ts) |
| GET | `/api/v1/messages` | [message.controller.ts](../backend/src/messaging/http/message.controller.ts) |
| POST | `/api/v1/messages/:id/retry` | [message.controller.ts](../backend/src/messaging/http/message.controller.ts) |
| GET | `/api/v1/operations/overview` | [consultation.controller.ts](../backend/src/operation/http/consultation.controller.ts) |
| GET | `/api/v1/access/driver-links/:id` | [consultation.controller.ts](../backend/src/operation/http/consultation.controller.ts) |
| PUT | `/api/v1/access/driver-links/:id` | [consultation.controller.ts](../backend/src/operation/http/consultation.controller.ts) |
| GET | `/api/v1/driver/trips` | [consultation.controller.ts](../backend/src/operation/http/consultation.controller.ts) |
| GET | `/api/v1/driver/trips/:id` | [consultation.controller.ts](../backend/src/operation/http/consultation.controller.ts) |
| GET | `/api/v1/operations/current` | [operation.controller.ts](../backend/src/operation/http/operation.controller.ts) |
| POST | `/api/v1/operations/current/vehicle-options` | [operation.controller.ts](../backend/src/operation/http/operation.controller.ts) |
| PUT | `/api/v1/operations/current/planning` | [operation.controller.ts](../backend/src/operation/http/operation.controller.ts) |
| POST | `/api/v1/operations/current/planning/confirm` | [operation.controller.ts](../backend/src/operation/http/operation.controller.ts) |
| GET | `/api/v1/universities/:id/calendar` | [calendar.controller.ts](../backend/src/registry/http/calendar.controller.ts) |
| PATCH | `/api/v1/universities/:id/calendar` | [calendar.controller.ts](../backend/src/registry/http/calendar.controller.ts) |
| GET | `/api/v1/universities/:id/calendar/exceptions` | [calendar.controller.ts](../backend/src/registry/http/calendar.controller.ts) |
| PUT | `/api/v1/universities/:id/calendar/exceptions/:date` | [calendar.controller.ts](../backend/src/registry/http/calendar.controller.ts) |
| GET | `/api/v1/groups` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| POST | `/api/v1/groups` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| PATCH | `/api/v1/groups/:id` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| GET | `/api/v1/regions` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| POST | `/api/v1/regions` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| PATCH | `/api/v1/regions/:id` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| GET | `/api/v1/boarding-points` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| POST | `/api/v1/boarding-points` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| PATCH | `/api/v1/boarding-points/:id` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| GET | `/api/v1/dropoff-points` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| POST | `/api/v1/dropoff-points` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| PATCH | `/api/v1/dropoff-points/:id` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| POST | `/api/v1/return-locations/resolve` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| GET | `/api/v1/students/:id/location-defaults` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| PUT | `/api/v1/students/:id/location-defaults/pickup` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| PUT | `/api/v1/students/:id/location-defaults/dropoff` | [location.controller.ts](../backend/src/registry/http/location.controller.ts) |
| GET | `/api/v1/universities` | [registry.controller.ts](../backend/src/registry/http/registry.controller.ts) |
| GET | `/api/v1/students` | [registry.controller.ts](../backend/src/registry/http/registry.controller.ts) |
| GET | `/api/v1/students/:id` | [registry.controller.ts](../backend/src/registry/http/registry.controller.ts) |
| POST | `/api/v1/students` | [registry.controller.ts](../backend/src/registry/http/registry.controller.ts) |
| PATCH | `/api/v1/students/:id` | [registry.controller.ts](../backend/src/registry/http/registry.controller.ts) |
| GET | `/api/v1/students/:id/contracts` | [registry.controller.ts](../backend/src/registry/http/registry.controller.ts) |
| POST | `/api/v1/students/:id/contracts` | [registry.controller.ts](../backend/src/registry/http/registry.controller.ts) |
| PATCH | `/api/v1/contracts/:id` | [registry.controller.ts](../backend/src/registry/http/registry.controller.ts) |

## 4. Tabelas declaradas nas migrações

Declarações CREATE TABLE, sem auditoria do esquema instalado. Migrações posteriores alteram colunas e regras: considerar pontos fixos, endereços, dias e etapas no estado mais recente.

| Tabela | Migração de criação |
| --- | --- |
| `app.team_users` | [1792700000000-team-access.ts](../backend/src/infrastructure/database/migrations/1792700000000-team-access.ts) |
| `app.universities` | [1792800000000-student-registry.ts](../backend/src/infrastructure/database/migrations/1792800000000-student-registry.ts) |
| `app.students` | [1792800000000-student-registry.ts](../backend/src/infrastructure/database/migrations/1792800000000-student-registry.ts) |
| `app.contracts` | [1792800000000-student-registry.ts](../backend/src/infrastructure/database/migrations/1792800000000-student-registry.ts) |
| `app.university_calendars` | [1792900000000-university-calendar.ts](../backend/src/infrastructure/database/migrations/1792900000000-university-calendar.ts) |
| `app.calendar_exceptions` | [1792900000000-university-calendar.ts](../backend/src/infrastructure/database/migrations/1792900000000-university-calendar.ts) |
| `app.local_groups` | [1793000000000-local-places.ts](../backend/src/infrastructure/database/migrations/1793000000000-local-places.ts) |
| `app.service_regions` | [1793000000000-local-places.ts](../backend/src/infrastructure/database/migrations/1793000000000-local-places.ts) |
| `app.boarding_points` | [1793000000000-local-places.ts](../backend/src/infrastructure/database/migrations/1793000000000-local-places.ts) |
| `app.return_locations` | [1793000000000-local-places.ts](../backend/src/infrastructure/database/migrations/1793000000000-local-places.ts) |
| `app.student_place_defaults` | [1793000000000-local-places.ts](../backend/src/infrastructure/database/migrations/1793000000000-local-places.ts) |
| `app.daily_journeys` | [1793100000000-daily-journey.ts](../backend/src/infrastructure/database/migrations/1793100000000-daily-journey.ts) |
| `app.journey_receipts` | [1793100000000-daily-journey.ts](../backend/src/infrastructure/database/migrations/1793100000000-daily-journey.ts) |
| `app.place_pattern_decisions` | [1793300000000-place-patterns.ts](../backend/src/infrastructure/database/migrations/1793300000000-place-patterns.ts) |
| `app.fleet_vehicles` | [1793400000000-fleet.ts](../backend/src/infrastructure/database/migrations/1793400000000-fleet.ts) |
| `app.fleet_drivers` | [1793400000000-fleet.ts](../backend/src/infrastructure/database/migrations/1793400000000-fleet.ts) |
| `app.fleet_exceptions` | [1793400000000-fleet.ts](../backend/src/infrastructure/database/migrations/1793400000000-fleet.ts) |
| `app.operation_plans` | [1793500000000-operation-planning.ts](../backend/src/infrastructure/database/migrations/1793500000000-operation-planning.ts) |
| `app.operation_occupancies` | [1793500000000-operation-planning.ts](../backend/src/infrastructure/database/migrations/1793500000000-operation-planning.ts) |
| `app.team_corrections` | [1793600000000-team-corrections.ts](../backend/src/infrastructure/database/migrations/1793600000000-team-corrections.ts) |
| `app.outgoing_messages` | [1793700000000-messages.ts](../backend/src/infrastructure/database/migrations/1793700000000-messages.ts) |
| `app.message_attempts` | [1793700000000-messages.ts](../backend/src/infrastructure/database/migrations/1793700000000-messages.ts) |
| `app.driver_access_links` | [1793800000000-operational-queries.ts](../backend/src/infrastructure/database/migrations/1793800000000-operational-queries.ts) |
| `app.operation_manifests` | [1793800000000-operational-queries.ts](../backend/src/infrastructure/database/migrations/1793800000000-operational-queries.ts) |
| `app.group_stop_orders` | [1793900000000-itineraries.ts](../backend/src/infrastructure/database/migrations/1793900000000-itineraries.ts) |
| `app.published_itineraries` | [1793900000000-itineraries.ts](../backend/src/infrastructure/database/migrations/1793900000000-itineraries.ts) |
| `app.auth_credentials` | [1794000000000-own-auth.ts](../backend/src/infrastructure/database/migrations/1794000000000-own-auth.ts) |
| `app.auth_sessions` | [1794000000000-own-auth.ts](../backend/src/infrastructure/database/migrations/1794000000000-own-auth.ts) |
| `app.auth_events` | [1794000000000-own-auth.ts](../backend/src/infrastructure/database/migrations/1794000000000-own-auth.ts) |
| `app.auth_attempt_windows` | [1794000000000-own-auth.ts](../backend/src/infrastructure/database/migrations/1794000000000-own-auth.ts) |
| `app.whatsapp_events` | [1794100000000-whatsapp-channel.ts](../backend/src/infrastructure/database/migrations/1794100000000-whatsapp-channel.ts) |
| `app.whatsapp_attempts` | [1794100000000-whatsapp-channel.ts](../backend/src/infrastructure/database/migrations/1794100000000-whatsapp-channel.ts) |
| `app.message_interpretations` | [1794200000000-message-interpretation.ts](../backend/src/infrastructure/database/migrations/1794200000000-message-interpretation.ts) |
| `app.journey_acknowledgements` | [1794400000000-conversation-processing.ts](../backend/src/infrastructure/database/migrations/1794400000000-conversation-processing.ts) |
| `app.conversation_jobs` | [1794400000000-conversation-processing.ts](../backend/src/infrastructure/database/migrations/1794400000000-conversation-processing.ts) |
| `app.conversation_clarifications` | [1794700000000-conversation-context.ts](../backend/src/infrastructure/database/migrations/1794700000000-conversation-context.ts) |

## 5. Migrações versionadas

Aplicações dev/test estão documentadas nas verificações. Este levantamento não executou migration:show/run.

- [1792700000000-team-access.ts](../backend/src/infrastructure/database/migrations/1792700000000-team-access.ts)
- [1792800000000-student-registry.ts](../backend/src/infrastructure/database/migrations/1792800000000-student-registry.ts)
- [1792900000000-university-calendar.ts](../backend/src/infrastructure/database/migrations/1792900000000-university-calendar.ts)
- [1793000000000-local-places.ts](../backend/src/infrastructure/database/migrations/1793000000000-local-places.ts)
- [1793100000000-daily-journey.ts](../backend/src/infrastructure/database/migrations/1793100000000-daily-journey.ts)
- [1793200000000-journey-closing.ts](../backend/src/infrastructure/database/migrations/1793200000000-journey-closing.ts)
- [1793300000000-place-patterns.ts](../backend/src/infrastructure/database/migrations/1793300000000-place-patterns.ts)
- [1793400000000-fleet.ts](../backend/src/infrastructure/database/migrations/1793400000000-fleet.ts)
- [1793500000000-operation-planning.ts](../backend/src/infrastructure/database/migrations/1793500000000-operation-planning.ts)
- [1793600000000-team-corrections.ts](../backend/src/infrastructure/database/migrations/1793600000000-team-corrections.ts)
- [1793700000000-messages.ts](../backend/src/infrastructure/database/migrations/1793700000000-messages.ts)
- [1793800000000-operational-queries.ts](../backend/src/infrastructure/database/migrations/1793800000000-operational-queries.ts)
- [1793900000000-itineraries.ts](../backend/src/infrastructure/database/migrations/1793900000000-itineraries.ts)
- [1794000000000-own-auth.ts](../backend/src/infrastructure/database/migrations/1794000000000-own-auth.ts)
- [1794100000000-whatsapp-channel.ts](../backend/src/infrastructure/database/migrations/1794100000000-whatsapp-channel.ts)
- [1794200000000-message-interpretation.ts](../backend/src/infrastructure/database/migrations/1794200000000-message-interpretation.ts)
- [1794300000000-original-order.ts](../backend/src/infrastructure/database/migrations/1794300000000-original-order.ts)
- [1794400000000-conversation-processing.ts](../backend/src/infrastructure/database/migrations/1794400000000-conversation-processing.ts)
- [1794500000000-acknowledgement-dispatch.ts](../backend/src/infrastructure/database/migrations/1794500000000-acknowledgement-dispatch.ts)
- [1794600000000-fixed-dropoff.ts](../backend/src/infrastructure/database/migrations/1794600000000-fixed-dropoff.ts)
- [1794700000000-conversation-context.ts](../backend/src/infrastructure/database/migrations/1794700000000-conversation-context.ts)
- [1794800000000-daily-operation.ts](../backend/src/infrastructure/database/migrations/1794800000000-daily-operation.ts)
- [1794800000001-stage-occupancies.ts](../backend/src/infrastructure/database/migrations/1794800000001-stage-occupancies.ts)
- [1794900000000-point-addresses.ts](../backend/src/infrastructure/database/migrations/1794900000000-point-addresses.ts)

## 6. Código por responsabilidade

| Área | Arquivos |
| --- | --- |
| access | [access.module.ts](../backend/src/access/access.module.ts) · [application/access.service.ts](../backend/src/access/application/access.service.ts) · [application/auth.ports.ts](../backend/src/access/application/auth.ports.ts) · [application/auth.service.ts](../backend/src/access/application/auth.service.ts) · [application/ports.ts](../backend/src/access/application/ports.ts) · [cli/auth-bootstrap.ts](../backend/src/access/cli/auth-bootstrap.ts) · [cli/auth-cli.ts](../backend/src/access/cli/auth-cli.ts) · [cli/auth-recover-admin.ts](../backend/src/access/cli/auth-recover-admin.ts) · [domain/access.ts](../backend/src/access/domain/access.ts) · [domain/auth.ts](../backend/src/access/domain/auth.ts) · [http/access-policy.ts](../backend/src/access/http/access-policy.ts) · [http/access.controller.ts](../backend/src/access/http/access.controller.ts) · [http/access.filter.ts](../backend/src/access/http/access.filter.ts) · [http/access.guard.ts](../backend/src/access/http/access.guard.ts) · [http/auth.controller.ts](../backend/src/access/http/auth.controller.ts) · [infrastructure/password-hasher.ts](../backend/src/access/infrastructure/password-hasher.ts) · [infrastructure/postgres-auth-store.ts](../backend/src/access/infrastructure/postgres-auth-store.ts) · [infrastructure/postgres-team-store.ts](../backend/src/access/infrastructure/postgres-team-store.ts) · [infrastructure/session-verifier.ts](../backend/src/access/infrastructure/session-verifier.ts) |
| registry | [application/calendar.service.ts](../backend/src/registry/application/calendar.service.ts) · [application/eligibility.service.ts](../backend/src/registry/application/eligibility.service.ts) · [application/enrollment-gate.ts](../backend/src/registry/application/enrollment-gate.ts) · [application/location-ports.ts](../backend/src/registry/application/location-ports.ts) · [application/location.service.ts](../backend/src/registry/application/location.service.ts) · [application/ports.ts](../backend/src/registry/application/ports.ts) · [application/registry.service.ts](../backend/src/registry/application/registry.service.ts) · [application/return-item.ts](../backend/src/registry/application/return-item.ts) · [domain/calendar.ts](../backend/src/registry/domain/calendar.ts) · [domain/locations.ts](../backend/src/registry/domain/locations.ts) · [domain/point-address.ts](../backend/src/registry/domain/point-address.ts) · [domain/registry.ts](../backend/src/registry/domain/registry.ts) · [http/calendar.controller.ts](../backend/src/registry/http/calendar.controller.ts) · [http/location.controller.ts](../backend/src/registry/http/location.controller.ts) · [http/registry.controller.ts](../backend/src/registry/http/registry.controller.ts) · [infrastructure/location-queries.ts](../backend/src/registry/infrastructure/location-queries.ts) · [infrastructure/postgres-registry-store.ts](../backend/src/registry/infrastructure/postgres-registry-store.ts) · [registry.module.ts](../backend/src/registry/registry.module.ts) |
| journey | [application/correction-ports.ts](../backend/src/journey/application/correction-ports.ts) · [application/correction.service.ts](../backend/src/journey/application/correction.service.ts) · [application/journey.service.ts](../backend/src/journey/application/journey.service.ts) · [application/pattern-ports.ts](../backend/src/journey/application/pattern-ports.ts) · [application/pattern.service.ts](../backend/src/journey/application/pattern.service.ts) · [application/ports.ts](../backend/src/journey/application/ports.ts) · [domain/closing.ts](../backend/src/journey/domain/closing.ts) · [domain/correction.ts](../backend/src/journey/domain/correction.ts) · [domain/journey.ts](../backend/src/journey/domain/journey.ts) · [domain/patterns.ts](../backend/src/journey/domain/patterns.ts) · [http/correction.controller.ts](../backend/src/journey/http/correction.controller.ts) · [http/journey.controller.ts](../backend/src/journey/http/journey.controller.ts) · [http/pattern.controller.ts](../backend/src/journey/http/pattern.controller.ts) · [infrastructure/correction-queries.ts](../backend/src/journey/infrastructure/correction-queries.ts) · [infrastructure/journey-queries.ts](../backend/src/journey/infrastructure/journey-queries.ts) · [infrastructure/pattern-queries.ts](../backend/src/journey/infrastructure/pattern-queries.ts) |
| fleet | [application/fleet.service.ts](../backend/src/fleet/application/fleet.service.ts) · [application/ports.ts](../backend/src/fleet/application/ports.ts) · [domain/fleet.ts](../backend/src/fleet/domain/fleet.ts) · [http/fleet.controller.ts](../backend/src/fleet/http/fleet.controller.ts) · [infrastructure/fleet-queries.ts](../backend/src/fleet/infrastructure/fleet-queries.ts) |
| operation | [application/consultation-ports.ts](../backend/src/operation/application/consultation-ports.ts) · [application/consultation-rows.ts](../backend/src/operation/application/consultation-rows.ts) · [application/consultation.service.ts](../backend/src/operation/application/consultation.service.ts) · [application/operation.service.ts](../backend/src/operation/application/operation.service.ts) · [application/ports.ts](../backend/src/operation/application/ports.ts) · [domain/consultation.ts](../backend/src/operation/domain/consultation.ts) · [domain/operation.ts](../backend/src/operation/domain/operation.ts) · [http/consultation.controller.ts](../backend/src/operation/http/consultation.controller.ts) · [http/operation.controller.ts](../backend/src/operation/http/operation.controller.ts) · [infrastructure/consultation-queries.ts](../backend/src/operation/infrastructure/consultation-queries.ts) · [infrastructure/operation-queries.ts](../backend/src/operation/infrastructure/operation-queries.ts) |
| itinerary | [application/itinerary.service.ts](../backend/src/itinerary/application/itinerary.service.ts) · [application/ports.ts](../backend/src/itinerary/application/ports.ts) · [application/routing.ts](../backend/src/itinerary/application/routing.ts) · [domain/itinerary.ts](../backend/src/itinerary/domain/itinerary.ts) · [http/itinerary.controller.ts](../backend/src/itinerary/http/itinerary.controller.ts) · [infrastructure/itinerary-queries.ts](../backend/src/itinerary/infrastructure/itinerary-queries.ts) |
| messaging | [application/message.service.ts](../backend/src/messaging/application/message.service.ts) · [application/operational-scheduler.ts](../backend/src/messaging/application/operational-scheduler.ts) · [application/ports.ts](../backend/src/messaging/application/ports.ts) · [domain/messages.ts](../backend/src/messaging/domain/messages.ts) · [http/message.controller.ts](../backend/src/messaging/http/message.controller.ts) · [infrastructure/message-queries.ts](../backend/src/messaging/infrastructure/message-queries.ts) |
| whatsapp | [acknowledgement-dispatcher.ts](../backend/src/whatsapp/acknowledgement-dispatcher.ts) · [clarification-dispatcher.ts](../backend/src/whatsapp/clarification-dispatcher.ts) · [config.ts](../backend/src/whatsapp/config.ts) · [controller.ts](../backend/src/whatsapp/controller.ts) · [domain.ts](../backend/src/whatsapp/domain.ts) · [provider-order.ts](../backend/src/whatsapp/provider-order.ts) · [sender.ts](../backend/src/whatsapp/sender.ts) · [service.ts](../backend/src/whatsapp/service.ts) · [store.ts](../backend/src/whatsapp/store.ts) · [whatsapp.module.ts](../backend/src/whatsapp/whatsapp.module.ts) |
| interpretation | [acknowledgement-store.ts](../backend/src/interpretation/acknowledgement-store.ts) · [acknowledgement.ts](../backend/src/interpretation/acknowledgement.ts) · [application.ts](../backend/src/interpretation/application.ts) · [command.ts](../backend/src/interpretation/command.ts) · [context-store.ts](../backend/src/interpretation/context-store.ts) · [context.ts](../backend/src/interpretation/context.ts) · [controller.ts](../backend/src/interpretation/controller.ts) · [domain.ts](../backend/src/interpretation/domain.ts) · [gemini.ts](../backend/src/interpretation/gemini.ts) · [places.ts](../backend/src/interpretation/places.ts) · [processor.ts](../backend/src/interpretation/processor.ts) · [service.ts](../backend/src/interpretation/service.ts) |
| maps | [google-maps.ts](../backend/src/maps/google-maps.ts) · [maps.controller.ts](../backend/src/maps/maps.controller.ts) · [maps.service.ts](../backend/src/maps/maps.service.ts) |
| health | [application/check-readiness.ts](../backend/src/health/application/check-readiness.ts) · [application/ports/database-probe.ts](../backend/src/health/application/ports/database-probe.ts) · [health.module.ts](../backend/src/health/health.module.ts) · [http/health.controller.ts](../backend/src/health/http/health.controller.ts) |

## 7. Páginas do frontend

O menu efetivo é definido por App.tsx. Planejamento está integrado ao itinerário, mesmo existindo arquivo próprio.

- [calendar.tsx](../frontend/src/pages/calendar.tsx)
- [catalogs.tsx](../frontend/src/pages/catalogs.tsx)
- [driver.tsx](../frontend/src/pages/driver.tsx)
- [itineraries.tsx](../frontend/src/pages/itineraries.tsx)
- [maps.tsx](../frontend/src/pages/maps.tsx)
- [messages.tsx](../frontend/src/pages/messages.tsx)
- [operation.tsx](../frontend/src/pages/operation.tsx)
- [planning.tsx](../frontend/src/pages/planning.tsx)
- [students.tsx](../frontend/src/pages/students.tsx)
- [users.tsx](../frontend/src/pages/users.tsx)

## 8. Comandos de verificação

| Camada | Comandos nos manifestos | Alcance |
| --- | --- | --- |
| Backend | `npm test`, `npm run test:integration`, `npm run test:e2e` | Unitários, PostgreSQL test e HTTP. HTTP não implica WhatsApp real. |
| Qualidade backend | `npm run lint`, `npm run build`; TypeScript `--noEmit` nos registros | Análise estática e compilação. |
| Frontend | `npm run typecheck`, `npm run build`, `npm test` | Tipos/build e Playwright, com APIs substitutas nos cenários documentados. |
| Ensaio conectado | `node scripts/real-smoke.cjs` em frontend | Banco test e backend compilado; sem WhatsApp. |
| Gemini | `npm run gemini:smoke` no backend | Casos sintéticos; modo real exige opt-in conforme roteiro. |

Comandos são referência, não foram executados nesta consolidação. Não rodar suítes que alteram o mesmo banco test simultaneamente. Manter segredos privados.
