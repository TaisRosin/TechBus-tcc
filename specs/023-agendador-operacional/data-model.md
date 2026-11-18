# Dados reutilizados

Sem migração. `outgoing_messages` único por aluno/data/slot; estados ready/sending/sent/failed/unknown/skipped. `message_attempts` registra reserva e resultado; `whatsapp_attempts` registra aceite do provedor. `daily_journeys` preserva versão, sequência, origem da volta padrão e cancelamento. Não gravar um marcador de faixa concluída que impeça recuperar preparação parcial após reinício.
