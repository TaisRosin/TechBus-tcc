# Processamento interno e recibos — 29/10/2026

**Estado de 04/11/2026:** consultar [consolidação](../../docs/estado-atual.md). Envio/processamento habilitados no arquivo privado observado; afirmações de envio false/zero alunos abaixo são históricas. Iniciar o backend pode ativar executores. Casos manuais e T019 continuam pendentes; próximo incremento [B18.4](../020-contexto-conversa/tasks.md) apenas planejado.

Continuidade autorizada da implementação. O recebimento autenticado continua sendo persistido antes de qualquer interpretação.

## Comportamento

- `EVOLUTION_PROCESS_ENABLED=true` ativa um executor interno a cada cinco segundos, com até dez eventos por rodada. O padrão versionado é false.
- Só seleciona eventos do dia, da instância configurada, vinculados a aluno ativo. Não cria alunos, não transforma contatos desconhecidos retroativamente e não simula identidade administrativa.
- Uma reserva persistente por evento impede execução duplicada entre processos. A interpretação mantém sua própria reserva, sem repetir chamada externa incerta.
- As mesmas validações de aluno, prazo, proposta e ordenação são usadas pelo caminho interno e pelo endpoint administrativo. O caminho interno não é exposto por parâmetro HTTP.
- Falha fica registrada para revisão. Trabalho interrompido em processing não é repetido automaticamente. Pendência pode ser tratada pelo fluxo administrativo existente; isso não apaga o registro da tentativa automática.

## Recibo

Aplicação da viagem e preparação do recibo acontecem na mesma transação. Falha reverte jornada, promoção do recibo de entrada e resposta preparada. Duplicata não cria nova resposta. Uma revisão nova torna recibos preparados de versões anteriores superseded.

O texto é formado pelo estado efetivamente registrado, com locais ativos e compatíveis. Sem local válido, informa pendência da equipe. Preserva recusa, indecisão e orientação de fechamento/cancelamento. Não pede reconfirmação.

A consulta administrativa de eventos inclui processing e acknowledgement. prepared significa apenas texto persistido, não mensagem enviada. O despachante está implementado e verificado com transporte simulado; envio real continua desativado. Uma correção manual da equipe não gera resposta automática.

## Persistência e limites

Migração1794400000000: conversation_jobs e journey_acknowledgements; rollback recusa excluir dados existentes. Registros mínimos são preservados, sem limpeza automática ao fechar o dia.

O executor não é o agendador de consultas/lembretes 05h/11h/13h/16h. Não resolve ambiguidades ou locais textuais automaticamente e não reabre prazos. O ensaio completo com aluno fictício explícito continua pendente.

## Despacho controlado

EVOLUTION_SEND_ENABLED=true e telefone na allowlist são necessários para despachar; a configuração privada continua false. A cada cinco segundos, até dez recibos são avaliados. Reserva transacional exclusiva muda prepared para sending antes da chamada HTTP, fora dos locks. Revalida instância, aluno ativo, telefone, dia, versão da jornada, conflito, recebimentos posteriores e texto formado pelos locais atuais. Recibo superado passa a superseded/CONTEXT_CHANGED.

Aceite com ID do provedor resulta em sent/PROVIDER_ACCEPTED: não comprova entrega ou leitura. Timeout, HTTP de erro, resposta inválida ou excessiva resultam em unknown/DELIVERY_UNCERTAIN. Falha ao persistir o resultado deixa sending. Nenhum desses estados é reenviado automaticamente; exigem revisão. A consulta administrativa expõe código e instantes do despacho.

Migração1794500000000 adiciona instantes, ID do provedor e código; reversão recusa eliminar evidências de despacho. A revalidação vale no instante da reserva: mudança posterior durante a chamada externa não pode retirar mensagem já em trânsito. Não há promessa de atomicidade entre PostgreSQL e WhatsApp.
