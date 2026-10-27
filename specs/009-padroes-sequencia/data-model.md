# Dados — B10
Jornadas B07/B08 permanecem fonte única de contribuições. Ler data, estado e local por trecho; não retornar histórico na API. Sequência atual ignora dias sem confirmação, encerra em outro local e suspende em local ausente.

Nova app.place_pattern_decisions:
- student_id UUID e receipt_id UUID: chave primária composta e FK para journey_receipts(student_id,id), sem cascata.
- direction: pickup/dropoff; action: accept/refuse/request.
- sequence integer > 0; default_version integer >= 0 (versão esperada antes da decisão).
- suggestion_key varchar(64) nullable; obrigatório para accept/refuse, nulo para request; chave SHA-256 da identidade da sequência.
- point_id/location_id UUID nullable: exatamente um por direction, com FKs a locais existentes.
- índices nos FKs de local; PK cobre aluno/recibo; índice aluno/direction/sequence para última decisão e aluno/suggestion_key para recusa.
Aplicação SELECT/INSERT somente nesta tabela, sem UPDATE/DELETE/DDL. Migração down recusa apagar decisões existentes. Padrão B06 conserva source=request/consent, evidence=receipt UUID e versão incrementada atomicamente; recibo conserva resultado. Decisões não contêm mensagem bruta. Nenhuma política de retenção inventada.
