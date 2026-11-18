# Verificação — itinerário diário

Data: 11/11/2026. Decisões e tarefas em [plano](plan.md).

## Entrega

- Itinerários reúne três abas: Ida, Volta e Intermunicipal. Painéis por grupo, filtro, demanda, escolha de veículo e motorista, prévia de paradas e edição expansível da ordem. Intermunicipal mostra os dois sentidos, sugestão de menor veículo suficiente e permite escolha manual maior.
- Planejamento integrado: salvar rascunho das três abas e confirmar operação explicitamente após fechamento e resolução das pendências. Publicação do itinerário continua explícita; rascunho não substitui alocação confirmada.
- Disponibilidade por dia da semana e exceção por data (disponível/indisponível/herdar semana), sem horários no painel. Sem configuração não há disponibilidade presumida.
- Alocação/ocupação por data e etapa; veículo pode ser reutilizado entre coleta, intermunicipal e distribuição. Não atende dois grupos na mesma etapa nem duas universidades no intermunicipal. Motoristas não duplicam atribuições no mesmo trecho/etapa. Revalidação transacional, revisões, capacidade e preservação da confirmação anterior mantidas.
- Consulta administrativa, itinerário e motorista somente da data atual em America/Sao_Paulo, inclusive para registros legados. Nenhuma exclusão automática de dados.

## Evidências

- Regressão backend: 506 testes em 82 suítes; 504 passaram na execução completa. Dois falharam porque o cluster dev estava desligado (permissões e isolamento de migrações); ambas as suítes passaram na reexecução após iniciar o banco. Um teste adicional das restrições de disponibilidade diária passou junto à suíte de migração de frota (8/8). Total: **507 testes distintos aprovados considerando reexecuções**, não uma execução única de 507.
- TDD: disponibilidade diária e alocação sem horários falharam inicialmente com INVALID_INPUT, passaram após implementação; acesso à operação anterior falhou na expectativa nova e passou com corte pela data atual.
- Navegador: **13/13 testes Playwright/Edge** na versão final, incluindo filtro, reuso entre abas, exclusão do veículo já escolhido para outra universidade, payload sem horários, semana/exceção e layout móvel sem overflow. Backend simulado nesses testes; regras/persistência exercitadas separadamente com PostgreSQL isolado. Capturas [computador](../../output/024-itinerario-desktop.png) e [celular](../../output/024-itinerario-mobile.png) inspecionadas visualmente.
- Tipos, lint e build backend aprovados (comando final encerrado com código 0); tipos e build frontend aprovados. git diff --check sem erro. Links novos conferidos.
- Migrações aditivas 1794800000000 e 1794800000001 aplicadas em dev/test. Colunas antigas de disponibilidade/horários preservadas; novas reservas usam data/etapa/trecho e índices únicos parciais. Reversão destrutiva bloqueada. Planos antigos sinalizam revisão.
- Documentação de escopo, requisitos, fluxos, decisões, estado, plano, API, dados, arquitetura, backlog, README e AGENTS atualizada.

## Uso e limites

Reinicie o backend/painel pelo launcher habitual para carregar a nova versão. Em Frota e motoristas → Disponibilidade, cadastre novamente os dias e eventuais exceções: faixas antigas permanecem guardadas, mas não são convertidas em disponibilidade integral. Revise e reconfirme planos sinalizados.

Compatibilidade de payloads antigos de viagens preservada: horários legados podem continuar registrados, mas não determinam disponibilidade ou conflitos. O painel envia apenas veículo, grupo/universidade e motoristas. Horários das mensagens, prazos 17h/22h, critérios de demanda, autorizações e confirmação explícita não mudaram.

Nenhum envio externo, alteração de credenciais ou nova dependência. Este incremento não comprova ensaio WhatsApp completo nem hospedagem. Próxima etapa: revisão visual/funcional de Taís e próxima correção do painel.
