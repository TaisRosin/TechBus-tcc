# Verificação B14 — mensagens e agendamentos simulados

Data: 26/10/2026. Implementação autorizada após confirmação conjunta de Q1/Q2. Spec Kit: especificação, checklist 16/16, plano, pesquisa, modelo, contrato e tarefas; constituição preservada, sem hooks adicionais.

## Entrega
- Consulta 05h e lembretes 11h/13h/16h para pendências elegíveis; recuperação somente do último slot pertinente antes das 17h.
- Extras recebem lembretes posteriores ao primeiro recebimento elegível. Jornada manual não presume solicitação do aluno.
- Mensagem única por aluno/data/slot, tentativas duráveis, reserva transacional e adaptador fora da transação.
- Reenvio administrativo com versão esperada e revalidação; sent/sending/unknown não permitem reenvio cego. Falha não altera jornada/padrões/alocação.
- Fechamento B08 reutilizado; aviso de volta padrão reflete cancelamento e prazo das 22h. Correção manual não dispara mensagem.
- GET messages e POST retry restritos a admin/operador ativos e dia atual.

## Evidências
TDD: testes inicialmente falharam por domínio/serviço/rota/tabela ausentes; comportamento implementado e validado incrementalmente. Foram acrescentados 22 testes em quatro suítes. Resultado final: 309/309 testes em 52 suítes (Jest --runInBand, 64,25 s); npm run build, npm run lint e tsc --noEmit aprovados. Checklist 16/16, nove tarefas concluídas, 131 documentos com links locais conferidos e git diff --check sem erros.

Migração Messages1793700000000 aplicada somente em PostgreSQL local dev/test. Dados sintéticos removidos após testes. Reversão recusa evidências; reversão vazia/reaplicação conferidas separadamente. Aplicação sem DELETE/DDL.

## Limitações e ocorrências
Envio padrão desabilitado (SENDER_NOT_CONFIGURED); simulação não comprova WhatsApp entregue. Sem cron, fornecedor, credenciais reais, serviços externos ou mudanças de PostgreSQL/Supabase/infraestrutura. Sending após falha de finalização e unknown exigem reconciliação futura B18. Mensagem já reservada/em trânsito não pode ser recolhida por resposta posterior.

Lint identificou dois ajustes de tipagem/assertion, corrigidos. Um script de atualização documental substituiu caracteres indevidamente; reparação heurística ampla foi bloqueada pela revisão automática. A correção posterior usou propostas conferidas, comparação com textos anteriores e verificação da transformação conhecida, preservando decisões; artefatos B14 foram recompostos a partir do conteúdo lido. Links e diff verificados ao concluir.

Próxima etapa: B15 — consultas operacionais e motorista. Nenhum commit automático realizado.
