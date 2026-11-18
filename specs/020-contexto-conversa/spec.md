# B18.4 — contexto de conversa e esclarecimento

Atualização de 05/11/2026: implementação e validação isolada concluídas; [evidências](verification.md). Taís aprovou uma pergunta objetiva e, se persistir a dúvida, revisão pela equipe, sem repetir perguntas automaticamente. A resposta precisa chegar antes das 17h; depois, somente cancelamento de volta permitido pelas regras existentes. Este incremento não encerra B18.3/T019 nem comprova o canal real completo.

Fontes: [requisitos R05/R08/R09/R10/R19/R20](../../docs/requisitos.md), [decisões](../../docs/decisoes.md), [incremento anterior](../019-interpretacao-mensagens/tasks.md).

## User Scenarios & Testing

### US1 — Responder a uma pergunta identificada (P1)
Como aluno, quero que uma resposta curta seja interpretada no contexto comprovado da pergunta a que respondi.

Aceite: resposta vinculada inequivocamente a uma pergunta persistida do mesmo aluno, instância e operação pode resolver o trecho perguntado. Apenas ser a última mensagem enviada não prova esse vínculo. Sem evidência suficiente, sim/não permanecem pendentes. Resposta sobre volta não modifica ida. Contexto não substitui ordenação, prazo ou elegibilidade.

### US2 — Esclarecer uma mensagem ambígua (P1)
Como aluno, quero uma pergunta objetiva quando faltar informação, sem reconfirmar pedidos já claros.

Aceite: pergunta informa qual informação falta; preparação/despacho são persistentes e deduplicados. Resposta inequívoca segue validações existentes. Uma pergunta por cadeia; dúvida persistente vai à equipe. Pergunta ou resposta incerta não gera confirmação, repetição cega de envio ou ciclo infinito. Ambiguidades compostas sem finalidade inequívoca vão diretamente à equipe para preservar todas as intenções.

### US3 — Revisar dúvidas não resolvidas (P1)
Como equipe, quero consultar a pendência do dia e resolvê-la pelo fluxo autorizado de revisão, sem perder a jornada válida anterior.

Aceite: somente admin/operador ativos consultam e revisam; motorista não acessa. Encerrar pendência exige revisão explícita e justificativa. Mensagem anterior não desfaz correção; cancelamento posterior válido continua possível. Nenhuma alteração administrativa envia WhatsApp automaticamente.

## Requirements

- FR001: persistir evidência mínima de pergunta/resposta; validar instância, aluno, operação, propósito e estado antes de usar contexto.
- FR002: não presumir contexto pelo último envio, pelo texto da IA ou por horário isolado; verificar o suporte real do conector antes de fixar o contrato técnico.
- FR003: respeitar recebimento durável, ordem e regras existentes; novo esclarecimento não retroage seu recebimento nem reabre prazo. Pedido claro já válido preserva seu recebimento original.
- FR004: manter confirmação e locais válidos anteriores enquanto houver ambiguidade; aplicar apenas comando completo validado.
- FR005: preparar pergunta uma única vez, reservar despacho antes da chamada, revalidar pertinência e não repetir envio incerto/interrompido automaticamente.
- FR006: expor pendência/diagnóstico do dia à equipe autorizada e integrar revisão B13 sem apagar evidências nem desbloquear sucessores indiscriminadamente.
- FR007: regras diretas precedem Gemini; contexto mínimo não inclui telefone/segredos; IA não escolhe identidade, prazo ou autorização.
- FR008: testar regras críticas por TDD, transações em PostgreSQL isolado, HTTP protegido e fornecedor substituto. Testes manuais anteriores permanecem adiados, sem declarar falhas corrigidas.

## Success Criteria

- SC001: resposta curta sem vínculo comprovado nunca altera jornada; resposta vinculada só altera o objeto da pergunta.
- SC002: duplicata/concorrência cria no máximo uma pergunta e uma tentativa de despacho; incerteza não causa reenvio automático.
- SC003: prazo, troca de dia, revisão administrativa e troca de destinatário invalidam contexto incompatível sem retirar informação válida.
- SC004: testes automatizados, tipos, lint e build passam com evidências; validação externa permanece separada.

## Limites

Inclui resolução de nomes exatos normalizados dos pontos fixos ativos cadastrados pela empresa e aplicação atômica de viagem + local. Homônimos e desconhecidos não são escolhidos automaticamente. Pedidos de alteração do padrão vão à equipe, sem aplicação parcial. O painel existente mostra o estado do esclarecimento.

Fora deste incremento: endereços livres/geografia, mudanças de padrão via conversa, agendador 05h/11h/13h/16h/17h, cálculo de rotas e avaliação acadêmica. Mapas e sugestão da quarta utilização foram retirados da entrega. Não ativar envios reais para validar este incremento. Evidência citada e encerramento: [contrato](contracts/context.md), [pesquisa](research.md), [modelo](data-model.md).
