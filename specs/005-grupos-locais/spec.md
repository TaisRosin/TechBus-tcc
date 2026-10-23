# Feature Specification: B06 — Grupos e locais

**Created**: 2026-10-23
**Feature directory**: specs/005-grupos-locais
**Status**: Aprovada para implementação após confirmação conjunta de Taís.
**Input**: Iniciar B06 após calendários/elegibilidade B05, aproveitando decisões existentes.

## User Scenarios & Testing

### US1 — Organizar grupos, regiões e pontos (Priority: P1)
Admin/operador cadastra grupos separados para coleta e distribuição, regiões atendidas e pontos de embarque. A empresa define os vínculos manualmente, sem agrupamento, equilíbrio ou recomendação local automática.
**Why this priority**: Estrutura necessária para localizar alunos na operação.
**Independent Test**: cadastrar grupos dos dois sentidos, região e ponto; consultar vínculos e negar alterações por motorista.
**Acceptance Scenarios**:
1. Grupos de coleta e distribuição são distintos; vínculo não troca de sentido implicitamente.
2. Confirmado: cada ponto pertence a um único grupo de coleta e cada região a um único grupo de distribuição; grupo pode reunir vários pontos/regiões.
3. Dados reais de origem, fiscalização, área e pontos não são inventados; preenchimento cabe à empresa.

### US2 — Validar locais e manter padrões (Priority: P1)
Equipe mantém locais padrão do aluno. Futuras solicitações usam somente embarque pré-cadastrado e aceitam automaticamente desembarque comprovadamente dentro da área, com vínculo resolvido a região/grupo.
**Why this priority**: Completar os locais previstos em R01 e preparar R12 sem iniciar jornada diária.
**Independent Test**: selecionar embarque válido e validar desembarque com respostas controladas de dentro/fora da área ou indeterminado; confirmar preservação do padrão anterior em falhas.
**Acceptance Scenarios**:
1. Embarque inexistente ou inadequado ao sentido não pode ser selecionado.
2. Desembarque dentro da área e com região/grupo resolvidos é aceito sem aprovação individual da empresa.
3. Fora da área, validação indisponível ou resultado ambíguo preservam o anterior; não presumir validade pela grafia do endereço nem pela opinião da IA.
4. Endereço novo válido não é descartado por ausência de posição no trajeto; ordem manual/plano B será tratada em B16.
5. Troca diária não altera padrão; pedido explícito/consentimento exigidos conforme R13. Jornada diária fica B07/B08; sequência/sugestão B10.
6. Grafias diferentes não devem ser fundidas por suposição; usar identificação validada do local, preparando integração futura.

### US3 — Manter cadastros referenciados (Priority: P2)
Equipe corrige ou desativa cadastros preservando referências e evitando alterações silenciosas em viagens.
**Why this priority**: Pontos, regiões e grupos podem estar vinculados a alunos e futuras jornadas.
**Independent Test**: desativar cadastro referenciado e verificar referências/padrões, bloqueios e ausência de exclusão ou substituição automática conforme decisão abaixo.
**Acceptance Scenarios**:
1. Confirmado: permitir desativação de cadastros referenciados, preservando padrões e confirmações existentes, bloqueando novas utilizações e indicando ajuste manual.
2. Correções não notificam automaticamente WhatsApp, não trocam locais/padrões por conta própria e não reabrem prazo do aluno.
3. Edições desatualizadas são rejeitadas sem apagar alterações mais recentes.

### Edge Cases
Ponto sem grupo; região sem distribuição; região ambígua; grupo de sentido incorreto; endereço desconhecido/indeterminado; endereço fora da área após local válido; desativação de referências; revisão concorrente; mesmo local com grafias distintas; cadastros iniciais B04 sem padrões ainda preenchidos.

## Requirements
### Functional Requirements
- **FR-001**: Admin/operador mantém grupos, regiões, pontos e padrões; motorista não administra esses dados.
- **FR-002**: Organização local manual por sentido; cada ponto tem um grupo de coleta e cada região um grupo de distribuição.
- **FR-003**: Embarque somente pré-cadastrado e válido; desembarque aceito automaticamente quando validação resolve área/região/grupo.
- **FR-004**: Falha, ambiguidade e endereço fora da área não substituem informação válida.
- **FR-005**: Padrões de ida/volta são independentes; preservar exigência de pedido/consentimento e separar de alterações diárias.
- **FR-006**: Não excluir automaticamente registros referenciados; desativação preserva referências, bloqueia novas utilizações e indica ajuste manual.
- **FR-007**: Não atribuir veículos, otimizar trajetos, inserir posições arbitrárias nem gerar confirmações/mensagens neste incremento.
- **FR-008**: Validação real de endereços depende de integração futura; simulação deve ser explícita e não ser aceita como prova geográfica no funcionamento normal.

### Key Entities
Grupo local por sentido; região atendida; ponto de embarque; local identificado e sua evidência de validação; padrões do aluno. Universidade/aluno/vigência reutilizados, sem novas empresas ou rotas operacionais fora do recorte.

## Success Criteria
- **SC-001**: Nenhum local é aceito com área/grupo indeterminado ou sentido inadequado.
- **SC-002**: Todos os cenários de falha preservam o anterior; nenhuma validação altera confirmação, padrão ou grupo sem comando autorizado correspondente.
- **SC-003**: Equipe mantém cadastros e padrões; acesso não autorizado e revisão antiga são rejeitados.
- **SC-004**: Testes demonstram limites de simulação, sem serviços reais nem dados operacionais inventados.

## Assumptions e limites
Fontes: [requisitos R01/R12/R14/R15](../../docs/requisitos.md), [escopo](../../docs/escopo.md), [fluxos](../../docs/fluxos.md), [modelo proposto](../../docs/modelo-dados.md), [pendências](../../docs/decisoes.md) e [backlog B06](../../docs/backlog.md).
Validação simulada já integra o critério B06; não escolher provedor de mapas, geometria real ou infraestrutura nesta etapa. Falta de validação real deve aparecer como indisponibilidade, sem aceitar endereço por presunção. Dados de origem/áreas serão preenchidos pela empresa, não são nova rodada de levantamento. Frota B11, jornadas B07/B08, sugestões B10 e trajetos B16 permanecem fora da implementação B06. As duas recomendações foram confirmadas por Taís, autorizando plano, tarefas e implementação integral.
