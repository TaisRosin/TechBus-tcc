# Contrato B05
Prefixo /api/v1; Bearer B03; somente admin/operador, executor revalidado na transação.

| Método/caminho | Entrada/saída |
|---|---|
| GET /universities/:id/calendar | {universityId,days:null ou array,version} |
| PATCH /universities/:id/calendar | {days:[0..6],expectedVersion} → calendário |
| GET /universities/:id/calendar/exceptions?from=YYYY-MM-DD&to=YYYY-MM-DD | intervalo obrigatório inclusivo até 366 dias → {calendarVersion,exceptions} |
| PUT /universities/:id/calendar/exceptions/:date | {operates:boolean ou null,reason,expectedVersion} → {calendarVersion,exception} |

Exception: {universityId,date,operates,reason}. null restaura regra semanal, sem apagar linha. Campos extras rejeitados. Conflito 409 VERSION_CONFLICT; 400 INVALID_INPUT; 404 NOT_FOUND; 401/403 B03; 503 REGISTRY_UNAVAILABLE. Sem endpoint público de elegibilidade por telefone.

Interface interna EligibilityService: consultation(phone) usa Clock; request(phone,receivedAt:Date) usa recebimento durável confiável, não informado pelo aluno. Retorna {eligible,reason,date,calendarVersion?}; razões UNKNOWN_STUDENT/INACTIVE_STUDENT/NO_VALID_CONTRACT/CALENDAR_UNCONFIGURED/NO_OPERATION/NOT_HABITUAL/DEADLINE_PASSED/ELIGIBLE. Consulta habitual exige dia habitual; pedido dispensa esse dia, mas exige prazo. Resultado sem dados pessoais e sem gravação de confirmação; consumidores futuros devem revalidar atomicamente.
