# Research — B11
- Decisão: reusar RegistryStore e transações; alternativa de conexão/ORM novo rejeitada por não trazer benefício.
- Decisão: minutos relativos à data operacional e faixas semiabertas. Evita limites sobrepostos e permite retorno após meia-noite; API documenta explicitamente a unidade. Nenhum horário real escolhido.
- Decisão: semana com sete listas, exceção por data substituindo tudo. Mesmo veículo/version protege calendário e cadastro contra edição concorrente.
- Decisão: JSONB validado em domínio e função CHECK do banco para faixas; permite atualização atômica sem DELETE ou tabela duplicada por minuto. Índice/PK por veículo/data para exceções.
- Decisão: avaliar lote de propostas com vehicleId único por ciclo intermunicipal, outbound/return com motoristas independentes; permanência ocupa veículo, não exige motorista designado durante espera. Não reservar nem confirmar alocação nesta etapa.
- Motorista: cadastro mínimo nome/telefone/ativo/versão; nomes não são identidade única. Vínculo com login e visão de atribuições pertencem B15, sem conceder acesso por cadastro.
- Referências de locking e FKs da skill PostgreSQL já consultadas; sem desconhecido técnico que exija provedor externo ou delegação.
