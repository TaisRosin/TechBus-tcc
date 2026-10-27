# Contratos B15
- GET /api/v1/operations/overview?date=YYYY-MM-DD&limit=50&offset=0: admin/operador. Date omitida=atual; anterior somente na janela Q1. Visão B12 e totais gerais, alunos paginados com respostas/origens/locais/pendências, estados de comunicação por aluno. Sem escrita/reenvio.
- GET/PUT /api/v1/access/driver-links/:id: somente admin; id é usuário existente. PUT {driverId: UUID|null, expectedVersion}; concorrência conflita, revogação preserva versão. Não cria login.
- GET /api/v1/driver/trips: motorista ativo/vinculado; retorna próprios trechos confirmados na janela, sem passageiros alheios ou rascunhos.
- GET /api/v1/driver/trips/:id: mesmo controle, identificador opaco composto pela data/versão/índices. Retorna dados do veículo/trecho, alunos com nome/telefone/local do sentido e alerta de revisão; ausente/alheio/expirado=404. Não expõe falhas de mensagem nem detalhes de pendências de outros alunos.
- Sem edição de motorista, mapas, ordenação de trajeto, fornecedor ou parâmetros de personificação.
