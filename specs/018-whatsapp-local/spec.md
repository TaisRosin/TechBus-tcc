# Feature Specification: B18.2 — canal WhatsApp local

**Created**: 2026-10-28
**Feature Branch**: diretório independente; sem criação de branch.
**Status**: preparação e implementação local autorizadas pela continuidade de B18; pareamento depende do aparelho de Taís e envio real depende de destinatário autorizado.
**Input**: continuar após B18.1, respeitando Evolution/Baileys local, sem n8n e somente contatos de testes.

## User Scenarios & Testing

### US1 — Receber sem perder ou duplicar (P1)

Como equipe, preciso que uma mensagem do canal controlado seja registrada antes de interpretação, mantendo a primeira chegada válida e a identidade comprovada. Teste independente: entregar eventos sintéticos repetidos/concorrrentes e consultar um único recebimento persistido.

Aceite: somente origem autenticada/instância configurada; chave externa repetida não altera horário/texto/identidade. Número desconhecido ou identidade LID sem prova permanece pendente, nunca inventa aluno. Grupos/status próprios não se tornam comandos. Esta etapa não interpreta texto nem confirma viagem; ordem incerta permanece explícita para B18.3.

### US2 — Preparar saída sem reenvio cego (P1)

Como equipe, preciso conectar a saída existente ao canal e distinguir aceitação de resultado incerto. Teste independente: fornecedor simulado aceita, falha antes do despacho ou perde resposta após despacho.

Aceite: envio desativado por padrão e limitado a destinatários de teste explicitamente configurados. Aceitação não comprova entrega/leitura/presença. Timeout/erro após despacho é incerto; nenhuma repetição automática. Mesma tentativa persistida não produz outro despacho. Eventos de status devem conservar evidência sem associar por texto/telefone aproximado.

### US3 — Preparar serviço local isolado (P1)

Como Taís, quero poder vincular o número separado sem contratar hospedagem. Teste independente: serviço local responde sem instância conectada, usa banco próprio e não escuta rede externa; roteiro informa como vincular pelo aparelho.

Aceite: segredos só em arquivos locais ignorados, versão fixa e ajustes rastreáveis, nenhuma credencial do banco TechBus entregue à Evolution, nenhuma mensagem real sem destinatário autorizado. Se faltar pareamento, registrar limite e não declarar integração ponta a ponta concluída.

### Edge Cases

Webhook contendo chave API; mensagem antiga/histórico; ID externo inválido; texto excessivo; mídia não textual; resposta de envio perdida após aceitação; status antes da resposta; serviço parado; conexão perdida; credenciais inválidas; mesmo evento com conteúdo divergente.

## Requirements

- FR-001: autenticar canal, limitar instância e persistir recebimento durável antes da interpretação.
- FR-002: deduplicar por identidade do evento, preservar primeira versão e apontar divergência sem substituir dados.
- FR-003: resolver aluno somente por telefone comprovado cadastrado; não inferir telefone de LID/nome, nem executar comandos de grupo ou mensagens próprias.
- FR-004: conservar relógio de recebimento do servidor e indicar falta de prova de ordenação; sem reabrir prazos.
- FR-005: adaptar envio B14 com resultado seguro, opt-in e lista de contatos de teste; não reenviar resultado incerto.
- FR-006: persistir vínculo tentativa/ID retornado e status sem tratar ACK como presença ou confirmação de viagem.
- FR-007: serviço local isolado e reproduzível, preservando dados e segredos; instalação não equivale a pareamento.
- FR-008: consulta administrativa protegida das pendências técnicas, sem chaves/tokens/payload bruto.

### Key Entities

Evento de entrada, vínculo de recebimento/aluno, tentativa de saída, identificação externa da mensagem e estado técnico do canal.

## Success Criteria

- SC-001: evento repetido/concorrrente cria um único registro, sem mudar primeiro recebimento.
- SC-002: origem não autenticada e aluno não comprovado nunca modificam uma jornada.
- SC-003: falha ambígua nunca dispara segundo envio automático nos cenários de teste.
- SC-004: ambiente local preparado sem acesso da Evolution aos dados TechBus; pareamento/ensaio real reportados separadamente.

## Assumptions

Interpretação determinística/Gemini pertence a B18.3; execução de horários reais é incremento posterior. Taís possui chip/WhatsApp, mas pareamento Evolution não foi realizado. Sem alunos reais, contratação ou mensagens a terceiros. [Preparação](../../docs/b18-preparacao.md) e decisões existentes prevalecem.
