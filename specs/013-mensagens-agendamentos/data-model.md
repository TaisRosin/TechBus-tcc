# Dados B14
- daily_journeys.student_initiated boolean not null default false; preservado por correções, true após comando de jornada aplicado com elegibilidade válida. student_initiated_at timestamptz nullable guarda o primeiro recebimento válido e limita extras aos próximos slots. Nenhum backfill que invente intenção.
- outgoing_messages: id UUID PK, student_id FK, date, slot em 5/11/13/16/17, status ready/sending/sent/failed/unknown/skipped, version>0, phone/text e code nullable. UNIQUE(student_id,date,slot); índice date/id para leitura atual. Slot17 é aviso de fechamento.
- message_attempts: id UUID PK, message_id FK, number>0, phone/text capturados, status sending/sent/failed/unknown, code nullable, started_at/finished_at; UNIQUE(message_id,number). Sem payload externo arbitrário, credenciais ou limpeza automática.
- App SELECT/INSERT/UPDATE, sem DELETE/DDL. Reversão recusa mensagens ou marcadores de solicitação existentes. Referências preservadas, sem histórico público novo.
