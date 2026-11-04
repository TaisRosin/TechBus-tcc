# Dados B18.2

Migração aditiva 1794100000000 no schema app, aplicação sem DDL/DELETE. Relacionamentos/identidades existentes preservados. Reversão bloqueada se qualquer tabela nova contém registros.

- whatsapp_events: id uuid PK; instance text obrigatório; kind text obrigatório enum message/status/connection; external_id text obrigatório (1–200); fingerprint text obrigatório; received_at timestamptz obrigatório; phone text opcional; text_body text opcional limitado a 4096; provider_status text opcional; student_id uuid FK opcional; receipt_id uuid opcional; disposition text obrigatório; conflict boolean default false. UNIQUE(instance,kind,external_id). Nada de payload bruto/chave API.
- whatsapp_attempts: attempt_id uuid PK, FK app.message_attempts(id) confirmada no esquema B14; message_id uuid obrigatório FK app.outgoing_messages(id); instance text obrigatório; phone text obrigatório; state text enum dispatching/sent/unknown/failed; provider_id text opcional; created_at timestamptz obrigatório. IDs B14 efetivos vinculados na migração; nunca duplicar tentativa após falha ambígua.

Registro de entrada e recibo B07 na mesma transação/lock de locais. Deduplicação antes de criar sequência; mesma chave com projeção diferente sinaliza conflito e preserva primeira versão. Identidade PN comprovada consulta students.phone, sem autocadastro. Recibo ordering uncertain não altera viagem. Status externos distintos usam ID composto mensagem/status para conservar evidências, inclusive fora de ordem.

Evolution possui cluster e banco próprios; não recebe credencial TechBus. Dados/sessão do fornecedor persistem em .local; não versionar ou apagar automaticamente.
