# B18 — preparação das integrações

**Estado mais recente — B18.3:** WhatsApp pareado e recebimento real comprovado em B18.2. Regras diretas e adaptador Gemini produzem propostas para revisão, acionadas por admin/operator. Não confirmam viagem com ordem incerta; chave Gemini validada em 29/10/2026 com gemini-3.1-flash-lite, 7/7 casos sintéticos no fluxo regras→Gemini. Integração local habilitada para acionamento explícito, sem autoenvio. [Artefatos B18.3](../specs/019-interpretacao-mensagens/verification.md). O planejamento abaixo é histórico onde divergir desta atualização.

**Atualização de 28/10/2026:** B18.1 autorizada e implementada localmente; [evidências](../specs/017-autenticacao-propria/verification.md). A entrevista abaixo é histórica quanto à autorização da autenticação. Evolution, Gemini, mapas, agendamento real e alunos reais continuam pendentes. Chaves Google não são necessárias para a autenticação local. Validação completa do navegador fica em B19.

Consolidação da entrevista em 27/10/2026. Planejamento em andamento, sem autorização de implementação, instalação, contratação ou conexão. [Decisões](decisoes.md#b18--planejamento-das-integrações-externas) e [requisitos](requisitos.md) prevalecem. Levantamento/clarificação com Spec Kit e Grill Me; primeiro incremento detalhado em [B18.1 — autenticação própria](../specs/017-autenticacao-propria/spec.md), com [plano](../specs/017-autenticacao-propria/plan.md) e [tarefas](../specs/017-autenticacao-propria/tasks.md) para revisão; demais integrações ainda aguardam artefatos próprios. Os artefatos B17 preservam evidências históricas, não demonstram as integrações futuras.

## Ambiente e escolhas

- Testes separados, com dados fictícios e contatos controlados; Taís simula aluno e equipe. Alunos reais ficam para depois.
- PostgreSQL e backend locais; Evolution API também na máquina de Taís, conectada diretamente ao NestJS, sem n8n.
- Baileys/WhatsApp Web somente com número separado de testes. Taís informou chip providenciado e WhatsApp Web vinculado; conexão da Evolution ainda pendente, sem verificação técnica realizada. Modalidade/hospedagem para operação real serão reavaliadas.
- Autenticação própria no NestJS/PostgreSQL substitui Supabase Auth e SMTP de acesso. Admin cria contas e administra recuperação; usuário define nova senha no primeiro acesso e após recuperação. Responsável técnico recupera o único admin por procedimento restrito. Sem cadastro público, sem lembrar acesso; novo login ao abrir, recarregar ou restaurar o painel.
- Regras diretas para comandos simples e inequívocos; API Gemini para linguagem natural, múltiplas intenções ou alterações. Ambos os caminhos respeitam identidade, recebimento durável, prazo, elegibilidade e validações do backend. Somente texto; outras mídias recebem pedido de resposta escrita.
- Google Maps Platform é candidato em avaliação, não fornecedor definitivo. Cobertura: área urbana de São Lourenço do Oeste; universidades em Pato Branco. Bairro inteiro pertence à região/grupo cadastrado, e um grupo/veículo pode reunir vários bairros.
- Grupos e veículos locais manuais na ida e na volta. Agrupamento/redistribuição automáticos ficam para implementação futura. Ordenação de paradas dentro dos grupos continua prioritária, visando menor tempo estimado. Volta termina no último desembarque, sem garagem.
- Cerca de 15 endereços por veículo é estimativa, não teto. Vans, micro-ônibus e ônibus grandes atendem a operação; Taís dispensou validação adicional de circulação por porte no MVP. Capacidade e disponibilidade continuam obrigatórias.

## Integrações e o que providenciar

| Componente | Preparativo de Taís | Preparação técnica posterior |
| --- | --- | --- |
| WhatsApp/Evolution | Chip/número de testes ativo no WhatsApp, acesso ao aparelho para vinculação e outro contato para simular o aluno | Conferir instalação local e dependências da versão escolhida, persistência própria da Evolution, autenticação, eventos de entrada e status; não conceder acesso irrestrito aos dados do TechBus |
| Gemini | Conta Google com acesso ao AI Studio/projeto e chave da API quando chegar a etapa de configuração; disponibilidade de uso/faturamento conforme conta | Selecionar modelo/parâmetros após verificação, testar intenções e ambiguidades, definir limites e falhas, configurar segredo apenas no backend |
| Geocodificação/mapas | Lista de bairros por região/grupo, pontos de embarque e endereços de referência; localização da origem da coleta, fiscalização e universidades | Verificar cobertura urbana, bairro ausente/ambíguo, identidade do endereço e condições de armazenamento do fornecedor |
| Rotas | Mesmos locais e exemplos de percursos para conferência | Verificar término aberto, ordenação por tempo, limites e falhas; preservar publicação explícita e plano B |
| Google Cloud, se candidato aprovado | Projeto, faturamento habilitado e APIs/chaves restritas, somente na etapa autorizada | Cotas, monitoramento de uso, custos e configuração das APIs necessárias; nenhuma contratação feita |
| Rotina/agendamento local | Máquina ligada, conectada e sem suspensão nos testes de horários reais | Executor dos horários existentes, recuperação de pendências, concorrência e reconciliação de envios incertos; não exige fornecedor externo por decisão atual |
| Autenticação própria | Identificadores das contas fictícias para testar admin/operador/motorista | Implementar login, sessões, criação e recuperação, reaproveitando autorização B03; não é integração externa |

Não enviar senhas/chaves pelo chat ou versioná-las. Não é necessário criar projeto Supabase, contratar SMTP ou n8n para este desenho. Hospedagem pública não é pré-requisito imposto aos primeiros testes com Evolution/backend locais; conectividade real entre os processos será verificada na configuração.

## Ordem proposta e dependências

1. Planejar e implementar autenticação própria como incremento de backend antes da exposição operacional. Essa mudança amplia o trabalho de identidade em relação à B03 e ainda precisa de contratos, testes e autorização de desenvolvimento.
2. Preparar Evolution/Baileys local com número de testes: primeiro recebimento durável, identidade e duplicatas; depois envio, status e conciliação. É a primeira integração externa recomendada.
3. Integrar comandos diretos e Gemini ao mesmo fluxo validado. Não chamar IA antes de persistir recebimento e não permitir que o modelo escolha identidade ou permissões.
4. Integrar geografia e cálculo de trajeto. Pesquisa e coleta de dados começam cedo, junto da preparação inicial, para preservar a prioridade do automático. Geografia antecede a utilização de endereços no roteamento.
5. Ativar executor real local e testar horários, falhas e retomada após canal/interpretador estarem validados. Testes determinísticos permanecem isolados do envio real.
6. Realizar ensaio integrado de B18; interface e experiência completa de login/motorista serão concluídas e verificadas em B19. Operação real e avaliação acadêmica exigem etapas próprias, não são comprovadas por testes com Taís.

## Atualização de implementação — B18.2, 28/10/2026

Canal local implementado: webhook com segredo exclusivo, recibo durável sem interpretação, deduplicação/conflito e adaptador B14 sem reenvio incerto. Evolution2.3.7 compilada e verificada em loopback com banco exclusivo; zero instâncias conectadas. **TechBus utiliza Evolution API.** [Plano/tarefas](../specs/018-whatsapp-local/tasks.md), [evidências](../specs/018-whatsapp-local/verification.md) e [pareamento futuro](../specs/018-whatsapp-local/quickstart.md). A autorização posterior de continuidade substitui a limitação da entrevista histórica; nenhum aluno real, QR pareado ou envio real nesta entrega. Próximo incremento B18.3; Maps/custos continuam separados.

## Pendências remanescentes e histórico de planejamento

- Google Cloud/Maps: Taís está tratando falha de verificação do perfil de pagamento (OR_CVIF_05). Não bloqueia planejamento de autenticação, Evolution ou Gemini. Chave Gemini já exibida no AI Studio; funcionamento/cotas/modelo ainda não testados. Chip e WhatsApp Web preparados conforme relato; Evolution ainda não conectada.

- Modelo e limites Gemini; versões/dependências Evolution e mecanismo comprovável de identidade/ordenação/reconciliação dos eventos.
- Qualidade local da geocodificação, limite urbano verificável e mapeamento bairro/região/grupo. Não usar apenas município ou declaração da IA como prova.
- Viabilidade de rotas por menor tempo com destino no último desembarque: não fixar arbitrariamente um aluno como destino nem presumir que ordenar pontos intermediários resolva a escolha do último ponto.
- Login por e-mail individual e senha confirmado. Primeiro acesso e recuperação usam senha temporária gerada pelo sistema, entregue pelo admin, com troca obrigatória antes da operação. Senha temporária válida por 24 horas, com nova geração pelo admin após vencer. Sessão expira após 1 hora sem uso ou 12 horas desde o login, o que ocorrer primeiro. Desenho técnico proposto em B18.1: sessões opacas e credencial de troca restrita; token do painel somente em memória. Taís aceitou novo login também ao recarregar; comportamento completo de navegador será comprovado em B19. Recuperação automatizada por e-mail fica futura, sem SMTP no MVP.
- Retenção técnica dos registros permanece sem prazo definido; não excluir automaticamente ao fechar o dia. Política para uso real será definida antes dessa etapa.
- Revisar skills específicas dos serviços selecionados antes da implementação. Não instalar dependências ou serviços durante esta entrevista.

## Critérios para os incrementos futuros

- Conta desativada e perfil indevido não acessam operação; recuperação não reativa conta e não permite ao operador redefinir admin.
- Evento duplicado não repete efeitos; evento sem ordem comprovada não substitui revisão por suposição. Horários usam recebimento durável anterior à interpretação.
- Regras diretas não descartam ressalvas de mensagens compostas; Gemini não altera regras do domínio. Falha/ambiguidade não confirma por presunção.
- Falha de envio não apaga confirmação; resultado incerto não autoriza reenvio cego; rotina não acumula lembretes vencidos nem reabre prazo.
- Endereço inválido/indeterminado preserva válido anterior; agrupamento manual e confirmação de planejamento permanecem. Trajeto não omite, duplica ou inventa paradas.
- Evidências de serviço real serão separadas das simulações. Nenhum teste real foi executado neste planejamento.
