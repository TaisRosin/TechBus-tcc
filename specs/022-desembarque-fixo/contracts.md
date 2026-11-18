# Contratos de pontos fixos

Autorização administrativa existente (`operations:manage`, admin/operador).

- `GET /api/v1/dropoff-points?limit=100&offset=0`: catálogo paginado, incluindo inativos; apenas pontos cadastrados pela empresa.
- `POST /api/v1/dropoff-points`: `{name,address,groupId}`; grupo ativo de distribuição. Retorna `{id,name,address,groupId,active,version}`.
- `PATCH /api/v1/dropoff-points/:id`: `{name,address,groupId,active,expectedVersion}`. Inativação preserva referências; alteração concorrente retorna VERSION_CONFLICT.
- `PUT /api/v1/students/:id/location-defaults/dropoff`: `{locationId,source,evidence,expectedVersion}`. Ponto/grupo ativos, pedido/consentimento para substituir padrão existente. Não altera jornada já registrada.
- Correção do dia usa `changes.locationId`, mantendo versão, justificativa e revisão explícita existentes.
- Ordem manual usa os IDs do catálogo de desembarque no contrato existente de `stop-order`.
- `POST /api/v1/return-locations/resolve` retorna `422 FIXED_DROPOFF_REQUIRED` para o corpo antigo válido; campos extras são recusados. Não chama geografia.

Compatibilidade: endereços legados permanecem com suas referências e validações históricas; não entram no novo catálogo nem são convertidos automaticamente. Helpers internos de teste/compatibilidade de B06 permanecem, sem exposição de criação de endereço livre na API atual. Nomes recebidos pelo WhatsApp ainda dependem da resolução/contexto pendente; esta entrega não presume mapeamento por semelhança textual.
