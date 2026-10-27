# Feature Specification: B11 — frota, disponibilidade e etapas
**Feature Branch**: codex/001-base-backend (existente preservada)
**Created**: 2026-10-25
**Status**: Aprovada para implementação
**Input**: Continuar pela B11 do backlog após B10, preservando R14/R17/R18 e decisões anteriores.

## User Scenarios & Testing
### User Story 1 — Manter frota e motoristas (Priority: P1)
Como admin/operador, cadastro veículos e motoristas para preparar a operação noturna.
**Why this priority**: base para a disponibilidade e alocação posteriores.
**Independent Test**: cadastrar veículo, revisar assentos e desativar preservando referências.
**Acceptance Scenarios**:
1. Veículo registra identificação/número, placa, tipo van/micro/ônibus e assentos de passageiros inteiros positivos.
2. Placa e identificação duplicadas são rejeitadas; revisões desatualizadas não sobrescrevem cadastro recente.
3. Motorista é cadastro operacional distinto da identidade de login. Cadastro não cria conta nem concede acesso.
4. Desativação impede novas utilizações e preserva registros anteriores para ajuste manual.

### User Story 2 — Informar disponibilidade (Priority: P1)
Como equipe, determino quando cada veículo pode participar da operação, distinguindo simultaneidade e reuso.
**Why this priority**: evitar assumir que veículo cadastrado está disponível.
**Independent Test**: avaliar um período totalmente coberto e outro parcialmente indisponível, conforme decisões FR-003/004.
**Acceptance Scenarios**:
1. Veículo inativo nunca é considerado disponível para novo uso.
2. Disponibilidade precisa cobrir todo o período solicitado, incluindo permanência intermunicipal.
3. Correções valem nas novas avaliações, sem apagar referências operacionais anteriores.

### User Story 3 — Representar etapas e atribuições (Priority: P2)
Como equipe, preparo coleta, ida intermunicipal, permanência, retorno e distribuição, com motorista por trecho.
**Why this priority**: preservar o fluxo aprovado sem antecipar recomendação automática.
**Independent Test**: representar o mesmo veículo na ida/permanência/retorno e motoristas distintos por trecho, permitindo reuso posterior sem simultaneidade.
**Acceptance Scenarios**:
1. Coleta e distribuição têm grupos distintos/manuais; não gerar agrupamento ou recomendação local.
2. Ida, permanência e retorno intermunicipais mantêm o mesmo veículo por universidade.
3. Motorista pode variar por trecho; atribuição não muda automaticamente veículo intermunicipal.
4. Reuso após retorno não é exclusividade do veículo durante toda a noite; sobreposição não é permitida.

### Edge Cases
- Assentos zero, negativos ou fracionários; placa/identificação duplicadas; edição concorrente.
- Falta de configuração, período parcialmente disponível, limites adjacentes e travessia de meia-noite.
- Desativação de veículo/motorista referenciado preserva referências e sinaliza ajuste.
- Disponibilidade não equivale a alocação confirmada nem escolhe motorista automaticamente.

## Requirements
### Functional Requirements
- **FR-001**: Permitir cadastro/manutenção de frota e motoristas a admin/operador ativos; impedir escrita por motorista.
- **FR-002**: Validar identificação/placa únicas, tipo permitido e assentos positivos; preservar referências e impedir novas utilizações de inativos.
- **FR-003**: Disponibilidade por faixas de início/fim informadas pela empresa, associadas às etapas. Intermunicipal ocupa ida, permanência e retorno; não inventar horários fixos.
- **FR-004**: Programação semanal por veículo com exceções por data prevalecendo sobre a semana. Ausência de configuração não presume disponibilidade e bloqueia uso automático.
- **FR-005**: Distinguir período disponível de período ocupado; permitir reuso posterior e impedir uso simultâneo ao conectar a alocação B12.
- **FR-006**: Representar etapas aprovadas e motorista por trecho, preservando o mesmo veículo no ciclo intermunicipal.
- **FR-007**: Cadastro de motorista não cria login nem amplia permissões; convites/perfis continuam exclusivos do admin e integração real futura.
- **FR-008**: Não implementar recomendação/alocação confirmada B12, correções B13 ou visão do motorista B15 nesta etapa. Disponibilizar os dados e validações necessários a esses consumidores.
- **FR-009**: Testar com dados sintéticos e bancos locais; nenhuma alteração de PostgreSQL/Supabase, provedor ou infraestrutura.

### Key Entities
- Veículo: identificação, placa, tipo, assentos e situação.
- Motorista: pessoa operacional, independente de conta de acesso.
- Disponibilidade: períodos permitidos do veículo, conforme decisões pendentes.
- Etapa/trecho: segmento da operação e seu vínculo de veículo/motorista, para consumo pela futura alocação.

## Success Criteria
### Measurable Outcomes
- **SC-001**: Todos os casos de assentos inválidos, duplicidade e alteração desatualizada são rejeitados nos testes.
- **SC-002**: Avaliação distingue cobertura integral, falta de configuração e indisponibilidade parcial conforme escolhas aprovadas.
- **SC-003**: Casos de reuso posterior e ocupação intermunicipal integral têm resultados verificáveis, sem recomendação local automática.
- **SC-004**: Cadastro não concede acesso e permissões existentes permanecem protegidas em testes.

## Assumptions
Fontes: [backlog B11](../../docs/backlog.md), [R14/R17/R18](../../docs/requisitos.md), [decisões](../../docs/decisoes.md), [dados propostos](../../docs/modelo-dados.md), [fluxos](../../docs/fluxos.md).
Uma empresa, noturno, Unimater/Unidep e etapas São Lourenço/fiscalização/Pato Branco preservadas. Reutilizar autorização e padrões de cadastro existentes. Dados reais serão informados pela empresa; não exigir esses dados para implementar com fixtures. FR-003/004 confirmados por Taís em 25/10/2026; implementação integral autorizada. Etapas e atribuições são avaliadas como proposta, sem persistir alocação confirmada B12.

Aceitação adicional: exceção vazia bloqueia a data mesmo com semana disponível; exceção configurada pode liberar data sem semana; período parcialmente coberto é recusado; limites adjacentes permitem reuso sem sobreposição.
