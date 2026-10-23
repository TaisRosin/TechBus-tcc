# Feature Specification: B02 — Base verificável do backend

**Feature Branch**: `codex/001-base-backend`.
**Created**: 2026-10-22
**Status**: implementada e validada localmente em 22/10/2026, após autorização de Taís.
**Input**: Iniciar SDD com decisões existentes, preparação técnica remanescente de B01 e B02.

## User Scenarios & Testing

### User Story 1 - Iniciar uma base reproduzível (Priority: P1)
Como desenvolvedora, quero iniciar e verificar a base local com instruções reproduzíveis para desenvolver os próximos módulos sem depender dos serviços da empresa.

**Why this priority**: os próximos módulos dependem da base executável.
**Independent Test**: preparar dependências conforme guia, iniciar a aplicação e consultar estado local; repetir preparação com as mesmas versões.
**Acceptance Scenarios**:
1. **Given** ambiente com pré-requisitos documentados, **When** executar guia, **Then** base inicia e informa estado, sem expor dados pessoais/segredos.
2. **Given** configuração obrigatória ausente/inválida, **When** iniciar, **Then** falha clara identifica o campo sem revelar conteúdo secreto.
3. **Given** nenhuma credencial externa, **When** executar validações locais, **Then** não necessita chamadas a serviços reais.

### User Story 2 - Verificar persistência isolada (Priority: P1)
Como desenvolvedora, quero desenvolvimento e testes separados para verificar evolução do armazenamento sem afetar dados de trabalho ou de terceiros.

**Why this priority**: permite verificar alterações desde o início.
**Independent Test**: aplicar, repetir, desfazer e reaplicar alteração técnica de teste; desenvolvimento permanece intacto.
**Acceptance Scenarios**:
1. **Given** ambiente de teste vazio, **When** aplicar alteração técnica controlada, **Then** registra uma vez; repetir não duplica; desfazer e reaplicar funciona.
2. **Given** configuração de desenvolvimento ou endereço externo, **When** preparar testes, **Then** recusa antes de conectar ou alterar dados.
3. **Given** persistência indisponível, **When** consultar prontidão, **Then** informa indisponibilidade sem revelar conexão.

### User Story 3 - Exercitar contratos e tempo controlado (Priority: P2)
Como desenvolvedora, quero separar entradas, coordenação, regras e persistência, controlando o relógio, para acrescentar regras sem depender da hora real.

**Why this priority**: prepara testes determinísticos dos próximos incrementos.
**Independent Test**: executar caso técnico de prontidão com persistência simulada e relógio fixo, sem rede.
**Acceptance Scenarios**:
1. **Given** instante fixo, **When** executar duas vezes, **Then** resultado temporal é idêntico.
2. **Given** fonte de tempo substituída, **When** executar o mesmo caso, **Then** muda a informação temporal sem alterar a regra por detalhes da infraestrutura.
3. **Given** base entregue, **When** inspecionar dependências, **Then** regras não importam transporte/persistência e módulos de negócio não são declarados concluídos.

### Edge Cases
- Porta ocupada: erro acionável; não interromper serviços existentes.
- Ferramenta de banco ausente: indicar pré-requisito, nunca substituir por banco externo.
- Teste recebe alvo de desenvolvimento: recusar antes da conexão.
- Mudança de data local: conversão explícita em America/Sao_Paulo.
- Processo vivo com persistência indisponível não significa base pronta.

## Requirements

### Functional Requirements
- **FR-001**: Preparação DEVE ser reproduzível com versões identificadas e guia de execução.
- **FR-002**: Separar entrada, caso de uso, regras e persistência por contratos mínimos.
- **FR-003**: Permitir substituir relógio e dependências nos testes.
- **FR-004**: Desenvolvimento/testes DEVEM ter armazenamento local isolado entre si e dados sintéticos.
- **FR-005**: Evoluções DEVEM ser explícitas, versionadas e verificáveis por aplicar/repetir/desfazer/reaplicar.
- **FR-006**: Distinguir processo vivo de prontidão da persistência, sem exposição de segredos.
- **FR-007**: Recusar configuração inválida e alvo não autorizado de teste antes de efeitos.
- **FR-008**: Incluir testes de comportamento de contratos, isolamento e tempo, com evidências reais de execução.

### Key Entities
Nenhuma entidade de negócio nova. Estado de prontidão, configuração e registro técnico de evoluções não substituem o [modelo conceitual](../../docs/modelo-dados.md).

## Success Criteria

### Measurable Outcomes
- **SC-001**: Guia permite preparar/iniciar a base e repetir instalação sem mudar versões resolvidas.
- **SC-002**: Todos os cenários acima passam com resultados registrados.
- **SC-003**: Ciclo aplicar/repetir/desfazer/reaplicar termina no estado esperado, com zero alterações em desenvolvimento.
- **SC-004**: Validações locais funcionam sem credenciais reais ou chamadas a serviços externos.
- **SC-005**: Relógio fixo produz resultado repetível independentemente da hora da máquina.

## Assumptions
B00 e escolhas mínimas de B01 concluídas; esta feature prepara versões/ambiente e entrega B02. Usuária desta etapa técnica é a desenvolvedora. R01–R22/O01 permanecem em [requisitos](../../docs/requisitos.md); B02 fornece suporte, não implementa essas regras. Fora: login, cadastro, calendário, jornada, alocação, frontend e conexões reais. Instalações locais realizadas após autorização, com versões e resultados em verification.md.
