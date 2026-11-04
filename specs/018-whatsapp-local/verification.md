# Verificação B18.2 — 28/10/2026

## Primeiro recebimento real de teste — 28/10/2026

Taís enviou de outro número o texto combinado `teste TechBus 01`. Consulta ao banco dev comprovou um evento correspondente persistido em 28/10/2026 às 17:34:26.205 (America/Sao_Paulo), sem conflito e com telefone PN comprovado. Disposição `unknown_contact`: remetente ainda sem cadastro de aluno, portanto nenhum vínculo/recibo de aluno presumido. Não registrar telefone pessoal nesta documentação. `EVOLUTION_SEND_ENABLED=false` confirmado; nenhuma resposta automática enviada. Comprovado o caminho WhatsApp → Evolution → webhook autenticado → PostgreSQL TechBus. Interpretação, confirmação de viagem e envio real continuam sem ensaio.

## Atualização após pareamento — 28/10/2026

Taís leu o QR da instância `techbus-test` e informou a conexão. Consulta real a `/instance/connectionState/techbus-test` confirmou `open`; receptor autenticado do backend respondeu `accepted=true` à sondagem sem comando. Integração habilitada no ambiente privado dev, envios continuam desativados. Serviços mantidos ativos para ensaio supervisionado. Esta atualização substitui a ausência de pareamento descrita no registro inicial abaixo. Recebimento de mensagem escrita e envio real ainda não comprovados.

Implementação local concluída dentro do escopo de transporte; pareamento e ensaio WhatsApp real continuam pendentes. Nenhum envio real, aluno real, Gemini ou agendador foi usado.

## Backend

- 20 testes novos: 8 unitários, 10 com PostgreSQL e 2 HTTP. Testes iniciados antes da implementação nas interfaces críticas; falhas esperadas registradas para módulos ausentes, rotas 404 e cabeçalho Origin ausente; passaram após implementação.
- Projeção elimina envelope/chave API; limites de texto/ID; PN explícito e alternativa PN de LID, sem inferência numérica; mídias não são interpretadas. Segredos separados, URL fixa e envio desativado/allowlist obrigatória.
- Transação única evento/recibo B07; duplicatas concorrentes criam um recibo, conflito mantém primeira chegada/conteúdo. Falha de persistência do evento reverte também o recibo. Contato desconhecido não cria aluno. Recibo sempre `ordering=uncertain`; nenhuma jornada confirmada.
- Webhook exige segredo/instância; erros 401/400, aceite 202 após persistência. Consulta apenas do dia corrente em America/Sao_Paulo, admin/operator; motorista 403, sem filtro histórico. Status correlacionado somente por ID retornado, inclusive quando recebido antes da resposta de envio.
- Ledger B14 antes do HTTP; mesma tentativa não é despachada novamente. Timeout, HTTP de erro e resposta malformada ficam unknown. Sem retry cego. Aceite do fornecedor não é entrega/presença.
- Migração 1794100000000 aplicada em test e dev. FK para B14 e recibos B07; aplicação sem DELETE/DDL; reversão bloqueada com evidências. Demais regras/IDs preservados.
- Regressão completa: primeira execução 386 aprovados e 2 falhas de conexão ao dev parado, em 71 suítes. Após iniciar dev, as duas suítes passaram (3 testes). Cinco cenários adicionais e um cenário de correlação foram acrescentados e verificados no conjunto B18.2 de 20 testes. Total atual: **394 testes distintos**, 71 suítes; verificações de tipos, lint e build também executadas.

## Evolution real, sem pareamento

- Fonte 2.3.7/commit fixado, `npm ci --ignore-scripts` (1120 pacotes), Prisma gerado, tipos e build do fornecedor aprovados. Lockfile do backend inalterado; dependências do fornecedor permanecem isoladas.
- Cluster próprio `evolution_test`, schema `evolution_api`, 57 migrações aplicadas; segunda execução sem migrações pendentes.
- HTTP raiz 200; listagem de instâncias autenticada 200 e **zero instâncias**; mesma rota sem API key retorna 401. Requisições usam Origin fixo compatível com CORS restrito.
- `Get-NetTCPConnection`: API8085 e PostgreSQL55434 exclusivamente em `127.0.0.1`. Primeira carga demorou e a sondagem inicial falhou; verificação posterior confirmou prontidão. Status de processo sozinho não foi aceito como prova.
- Dois patches locais registrados no script: bind loopback e remoção do log bruto de mensagens. Launcher descarta saída potencialmente sensível; segredo, sessão e dados ficam ignorados em `.local`.
- Serviços iniciados para validação são encerrados ao final; dados e credenciais preservados. Backend continua com integração/envio desativados por padrão.

## Limites e próxima etapa

Não há QR lido, conta WhatsApp conectada, envio/recebimento real ou comprovação ponta a ponta. Usar o [roteiro](quickstart.md) com o aparelho e um destinatário de testes autorizado. Interpretação determinística/Gemini será B18.3, incluindo prova suficiente de contexto/ordenação, sem trocar o instante de recebimento. Dependências legadas e Baileys prerelease do fornecedor exigem nova avaliação antes de produção. Retenção continua sem exclusão automática.

Análise final dos artefatos: FR001–004 → projeção/recibo/HTTP; FR005–006 → ledger/saída/status; FR007 → serviço isolado; FR008 → consulta administrativa. T001–T011 cobrem o incremento. `.specify/extensions.yml` ausente: nenhum hook antes/depois registrado.
