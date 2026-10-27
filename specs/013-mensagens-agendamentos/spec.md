# Feature Specification: B14 — mensagens persistentes e agendamentos simulados

**Feature Branch**: codex/001-base-backend (existente preservada)
**Created**: 2026-10-26
**Status**: Aprovada para implementação
**Input**: Continuar após B13 pelo backlog, reutilizando decisões e sem integrações reais.

## User Scenarios & Testing

### User Story 1 — Consultar e lembrar somente o necessário (Priority: P1)
Como equipe, quero que a consulta das 05h e os lembretes das 11h/13h/16h sejam preparados somente para alunos elegíveis e trechos pendentes.
**Why this priority**: evitar mensagens desnecessárias e manter os prazos já aprovados.
**Independent Test**: aluno habitual ativo com vigência/operação recebe consulta; resposta definitiva elimina os lembretes pertinentes; ida resolvida e volta indecisa geram lembrete somente de volta.
**Acceptance Scenarios**:
1. Considerar America/Sao_Paulo e revalidar aluno, contrato, calendário, contexto e pendências antes do envio.
2. Sem operação/configuração, aluno inativo ou contrato inválido: não enviar consulta/lembrete.
3. Sem resposta/indecisão não confirma viagem. Resposta definitiva não recebe lembrete do trecho resolvido.
4. Às 17:00:00 não iniciar envio de consulta/lembrete nem reabrir confirmação; tratamento de horários perdidos segue Q1.
5. Aluno de uso extra segue Q2; não presumir uso por ausência de dias habituais.

### User Story 2 — Identificar falhas e reenviar com segurança (Priority: P1)
Como admin/operador, consulto falhas do dia e tento reenviar comunicação ainda pertinente sem alterar a viagem.
**Why this priority**: falha de comunicação não pode apagar confirmação ou provocar envios repetidos indevidos.
**Independent Test**: falha simulada fica registrada; após resposta definitiva, reenvio de lembrete é impedido; jornada mantém sua revisão/estados.
**Acceptance Scenarios**:
1. Repetição/concorrrência de preparação ou despacho não cria duas mensagens para a mesma oportunidade de contato.
2. Mensagens e tentativas distinguem preparação, envio confirmado, falha e resultado incerto; não apresentar sucesso sem evidência.
3. Reenvio administrativo revalida pertinência e prazo; não repete mensagem já enviada nem presume que timeout significa ausência de entrega.
4. Motorista/aluno não consultam nem acionam reenvios administrativos.
5. Falha/reenvio não altera confirmação, padrão, capacidade ou ocupação de veículo.

### User Story 3 — Exercitar a rotina diária sem serviços reais (Priority: P1)
Como equipe, quero validar a rotina de horários e fechamento com relógio e envio simulados antes de conectar fornecedores.
**Why this priority**: concluir backend com evidências reproduzíveis, mantendo autorização e isolamento.
**Independent Test**: executar duas vezes os horários e o fechamento das 17h preserva efeitos únicos e prazos.
**Acceptance Scenarios**:
1. Reusar fechamento B08 e orientações já previstas sobre volta padrão/cancelamento, sem inventar nova confirmação.
2. Informação de volta padrão deve refletir estado e prazo atuais; não prometer cancelamento após 22h.
3. Correção manual B13 não dispara mensagem automaticamente; rotina futura reavalia pendências conforme regras existentes.
4. Não instalar agendador real nem conectar WhatsApp, IA ou serviços externos nesta entrega. Simulação não comprova entrega ao telefone.

### Edge Cases
- Processo indisponível durante vários horários; retorno antes/depois das 17h.
- Resposta, correção, calendário ou telefone alterado entre preparação e despacho.
- Execuções concorrentes, reenvio repetido, falha antes/depois de registrar tentativa e retorno incerto do envio.
- Ida resolvida, volta pendente; nenhum trecho pendente; viagem extra com pendência.
- Fechamento repetido e cancelamento posterior: mensagem não restaura viagem cancelada.

## Requirements

### Functional Requirements
- **FR-001**: Consulta 05h e lembretes 11h/13h/16h, America/Sao_Paulo, somente elegíveis/pendentes; revalidar antes do envio.
- **FR-002**: Não enviar consulta/lembrete a partir de 17:00:00. Não criar confirmação por silêncio ou indisponibilidade.
- **FR-003**: Antes das 17h, recuperar somente o contato mais recente ainda pertinente, sem acumular anteriores; depois das 17h não recuperar consultas/lembretes. Q1 confirmada em 26/10/2026.
- **FR-004**: Aluno que iniciou solicitação extra válida recebe próximos lembretes de trechos pendentes, mantendo vigência/operação e prazo. Não iniciar consulta automática em dia não habitual. Q2 confirmada em 26/10/2026.
- **FR-005**: Persistir comunicação/tentativas e identificar falha ou resultado incerto; separar de confirmações de viagem.
- **FR-006**: Evitar efeitos duplicados em repetição/concorrrência; reenvio por admin/operador ativo exige pertinência atual e não presume resultado de envio desconhecido.
- **FR-007**: Expor leitura administrativa do dia e falhas, sem histórico operacional público ou painel completo B15.
- **FR-008**: Reusar fechamento B08 e orientações de volta padrão/cancelamento sem modificar suas regras.
- **FR-009**: Correções da equipe não geram mensagem automática; preservar jornadas, padrões e alocações em qualquer falha de envio.
- **FR-010**: Executar somente simulações locais; Evolution API, IA, integração real e infraestrutura permanecem B18. Não afirmar garantia de entrega externa ou ausência absoluta de duplicatas de fornecedor não conectado.

### Key Entities
- Comunicação de saída: destinatário, dia, propósito, oportunidade de contato e situação.
- Tentativa de envio: execução, resultado e falha/indeterminação.
- Rotina diária: horários previstos e fechamento, reexecutáveis sem repetir efeitos.
- Pendência atual: trechos que ainda requerem resposta, derivados da jornada.

## Success Criteria
- **SC-001**: Todos os cenários de horário respeitam os cortes e a seleção dos trechos pendentes.
- **SC-002**: Repetir preparação/despacho simulado não duplica a mesma oportunidade de contato.
- **SC-003**: Nenhuma falha ou reenvio modifica confirmação, padrão ou ocupação.
- **SC-004**: Falhas/resultado incerto são distinguíveis; nenhuma execução utiliza serviço externo.

## Assumptions
Fontes: [R03/R04/R07/R19](../../docs/requisitos.md), [fluxos](../../docs/fluxos.md), [pendência de recuperação](../../docs/decisoes.md#pendências), [backlog B14](../../docs/backlog.md) e [contratos propostos](../../docs/api.md). Reutilizar B05–B13 e constituição.
Q1/Q2 confirmadas por Taís em 26/10/2026; implementação integral autorizada. Detalhes técnicos de persistência, concorrência, executor e testes serão definidos no plano usando padrões existentes. Não reabrir horários, papéis, PostgreSQL/Supabase ou fornecedor WhatsApp. Textos determinísticos reutilizam orientações aprovadas; IA conversacional e callbacks reais ficam para integração futura.
