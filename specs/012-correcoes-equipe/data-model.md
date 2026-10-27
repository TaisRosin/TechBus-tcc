# Dados B13
- daily_journeys: ampliar origens pickup/dropoff para equipe, sem alterar estados existentes. Origem equipe só em confirmado/recusado; sem_resposta mantém none. Ao adotar explicitamente universidade atual, atualizar university_id da jornada.
- team_corrections: student_id e operation_id PK composta e FK para journey_receipts(student_id,id); date, actor_id FK team_users, request_hash SHA256, reason não vazio até 1000, created_at timestamptz, result JSONB objeto. Índices por ator e aluno/data. Aplicação SELECT/INSERT, sem UPDATE/DELETE; reversão recusa registros/origens equipe.
- Recibo interno usa operation_id e próxima sequência, finalizado aplicado com versão resultante. Pendências revisadas ficam finalizadas rejected/RESOLVED_BY_TEAM, sem apagar informação. Não expor lista de correções históricas.
- Resultado contém jornada final, operationId, instante e versão; retorno idempotente preserva resultado original, não refaz alteração quando jornada mudou depois.
