# Feature Specification: B10 — padrões e sequência de locais
**Feature Branch**: codex/001-base-backend (existente preservada)
**Created**: 2026-10-24
**Status**: Aprovada para implementação
**Input**: Continuar pela B10 do backlog, reutilizando B06–B09 e R13/R22.

## User Scenarios & Testing
### User Story 1 — Reconhecer recorrência (Priority: P1)
Como aluno, recebo sugestão na quarta utilização confirmada do mesmo alternativo por trecho, sem mudar automaticamente o padrão.
**Why this priority**: entregar R13 preservando consentimento.
**Independent Test**: quatro utilizações geram sugestão; três não geram.
**Acceptance Scenarios**:
1. Quatro datas confirmadas no mesmo alternativo geram sugestão para aquele trecho; padrão permanece igual.
2. Dias sem uso não interrompem a sequência; outro local confirmado reinicia a contagem.
3. Ida e volta têm contagens independentes.

### User Story 2 — Corrigir contribuições (Priority: P1)
Como equipe, preciso de sugestões coerentes com revisões e cancelamentos.
**Why this priority**: não contar duplicatas nem volta cancelada.
**Independent Test**: cancelar a quarta volta retira a contribuição; reentregar não aumenta contagem.
**Acceptance Scenarios**:
1. Cancelamento ou revisão recalcula sequência e impede aceite de sugestão sem suporte.
2. Há no máximo uma contribuição por aluno/data/trecho, mesmo sob repetição.
3. Interpretação atrasada válida contribui na data operacional de origem.

### User Story 3 — Decidir sobre padrão (Priority: P2)
Como aluno, posso aceitar ou recusar; pedido explícito dispensa quatro utilizações.
**Why this priority**: sugestão não autoriza mudança.
**Independent Test**: aceite válido altera padrão com evidência; recusa preserva.
**Acceptance Scenarios**:
1. Aceite permitido registra padrão e evidência conjuntamente.
2. Local desativado ou sugestão superada não substitui padrão válido.
3. Pedido explícito válido continua disponível sem sequência mínima.

### Edge Cases
- Uso confirmado sem local: FR-006, sem retirar confirmação da demanda.
- Padrão ausente: não presumir alternativo; cadastro/pedido explícito continua disponível.
- Mudança de padrão, cancelamento e revisão exigem reavaliação antes do aceite.
- Decisões concorrentes não duplicam efeito nem sobrescrevem revisão recente.

## Requirements
### Functional Requirements
- **FR-001**: Contar uma contribuição por aluno/data/trecho confirmado, em ordem da data operacional; confirmação não comprova presença.
- **FR-002**: Ignorar dias sem uso; outro local reinicia sequência; quarta utilização consecutiva do mesmo alternativo gera sugestão por trecho.
- **FR-003**: Recalcular após revisão/cancelamento, mantendo idempotência e garantias B07–B09.
- **FR-004**: Alterar padrão somente por pedido explícito ou aceite válido, com evidência, autorização, prazos e validação existentes. Não mudar automaticamente local da jornada ao aceitar padrão.
- **FR-005**: Após recusa, não repetir proposta na mesma sequência. Nova proposta requer outro local interrompendo a sequência e quatro novas utilizações do alternativo.
- **FR-006**: Uso confirmado sem local identificado suspende sugestão enquanto faltar informação; recalcular após resolução, sem presumir local nem apagar confirmação.
- **FR-007**: Preservar registros mínimos, sem histórico operacional consultável nem exclusão automática.
- **FR-008**: Sem mensagens reais; identificação e entrega futuras B14/B18. Não conectar serviços ou bancos externos.
### Key Entities
- Utilização: contribuição revisável de jornada confirmada por data/trecho/local.
- Sequência: usos consecutivos de local por aluno/trecho.
- Sugestão: proposta vinculada à sequência/padrão de referência e decisão explícita.
- Padrão: local habitual B06 com versão e evidência.

## Success Criteria
### Measurable Outcomes
- **SC-001**: Quatro utilizações válidas geram proposta; três não geram em todos os casos aceitos.
- **SC-002**: Duplicatas não aumentam contagem nem repetem mudança de padrão.
- **SC-003**: Revisões/cancelamentos refletidos antes do aceite; nenhuma sugestão inválida altera padrão.
- **SC-004**: Cenários aprovados cobertos por testes e evidências locais, sem mudança sem consentimento.

## Assumptions
Fontes: [R13/R22](../../docs/requisitos.md), [fluxos](../../docs/fluxos.md), [decisões](../../docs/decisoes.md), [B10](../../docs/backlog.md).
Reutilizar B06–B09; correções operacionais da equipe conectadas em B13. Identificação real e envio permanecem futuros. Não definir retenção, mapas ou infraestrutura. FR-005/006 confirmados por Taís em 24/10/2026; implementação integral autorizada. Artefatos anteriores preservados.

Cenários adicionais: recusar na quarta e continuar no mesmo local não gera nova proposta; usar outro local e depois quatro vezes o alternativo permite nova proposta. Uso confirmado sem local suspende proposta; resolver o local recalcula continuidade.
