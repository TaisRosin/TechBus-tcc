# Agendador operacional

Criado: 06/11/2026. Entrada: continuar o sistema com consultas, lembretes e fechamento automáticos. Implementado e validado localmente; [evidências](verification.md). Regras existentes preservadas.

## User Scenarios & Testing

### US1 — Contato no horário pertinente (P1)
Como aluno elegível, recebo consulta às 05h e lembretes das pendências às 11h, 13h e 16h, America/Sao_Paulo, sem ação manual da equipe.

Aceite independente: antes das 05h não há consulta; às 05h só habitual elegível; nos lembretes só pendências e extras iniciados conforme regra B14. Após parada, recuperar somente o horário mais recente pertinente do dia, antes das 17h. Repetição e concorrência não duplicam efeitos. Falha de um aluno não impede os demais. Envio incerto não é repetido automaticamente.

### US2 — Fechamento automático (P1)
Como equipe, recebo listas fechadas pelas regras existentes a partir das 17h, sem precisar disparar fechamento manual.

Aceite independente: ida confirmada e volta indecisa pode gerar volta padrão, com origem e aviso, desde que elegível. Sem resposta não confirma. Mensagem recebida em tempo e interpretada depois continua conciliada. Repetição não restaura volta cancelada. Depois das 17h não enviar consulta/lembrete atrasado. Aviso de volta padrão é distinto: antes das 22h informa a possibilidade de cancelar; a partir das 22h informa que o prazo terminou, conforme B14 existente.

### US3 — Execução controlada (P1)
Como responsável, ativo a rotina explicitamente e consigo testar sem contatar alunos reais.

Aceite independente: desativado por padrão, inclusive no launcher do painel. Envio exige configuração e lista explícita de contatos permitidos. Desligamento interrompe novos ciclos; falhas registram somente código seguro, sem credenciais. Painel existente continua mostrando mensagens/tentativas do dia.

## Requirements

- FR001: executar periodicamente consultas e fechamento da operação atual, sem identidade administrativa fictícia, no fuso aprovado.
- FR002: reutilizar elegibilidade, pendências, extra e recuperação B14, preservando recebimento durável, cortes17h/22h e idempotência B08/B09.
- FR003: preparação e tentativa persistentes; concorrência/reinício não duplicam envio; resultado incerto/interrompido não tem retry automático.
- FR004: ativação explícita da rotina separada da permissão de envio; manter allowlist e painel local sem integrações.
- FR005: isolar falha por aluno/envio, permitir novo ciclo para falhas internas recuperáveis e parar novos trabalhos ao desligar.
- FR006: provar horários, recuperação, fechamento, cancelamento e concorrência em testes isolados; documentar limites e ativação.

## Success Criteria

- SC001: com serviço disponível e carga local de teste, a rotina começa em até 30 segundos após o horário devido; uma falha de aluno não interrompe a próxima pessoa.
- SC002: duas execuções concorrentes e reinício simulados produzem no máximo uma tentativa de envio por mensagem.
- SC003: nenhum contato externo ocorre com envio desabilitado ou telefone fora da lista permitida; nenhum lembrete vence o prazo.
- SC004: regressão, tipos, lint e build aprovados, com evidências separadas do ensaio real.

## Entidades, dependências e limites

Reutilizar mensagens, tentativas, jornadas e calendários existentes. Serviço e banco precisam permanecer ligados; este incremento não substitui hospedagem. Não recuperar mensagens de dias anteriores nem inventar confirmação para operação que passou offline. Testes com relógio e transporte substitutos; ativação em contatos reais, ensaio de WhatsApp e hospedagem são etapas posteriores. Sem mapas, novas regras, frontend novo ou serviços externos adicionais.
