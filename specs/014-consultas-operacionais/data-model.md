# Dados B15
- driver_access_links: user_id UUID PK/FK team_users; driver_id UUID nullable UNIQUE/FK fleet_drivers; version integer >0. Null revoga vínculo sem apagar registro. Usuário precisa de perfil motorista ativo; cadastro motorista ativo. Criação expectedVersion=0, atualizações versão positiva.
- operation_manifests: date date, version integer >0, members jsonb array; PK(date,version), FK date para operation_plans. Membros: studentId, universityId, pickupGroupId/dropoffGroupId nullable, pickup/dropoff boolean. Fotografia somente na confirmação B12; ausente implica revisão antes de publicar passageiros.
- Sem duplicar jornada, mensagem ou alocação. App SELECT/INSERT/UPDATE em vínculos; SELECT/INSERT em manifestos; sem DELETE. Down bloqueado com dados, sem limpeza automática.
