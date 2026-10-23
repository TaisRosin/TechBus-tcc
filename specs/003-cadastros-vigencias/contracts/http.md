# Contrato HTTP B04
Rotas /api/v1, Bearer B03, admin/operador; motorista negado. Sem Auth real nesta etapa.

| Método/rota | Entrada/resultado |
|---|---|
| GET /universities | lista de id/name fixa |
| GET /students?limit=50&offset=0 | lista de alunos; limit 1–100, offset >=0; ordem id |
| GET /students/:id | aluno |
| POST /students | name,phone,universityId,habitualDays,contract:{startDate,endDate} → 201 {student,contract} |
| PATCH /students/:id | name,phone,universityId,habitualDays,active,expectedVersion → aluno |
| GET /students/:id/contracts | vigências ordenadas por startDate/id |
| POST /students/:id/contracts | startDate,endDate → 201 vigência |
| PATCH /contracts/:id | startDate,endDate,expectedVersion → vigência |

Aluno: id,name,phone,universityId,habitualDays,active,version. Vigência: id,studentId,startDate,endDate,version. UUIDs gerados no servidor. Dias inteiros 0–6, vazio válido. PATCH exige todos os campos explicitados. Datas ISO reais e telefone internacional explícito. Campos extras rejeitados.
Erros {code}: 400 INVALID_INPUT; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND; 409 PHONE_IN_USE/CONTRACT_OVERLAP/VERSION_CONFLICT; 503 REGISTRY_UNAVAILABLE (ou erros seguros B03). Sem rota pública de aluno, exclusão, mensagem ou cancelamento.
