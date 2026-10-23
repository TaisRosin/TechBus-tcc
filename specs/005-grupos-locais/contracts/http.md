# Contrato B06
Todas as rotas /api/v1, Bearer B03, admin/operador. Campos extras rejeitados. Listas limit/offset iguais B04 (50 padrão, máximo 100).

| Rotas | Entrada |
|---|---|
| GET/POST /groups; PATCH /groups/:id | criar {name,direction}; editar {name,active,expectedVersion} |
| GET/POST /regions; PATCH /regions/:id | criar {name,groupId}; editar {name,groupId,active,expectedVersion} |
| GET/POST /boarding-points; PATCH /boarding-points/:id | criar {name,address,groupId}; editar {name,address,groupId,active,expectedVersion} |
| POST /return-locations/resolve | {address}; retorna local persistido validado e grupo atual, sem padrão/jornada |
| GET /students/:id/location-defaults | {pickup,dropoff,needsAdjustment}; cada lado {value:null ou registro,usable,issue:null ou código} |
| PUT /students/:id/location-defaults/pickup | {pointId,source,evidence,expectedVersion} |
| PUT /students/:id/location-defaults/dropoff | {address,source,evidence,expectedVersion} |

direction pickup/dropoff. source initial/request/consent, evidence referência do cadastro inicial/pedido/consentimento declarada pela equipe; initial vedado quando já existe padrão. expectedVersion=0 somente primeiro padrão. Cadastros começam ativos/version=1. Padrões armazenam IDs, source/evidence/version; PUT retorna registro atualizado. Estado usable recalculado, sem alterar cadastro salvo.
Erros {code}: 400 INVALID_INPUT, 401/403 B03, 404 NOT_FOUND, 409 VERSION_CONFLICT/GROUP_DIRECTION_MISMATCH/LOCATION_INACTIVE/CONSENT_REQUIRED/GROUP_UNRESOLVED, 422 OUTSIDE_SERVICE_AREA, 503 ADDRESS_VALIDATION_UNAVAILABLE ou REGISTRY_UNAVAILABLE. Padrão ausente issue=NOT_CONFIGURED. Retorno fora/indeterminado não sobrescreve padrão. Runtime não aceita flags de validação enviadas no corpo.
Portas internas: validatePickup(pointId) e resolveReturn(actor,address) verificam cadeia ativa; futura jornada revalida condições na própria transação e aplica horários, sem expor um endpoint de aluno nesta etapa.
