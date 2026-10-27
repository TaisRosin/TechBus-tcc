# Research — B07

- Decisão: reutilizar versões e transação B04–B06. Motivo: compatibilidade já validada; sem necessidade de pesquisar/atualizar dependências. Alternativa rejeitada: novo ORM/pool/infraestrutura.
- Decisão: serviço interno receive/apply para futura entrada autenticada, leitura HTTP administrativa. Motivo: ainda não existe identificação real WhatsApp/aluno; não criar endpoint de personificação nem correções B13.
- Decisão: comandos sem texto livre, horário, universidade, origem ou flags de área enviados pelo cliente. Motivo: interpretação não é autoridade. Endereço resolvido pela porta B06 antes de selecionar seu identificador; indisponibilidade não torna endereço válido.
- Decisão: recebimento persistido, sequência por aluno sob trava, resultado idempotente e pendência de ordem incerta. Motivo: cumprir constituição já em B07; B09 tratará evidências/ordenação do provedor externo. Não presumir ordem do provedor pelo horário informado.
- Decisão: transação de locais → aluno → calendário, mantendo ordem B06/B05; nenhum serviço externo dentro de trava. Índices de FKs e permissões mínimas seguem skill PostgreSQL.
- Decisões de negócio confirmadas: recusa de volta preservada após “vou”; confirmação sem local conta e indica ajuste obrigatório antes do planejamento operacional.
