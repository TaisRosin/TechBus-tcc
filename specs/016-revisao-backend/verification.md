# Verificação B17 — revisão integrada do backend

Data: 26/10/2026. Revisão autorizada pelo pedido de iniciar B17, sem novas decisões de negócio. Spec Kit: especificação/checklist 16/16, plano, pesquisa, modelo, contrato, sete tarefas e [matriz de cobertura](coverage.md). Sem hooks configurados.

## Resultado
R01–R22/O01 classificados com evidências locais e limites externos. Acrescentado cenário contínuo entre mensagens, jornada, fechamento, planejamento, correção, consultas e itinerários, usando serviços reais e PostgreSQL isolado; somente envio, geografia e relógio são simulados.

O cenário confirma: falha de envio não altera demanda; silêncio não confirma; recebimento às 16:59:59.999 interpretado após fechamento aplica volta padrão; reentregas não repetem efeitos; correção de endereço exige ordenação/republicação e não envia mensagem; cancelamento recebido às 21:59:59.999 e interpretado às 22h retira volta/parada, preservando ida e plano com alerta; recebimento exatamente às 22h é rejeitado.

## Defeito corrigido
O filtro de ConsultationService exigia grupo local válido também para o trecho intermunicipal. Desativar um ponto após confirmação retirava o passageiro do intermunicipal apesar de universidade/sentido permanecerem inequívocos. Teste de regressão reproduziu lista vazia indevida; correção aplica exigência de grupo somente às etapas locais. Intermunicipal preserva aluno confirmado, local null e needsAdjustment; local inválido permanece fora da lista local. Nenhuma nova regra, transferência ou alocação automática.

## Validação
**329/329 testes em 62 suítes**, Jest --runInBand, 81,367 s. Um teste integrado novo e cenário de regressão adicional na suíte B15 existente. Build, lint e tsc --noEmit aprovados. Nenhuma dependência, migração ou infraestrutura nova.

Sete tarefas concluídas. PostgreSQL dev/test sem migrações pendentes ou dados sintéticos remanescentes nas tabelas operacionais conferidas; ambos encerrados ao finalizar. Links locais conferidos em 159 documentos, sem destinos ausentes; git diff --check sem erros.

A primeira execução do cenário integrado apontou uma expectativa excessiva do teste: comparava o plano inteiro sem admitir needsAdjustment=true após cancelamento. Ajustada a expectativa ao comportamento B12 aprovado; escolhas/atribuições permanecem iguais. Isso não exigiu mudança no produto.

## Prontidão e limites
Núcleo local revisado, sem defeito bloqueante conhecido no escopo verificado. Isso não declara produto completo ou operação em produção. Supabase Auth/convites/recuperação, identificação do remetente, Evolution/IA, resumos conversacionais reais, envio/reconciliação, agendador, geografia e cálculo viário permanecem B18. Interface B19 e avaliação acadêmica B20 não foram executadas. Retenção, parâmetros de sessão e hospedagem continuam pendentes. Sem ensaio de carga ou auditoria formal de segurança.

Próxima etapa recomendada: preparar escolhas e integrações B18, revisando skills específicas e obtendo autorização para serviços/ambientes reais antes de conectá-los. Nenhum commit automático realizado.
