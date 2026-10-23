# API do backend — contrato proposto

[Início](../README.md) · [Arquitetura](arquitetura.md) · [Dados](modelo-dados.md) · [API](api.md) · [Backlog](backlog.md) · [Regras](requisitos.md)

B03 implementa sessão e alteração de acesso; convites permanecem indisponíveis até integração real. Contratos efetivos e limites em [B03](../specs/002-autorizacao-equipe/contracts/access.md). B04 implementa GET /universities e rotas de alunos/vigências conforme [contrato efetivo](../specs/003-cadastros-vigencias/contracts/http.md), com erros seguros {code}, revisão esperada nas edições e conflitos sem duplicação nas criações. B05 implementa calendário e exceções, com revisão compartilhada e consulta limitada por intervalo, conforme [contrato efetivo](../specs/004-calendarios-elegibilidade/contracts/http.md). Elegibilidade é serviço interno sem endpoint público de telefone. B06 implementa grupos/regiões/pontos e padrões por sentido conforme [contrato efetivo](../specs/005-grupos-locais/contracts/http.md); resolução real de endereço retorna indisponível até integração autorizada. Demais rotas de domínio abaixo permanecem planejadas. B02 implementa `GET /health/live` (200, status ok) e `GET /health/ready` (200 ok ou 503 unavailable, checkedAt ISO UTC), sem prefixo /api/v1, apenas loopback. [Contrato técnico B02](../specs/001-base-backend/contracts/base.md). Prefixo proposto `/api/v1`. Supabase Auth escolhido; SDK no React envia token ao NestJS, que verifica autenticidade/validade, usuário ativo e autorização. Integração real ainda não realizada. Toda operação aplica autorização no servidor, valida entradas e chama as mesmas regras de domínio; nenhum caminho privilegiado da IA ignora horários ou capacidade.

## Convenções

JSON com identificadores, data operacional e versão do recurso. Erros: `code`, `message`, `details` seguros e `requestId`, sem segredos. Proposta HTTP: 400 formato inválido; 401 identidade inválida; 403 papel/ação vedado; 404 recurso inexistente ou fora do acesso do motorista; 409 versão/idempotência/conflito de alocação; 422 regra de negócio; 503 integração indisponível. Operações assíncronas retornam 202 com identificador para acompanhamento, nunca sucesso de confirmação fictício.

Para mutações por comando, exigir `Idempotency-Key`; mesma chave/mesmo conteúdo devolve resultado anterior, mesma chave/conteúdo diferente retorna 409. Aplicar versão esperada às revisões; conflito não é sobrescrito automaticamente. IDs do provedor deduplicam webhooks; reentrega não repete efeito. Idempotência não dispensa autenticação nem validação de recurso. No comando de acesso B03, o contrato implementado exige expectedVersion: repetição/desatualização retorna 409 sem novo efeito; Idempotency-Key genérico continua proposta para os próximos comandos.

## Operações da equipe

| Método/caminho proposto | Permissão | Dados/resultado e regras |
| --- | --- | --- |
| GET /session | Usuário ativo | Identidade validada pelo token e perfil obtido do vínculo local ativo; nunca confiar em perfil enviado pelo cliente. |
| POST /users/invitations; PATCH /users/{id}/access | Admin | PATCH implementado em B03 com role, active e expectedVersion; proteção do último admin. Convite autorizado retorna indisponível (503) até B18, sem envio fictício. |
| GET/PATCH /settings | Admin | Configurações gerais; não confundir com calendários editáveis pelo operador. |
| GET/POST /students; GET/PATCH /students/{id} | Admin/operador | Campos R01, telefone único; alterações versionadas. |
| GET/POST /students/{id}/contracts; PATCH /contracts/{id} | Admin/operador | Datas inicial/final inclusivas; rejeitar datas invertidas, sobreposição para o mesmo aluno e campos financeiros. |
| GET/PATCH /universities/{id}/calendar; GET /universities/{id}/calendar/exceptions; PUT /universities/{id}/calendar/exceptions/{date} | Admin/operador | Implementado em B05: semana, exceção por data e consulta por intervalo; revisão esperada obrigatória nas edições. |
| GET/POST /vehicles, /drivers, /boarding-points, /regions, /groups; PATCH /{collection}/{id} | Admin/operador | Coleções explicitamente permitidas, não endpoint genérico de tabelas. Frota conforme R14; grupos por sentido manuais. |
| PUT /vehicles/{id}/availability; PUT /groups/{id}/stop-order | Admin/operador | Disponibilidade por janela/etapa e ordem explícita; rejeitar posição duplicada ou local fora do grupo. |
| GET /operations/{date} | Admin/operador | Contagens, listas atuais, origens, pendências/falhas e status do planejamento. Não criar navegação de histórico de operação. |
| POST /operations/{date}/students/{id}/corrections | Admin/operador | Mudanças explícitas de trechos/locais, motivo e versão esperada. Pode após 17h; retorna estado/capacidade/necessidade de ajuste. Não envia WhatsApp automático. |
| GET /operations/{date}/universities/{id}/vehicle-options | Admin/operador | Demanda=max(ida,volta), menores opções suficientes equivalentes e versão; insuficiência retorna alerta sem repartição automática. |
| PUT /operations/{date}/allocations/{id} | Admin/operador | Veículo, grupo ou universidade, etapas/janela; local manual; vínculos de motorista por trecho. Rascunho não equivale planejamento confirmado. |
| POST /operations/{date}/planning/confirm | Admin/operador | Versão esperada; revalidar capacidade, disponibilidade, simultaneidade e dados necessários em transação. 409 se desatualizado/conflitante; 422 se falta ajuste. |
| GET /operations/{date}/groups/{id}/itinerary | Admin/operador | Trajeto automático ou ordem filtrada; indicar método e locais ainda sem ordem, sem inventar percurso. |
| POST /messages/{id}/retry | Admin/operador | Tentar reenvio da comunicação, sem mudar resposta; revalidar que lembrete ainda é pertinente. |
| GET /driver/trips; GET /driver/trips/{id} | Motorista | Somente atribuições do usuário autenticado; nomes, telefones, pontos e trajetos. Sem escrita ou acesso geral a alunos. |

Proposta: leituras de operação limitadas à janela de trabalho corrente; mecanismo exato da janela a definir sem criar tela/endpoint de histórico público. Registros técnicos retidos não implicam permissão de consulta pelo usuário.

## Entrada WhatsApp/automação

`POST /integrations/whatsapp/events`: somente identidade de integração autenticada, escopo restrito. Envelope proposto: `eventId`, telefone de origem, instante informado pelo provedor, tipo e mensagem. Backend grava recebimento durável antes da IA como instante autoritativo dos cortes e resolve aluno pelo telefone; não aceitar `studentId`, perfil ou flags de aprovação fornecidos pela IA. Evento externo é dado não confiável. Mecanismo concreto de autenticação/verificação depende da configuração futura Evolution API (via n8n ou integração direta, a definir).

Interpretação converte texto em comando restrito: confirmar/revisar trechos, informar dúvida/recusa, trocar local diário, pedir/aceitar padrão, cancelar volta ou solicitar esclarecimento. Backend valida intenção contra jornada, vigência, operação universitária, prazo e região. Resposta inclui resultado de domínio e resumo aprovado; IA pode formular linguagem, não modificar fatos. Mensagem “só vou” exige contexto/esclarecimento.

Permite revisões válidas recebidas antes de 17:00:00; a partir desse limite somente cancelar volta confirmada, com recebimento antes de 22:00:00. Atraso da IA não altera o instante registrado; chegada tardia não reabre prazo. Duplicatas não repetem efeito; mensagem comprovadamente antiga não vence revisão mais recente, e ordem incerta gera pendência. Não criar endpoint de aprovação tardia. Número desconhecido recebe orientação à empresa; sem autocadastro. Dia extra requer operação e vigência, não exige dia habitual do aluno. Sem resposta nunca é convertido em comando de confirmação.

`POST /integrations/whatsapp/delivery-events`: identidade restrita, atualiza só envio/erro por identificador; não altera jornada. `GET /integration-commands/{id}` pode devolver estado de processamento à mesma integração, sem acesso geral a dados.

## Agendador interno

Comandos internos autenticados e não expostos ao aluno: preparar/enviar slot 05h/11h/13h/16h e fechar data às 17h. Chave única por data/aluno/slot e propósito; revalidar pendências antes do envio. Fechamento por data deve ser seguro à repetição e à corrida com cancelamento; resultado contém contagens de mudanças e falhas, sem aplicar padrão a não respondentes. Executor técnico ainda não escolhido; testes usam relógio e adaptadores simulados.

## Erros de domínio relevantes

| Código proposto | Efeito esperado |
| --- | --- |
| UNKNOWN_PHONE / CONTRACT_INACTIVE / NO_OPERATION | Orientar contato/renovação, sem confirmar. |
| STUDENT_WINDOW_CLOSED / RETURN_CANCEL_WINDOW_CLOSED | Rejeitar alteração do aluno fora da janela; equipe tem caminho separado. |
| INVALID_BOARDING_POINT / OUTSIDE_SERVICE_AREA | Manter local anterior válido; pedir alternativa. |
| ADDRESS_VALIDATION_UNAVAILABLE / GROUP_UNRESOLVED | Não aceitar por suposição; preservar anterior e registrar impedimento. |
| NEEDS_CLARIFICATION | Nenhuma confirmação presumida; persistindo dúvida, pendência à equipe. |
| STALE_VERSION / IDEMPOTENCY_CONFLICT | Recarregar/conciliar, nunca sobrescrever versão mais nova silenciosamente. |
| CAPACITY_EXCEEDED / VEHICLE_CONFLICT / NO_SUITABLE_VEHICLE | Exibir alerta; impedir confirmação do planejamento até ajuste manual. |
| STOP_ORDER_PENDING | Preservar endereço válido sem inventar posição no plano B. |

Correção manual que excede capacidade pode ser salva com `planningStatus=needs_adjustment` e alertas; erro bloqueante se aplica à confirmação do planejamento, não ao registro da informação verdadeira. Não confundir confirmação de passageiro com confirmação de planejamento.
