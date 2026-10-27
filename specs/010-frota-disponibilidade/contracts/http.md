# Contratos B11
Todas as rotas /api/v1, Bearer B03, admin/operador ativos; motorista sem escrita/leitura geral. Campos extras rejeitados.
- GET/POST /vehicles; PATCH /vehicles/:id: criação {identifier,plate,kind:van|micro|bus,seats}; edição mesmos campos + active,expectedVersion. Cadastro começa active=true,version=1,week=null. Placa remove espaços/hífens e converte para maiúsculas; identificador trim/maiúsculas.
- GET/POST /drivers; PATCH /drivers/:id: {name,phone}, edição +active,expectedVersion. Nenhum campo de perfil/login aceito.
- Listas limit/offset B04 (50 padrão/100 máximo).
- GET /vehicles/:id/availability: {vehicleId,version,week}.
- PUT /vehicles/:id/availability: {week,expectedVersion}; week=null ou sete listas indexadas domingo=0.
- PUT /vehicles/:id/availability/exceptions/:date: {windows,expectedVersion}; lista substitui semana; [] indisponível; null restaura herança.
- GET /vehicles/:id/availability/exceptions?from=YYYY-MM-DD&to=YYYY-MM-DD: intervalo limitado a 366 dias, retorna exceções efetivas, sem histórico de operação.
- POST /fleet/evaluate: {date,trips} conforme [dados](../data-model.md). Retorna {eligible,issues}; issues contêm index e code, sem reservar recurso ou confirmar planejamento. Sobreposição entre propostas do mesmo lote é detectada; B12 revalidará com ocupação persistida.
Faixas {stage,start,end}, minutos a partir da meia-noite da data operacional America/Sao_Paulo; start<2880, end<=2880. Fim exclusivo permite reuso adjacente; data ancora a noite mesmo após meia-noite. O lote de uma data não verifica outras alocações persistidas; isso é B12.
Erros de entrada 400 INVALID_INPUT; versão/duplicação 409 VERSION_CONFLICT/VEHICLE_IDENTIFIER_IN_USE/VEHICLE_PLATE_IN_USE; inexistente 404 NOT_FOUND; acesso 401/403. Avaliação retorna códigos VEHICLE_INACTIVE, AVAILABILITY_NOT_CONFIGURED, VEHICLE_UNAVAILABLE, DRIVER_INACTIVE, GROUP_INVALID, VEHICLE_OVERLAP, DRIVER_OVERLAP. Recursos ausentes na avaliação geram issue *_NOT_FOUND. Dados locais inválidos não são corrigidos silenciosamente.
