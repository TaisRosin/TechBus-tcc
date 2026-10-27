# Contratos B07

## Serviço interno (não HTTP público)
JourneyService.receive(studentId, eventId, ordering = received): identidade e idempotency key fornecidas apenas pelo adaptador confiável futuro, relógio do backend. Persiste receipt antes da interpretação, retorna identificador/sequência/instante/data. ordering uncertain impede aplicação automática. Nenhum adaptador real conectado em B07.
JourneyService.apply(studentId, receiptId, command): relê receipt durável; resultado status applied/rejected/pending, code e version quando aplicável. Repetições retornam resultado original. Comando com campos extras/inválidos é rejeitado.

Comandos:
- {kind: going|only_pickup|only_dropoff|not_going}
- {kind: answer, pickup?: yes|no|unsure, dropoff?: yes|no|unsure}, pelo menos um sentido
- {kind: places, pointId?: UUID, locationId?: UUID}, pelo menos um local; somente identificadores existentes e válidos
- {kind: unclear, persistent: boolean}: apenas sinalização do orquestrador, sem confirmação

Comandos não aceitam horário/estado/origem/flags de validação. Local de retorno deve ter sido resolvido pelo fluxo B06; revalidar vínculos ativos no momento de aplicar. Falha não substitui local anterior.

## HTTP
GET /api/v1/students/:id/journey — admin/operador; apenas dia atual, sem histórico. Retorna jornada ou null, contagem individual 0/1 por trecho, pendências de locais e contexto/cadastro. Motorista e não autenticado negados. Não há POST de comandos nem correções de equipe B13.

Códigos: DEADLINE_PASSED, STALE_COMMAND, ORDER_UNCERTAIN, CONTEXT_CHANGED, CLARIFICATION_REQUIRED, TEAM_REVIEW_REQUIRED, elegibilidade B05 e erros de local B06. Persistência e respostas não expõem dados de credenciais ou detalhes SQL.

Leitura inclui journey, counts (pickup/dropoff em 0/1), issues, pending e needsAdjustment. Query de data é rejeitada: sem histórico. needsAdjustment sinaliza locais/contexto inelegível ou pendência de processamento. Padrão posterior não é copiado silenciosamente em trecho já confirmado. Resultado de repetição é o original mesmo se houver nova interpretação; o adaptador deve emitir novo evento para nova informação explícita.
