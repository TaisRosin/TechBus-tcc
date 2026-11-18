# Ensaio controlado WhatsApp e painel

Preparado em 09/11/2026. Ensaio iniciado; cadeia completa ainda pendente. Complementa [ativação](quickstart.md) e a tarefa T019 de [interpretação](../019-interpretacao-mensagens/tasks.md); não altera os critérios já verificados com transporte simulado.

## Execução parcial — 09/11/2026

Taís autorizou explicitamente o envio automático para os quatro alunos já cadastrados. Conferência encontrou exatamente os quatro telefones na allowlist, todos ativos e com vigência válida após a atualização de Marco. Instância `techbus-test` respondeu HTTP200 com estado `open`.

Backend operacional iniciado na porta3000 com agendador, processamento e envio habilitados somente no processo; arquivo privado de ambiente e launcher seguro do painel preservados. Consulta ao ledger do dia encontrou quatro mensagens do slot05 com estado `sent` e sem código de erro. Isso comprova aceite do provedor, ainda não recebimento nos aparelhos nem resposta aplicada. Casos de esclarecimento, fechamento e cancelamento seguem pendentes. Manter máquina e processos ligados durante este ensaio local; hospedagem continua pendente.

## Preparação

1. Confirmar com Taís o contato destinatário de teste e autorização para consultas, esclarecimentos e recibos automáticos somente para esse contato. Não publicar telefone, tokens ou credenciais nas evidências.
2. Verificar serviços e conexão da instância existente `techbus-test`, sem recriar sessão. Conferir migrações e cadastro fictício no banco dev: telefone correspondente, ativo, vigência atual, universidade operando, dia habitual e pontos fixos ativos. Corrigir dados de teste explicitamente, preservando os demais cadastros.
3. Usar um único backend operacional para o painel e o webhook. O launcher comum do painel desativa integrações e agendador; não serve para provar envio real. Restringir allowlist ao destinatário autorizado antes de ativar envio, processamento e agendador no processo do ensaio.
4. Conferir o horário real de São Paulo. Confirmações e mudanças de pontos precisam chegar antes de 17h. Não alterar relógio ou recebimento para contornar prazo. Se a janela acabou, realizar essa parte em outro dia operacional.

## Casos e evidências

| Passo | Ação | Resultado esperado |
| --- | --- | --- |
| 1 | Iniciar agendador com aluno elegível sem resposta, entre 05h e 17h | Somente consulta/lembrete mais recente pertinente; uma tentativa persistida. |
| 2 | Enviar “vou” pelo contato de teste | Evento recebido, interpretação aplicada, ida e volta no painel conforme regras e recibo com pontos realmente registrados. |
| 3 | Pedir alteração para outro ponto cadastrado antes de 17h | Viagem e ponto atualizados integralmente; padrão do cadastro preservado. |
| 4 | Enviar pedido ambíguo | Uma pergunta objetiva; nenhuma confirmação inventada. |
| 5 | Usar Responder do WhatsApp na pergunta e responder claramente | Resposta vinculada à pergunta correta e resultado refletido no painel. |
| 6 | Em outra cadeia ambígua, responder à pergunta ainda sem clareza | Pendência para a equipe; nenhuma segunda pergunta automática nessa cadeia. |
| 7 | Revisar pendência pelo painel com justificativa | Correção registrada; nenhuma mensagem automática pela correção manual. |
| 8 | Acompanhar fechamento após 17h com cenário elegível de ida confirmada e volta indecisa | Volta padrão e aviso conforme regra; aluno sem resposta continua fora da demanda. |
| 9 | Cancelar volta confirmada entre 17h e 22h | Cancelamento refletido no painel e recibo; reinício não restaura confirmação. |

Casos independentes exigem preparar o estado correspondente; não apagar eventos ou desfazer reservas para reutilizar uma cadeia. Horários completos e duplicação já têm cobertura automatizada; a prova real registra apenas os horários efetivamente observados.

## Registro e encerramento

Para cada caso, registrar horário, identificadores internos, estado do processamento, tentativa e resultado no painel. Aceite do provedor não comprova entrega: registrar também a observação no aparelho, sem copiar conteúdo pessoal. Em falha incerta, preservar evidência e não reenviar cegamente.

Encerrar o processo operacional ao terminar e conferir que não ficou outro executor ativo. Preservar sessão, dados e credenciais. Atualizar verification.md e T019 somente com os resultados observados; listar casos restantes. Depois corrigir falhas reproduzidas e preparar hospedagem de frontend, backend, PostgreSQL e Evolution.
