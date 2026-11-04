# Dados B18.3

app.message_interpretations: event_id uuid PK/FK whatsapp_events; state text processing/completed; source rules/gemini/none; proposal jsonb opcional; code text; started_at/finished_at timestamptz. Uma tentativa por evento, sem histórico de conversa duplicado, segredo ou resposta bruta. CHECK de estados e conclusão; aplicação SELECT/INSERT/UPDATE, sem DELETE/DDL. Reversão recusa linhas existentes. Índice PK já cobre FK. Recibos/jornadas sem mudança.

Proposta: trip none/going/not_going/only_pickup/only_dropoff/cancel_return/answer; pickup e dropoff null/yes/no/unsure; pickupPlace/dropoffPlace null/texto limitado; savePickup/saveDropoff boolean; ambiguous boolean. Campos obrigatórios, sem extras. answer exige ao menos um lado; demais trip não aceitam lados simultâneos. Preferência exige respectivo local. Mensagem composta guarda conjunto inteiro para revisão; não executa parte.

Continuidade: conversation_jobs e journey_acknowledgements introduzidos na migração1794400000000. Recibo único por evento, com aluno, dia, versão da jornada, telefone e texto persistidos na transação de aplicação. Estados prepared/sending/sent/unknown/superseded. Migração1794500000000 adiciona dispatch_started_at, dispatch_finished_at (timestamptz), provider_id e delivery_code (text, nulos antes da tentativa). Reversão preserva evidências. [Semântica dos estados](automation.md).
