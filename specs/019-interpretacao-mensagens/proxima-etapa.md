# Próxima etapa — contexto e ordenação

Política aprovada por Taís em 29/10/2026: ordenar mensagens pelo horário original do fornecedor após validar sua origem, aceitando risco residual; empates, ausência ou inconsistência de evidência ficam para equipe. Recebimento durável no TechBus continua definindo prazos. Pedido claro não exige reconfirmação. Supera a proibição de usar esse horário como política operacional, mas não autoriza tratar horário comum mutável como prova absoluta. Implementação ainda em andamento.

Decisão de Taís em 29/10/2026: pedido explícito e válido recebido antes das 17h não exige reconfirmação; processamento posterior preserva o recebimento durável original. Após efetivar a viagem, enviar recibo com os trechos e locais realmente registrados, sinalizando locais pendentes sem inventá-los. Perguntar somente para esclarecer ambiguidade; conflito com ordem incerta continua exceção pendente, sem reconfirmação geral. Esta decisão orienta a próxima implementação; não habilita envios nem comprova automação concluída.

## Evidência atual

O projetor em backend/src/whatsapp/domain.ts não preserva a referência à mensagem citada. O fornecedor local possui contextInfo; a pesquisa registrada em research.md identifica stanzaId. O serviço de interpretação retorna ORDER_UNCERTAIN e JourneyService rejeita aplicação de recibo incerto. Portanto adicionar uma referência de contexto, isoladamente, não desbloqueia confirmação automática.

Exemplo: aluno envia “vou” e depois “não vou”; se o segundo evento chega primeiro, a ordem de recebimento não demonstra a ordem da intenção. Duas respostas à mesma pergunta também não resolvem essa questão.

## Experiência aprovada

Pedido claro → validações → registro da viagem → recibo informativo, sem novo sim. Exemplo apenas quando ambos os trechos e locais estiverem efetivados: “Ok, sua ida e volta de hoje estão confirmadas. Embarque em X e desembarque em Y.”

Pedido ambíguo → esclarecer apenas a informação faltante. A decisão sobre pedido claro recebido no prazo não autoriza novas intenções depois do corte. Ordem incerta continua pendente. A proposta de reconfirmação para todo pedido claro e seu corte próprio foi rejeitada; não implementá-la.

## Requisitos técnicos independentes da escolha

- Referência citada só é evidência quando vinculada à instância, destinatário/aluno, dia, finalidade da pergunta e revisão ainda válida.
- Citação de outro aluno, dia ou revisão não autoriza interpretação contextual.
- Não promover recibos antigos por reentrega, timestamp, confiança Gemini ou chegada ao servidor.
- Confirmar pedido composto exige efeito atômico; não aplicar sucessivamente partes do mesmo recibo.
- Recebimento durável, elegibilidade, correções administrativas e cortes existentes continuam obrigatórios.
- Resumo enviado com resultado incerto não admite reenvio cego.

## Sequência proposta

Experiência definida → especificar regras temporais e concorrência → planejar persistência/contratos → testes de ordem invertida, duplicata, revisão expirada, sim sem contexto e cortes → implementação → ensaio com aluno fictício explícito.

Nenhum envio, migração, mudança no .env ou aplicação de jornada realizada por esta análise. Não há base para alegar que o mecanismo causal já foi comprovado.
