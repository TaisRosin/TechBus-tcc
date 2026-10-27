# Contratos — B10
GET /api/v1/students/:id/location-suggestions: Bearer B03, admin/operador, sem query de data/histórico. Retorna pickup/dropoff com count, suspended, issue e suggestion nullable. Sugestão contém key, direction, placeId, expectedVersion; nenhum envio real. Sem padrão/mesmo padrão/recusa na sequência/menos de quatro/local inválido/aluno inativo não oferecer aceite.

PatternService.current(actor,studentId): mesma leitura autorizada.
PatternService.apply(studentId,receiptId,input): interno, identidade previamente resolvida pelo adaptador confiável; recibo criado por JourneyService.receive/receiveUnordered antes de interpretação.
- request_default: {kind,direction,placeId,expectedVersion}.
- decide_suggestion: {kind,direction,suggestionKey,decision:accept|refuse,expectedVersion}.
Campos extras rejeitados; UUIDs e inteiros não negativos validados. Receipt determina instante estrito anterior às 17h; incerto gera ORDER_UNCERTAIN; resultado durável não muda por reentrega. Decisão antiga por trecho rejeitada STALE_COMMAND. Aluno inativo rejeitado STUDENT_INACTIVE. Versão de padrão diferente: VERSION_CONFLICT. Proposta inexistente/suspensa/superada: SUGGESTION_STALE. Local inválido: LOCATION_INVALID. Recusa não muda padrão; aceite/request registram evidência e incrementam versão, sem alterar jornada.

Receber uma decisão não confirma uso nem exige dia habitual, operação ou vigência para cadastro do padrão; valida aluno ativo e local, sem criar viagem. Prazos existentes preservados. Revalidação de proposta considera estado atual, inclusive interpretações posteriores e cancelamentos. Revisão administrativa B06 continua independente, e seu expectedVersion invalida aceites antigos.
