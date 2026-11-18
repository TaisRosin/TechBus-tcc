# API do backend — contrato proposto

> **Consolidação para apresentação — 17/11/2026:** consulte o [guia completo](guia-apresentacao-andamento.md) e o [inventário técnico](inventario-tecnico-andamento.md). Backend e painel locais, contexto de conversa, agendador, pontos fixos, disponibilidade diária e prévia Google Maps estão implementados. Ensaio WhatsApp de 09/11 foi parcial; cadeia completa, hospedagem e avaliação acadêmica permanecem pendentes. Ordem de paradas continua manual; quarta utilização está fora da entrega. Trechos antigos abaixo que divergem desse estado são históricos; as evidências de cada incremento delimitam o que foi validado.

11/11/2026 — Endereços dos pontos: cadastro próprio estruturado (logradouro/localização, número textual ou sem número, bairro, cidade, UF, Brasil, CEP e complemento) e referência da parada separada, exibida no itinerário/motorista. Bairro, CEP e complemento opcionais. Texto antigo preservado, detalhamento somente explícito; UUIDs, grupos, padrões e ordem manual mantidos. Validação estrutural não comprova endereço real. Maps/geocodificação/rotas continuam futuros. Implementação: specs/025-enderecos-pontos/.

POST/PATCH /boarding-points e /dropoff-points aceitam address OU addressDetails, nunca ambos. addressDetails exige street, number, noNumber, neighborhood, city, state, country=BR, postalCode e complement (opcionais como string vazia). Número obrigatório exceto noNumber=true, quando deve ser vazio; UF brasileira; CEP vazio ou 8 dígitos, hífen de entrada aceito. stopReference opcional até 1000; omitido preserva o anterior no PATCH, vazio limpa. Resposta inclui address formatado, addressDetails/null, stopReference e legacyAddress/null. Cliente antigo com address inalterado preserva detalhes; endereço textual alterado limpa detalhes obsoletos. expectedVersion/autorização permanecem.

## Contratos diários vigentes — 11/11/2026

- GET/PUT `/vehicles/:id/availability`: `week` é vetor de sete booleanos (domingo a sábado), ou null; PUT exige `expectedVersion`.
- GET `/vehicles/:id/availability/exceptions?from=...&to=...`: registros `{date, available}`; PUT `/vehicles/:id/availability/exceptions/:date` recebe `{available: true|false|null, expectedVersion}`. Null restaura a semana.
- POST `/operations/current/vehicle-options` recebe `{universityId}`. Retorna demanda, opções suficientes e menores equivalentes, usando disponibilidade do dia e exclusividade intermunicipal.
- PUT `/operations/current/planning` mantém versão/demandToken e viagens; local: `{kind:'local',stage,groupId,vehicleId,driverId}`; intermunicipal: `{kind:'intermunicipal',universityId,vehicleId,outbound:{driverId},return:{driverId}}`. Sem horários. Entradas antigas com horários mantêm compatibilidade estrutural; horários não determinam disponibilidade/conflito. Confirmação continua transacional e somente após fechamento/pendências resolvidas.
- Consulta administrativa, itinerário e motorista limitados à data atual, inclusive para planos legados. UI organiza as APIs existentes nas abas Ida, Volta e Intermunicipal.

As descrições B11/B12/B15 anteriores são históricas onde conflitarem com estes contratos. [Detalhes da correção](../specs/024-itinerario-diario/plan.md).

Agendador023: executor interno opt-in, sem novo endpoint público e sem identidade administrativa simulada. Mensagens/tentativas permanecem nas consultas protegidas existentes. [Contrato interno](../specs/023-agendador-operacional/contracts/scheduler.md).

B18.4 (05/11): consulta protegida `GET /api/v1/integrations/whatsapp/events` inclui `clarification` com estado, motivo, finalidade, texto e resposta associada. Admin/operador ativos; motorista bloqueado. Contexto não é aceito no corpo dos comandos administrativos: vem do webhook autenticado e é revalidado no backend. Revisão mantém o contrato B13 com justificativa e recibos revisados. [Detalhes](../specs/020-contexto-conversa/contracts/context.md).

Pontos fixos de desembarque: contratos implementados em [022](../specs/022-desembarque-fixo/contracts.md). Novos padr?es usam locationId; endere?o livre via resolve foi desativado nesta entrega.

## B18.3 implementada — propostas de interpretação

POST `/api/v1/integrations/whatsapp/events/:id/interpret`, corpo `{}`, admin/operator ativos, somente evento recebido no dia. Retorna tentativa persistida e proposta/motivo; não aceita texto ou comando fabricado. GET de eventos inclui interpretação, sem segredo/resposta bruta. Repetição não chama IA novamente. [Contrato](../specs/019-interpretacao-mensagens/contracts/http.md). Proposta não confirma viagem; ordem incerta continua pendente.

B18.1 (28/10/2026): autenticação própria implementada localmente. [Contrato efetivo](../specs/017-autenticacao-propria/contracts/auth.md): login, troca obrigatória, logout, criação/provisionamento, metadados e reset administrativo. Bearer opaco revogável; GET /session preserva B03. Convites antigos retornam 410 INVITATIONS_REPLACED para admin. Bootstrap/recuperação técnica são comandos locais, não rotas públicas. Substitui as pendências históricas de autenticação abaixo.

[Início](../README.md) · [Arquitetura](arquitetura.md) · [Dados](modelo-dados.md) · [API](api.md) · [Backlog](backlog.md) · [Regras](requisitos.md)

B03 implementa sessão e alteração de acesso; a rota de convites permanece indisponível e será revista em B18 para criação administrativa de contas, sem e-mail. Contratos efetivos e limites em [B03](../specs/002-autorizacao-equipe/contracts/access.md). B04 implementa GET /universities e rotas de alunos/vigências conforme [contrato efetivo](../specs/003-cadastros-vigencias/contracts/http.md), com erros seguros {code}, revisão esperada nas edições e conflitos sem duplicação nas criações. B05 implementa calendário e exceções, com revisão compartilhada e consulta limitada por intervalo, conforme [contrato efetivo](../specs/004-calendarios-elegibilidade/contracts/http.md). Elegibilidade é serviço interno sem endpoint público de telefone. B06 implementa grupos/regiões/pontos e padrões por sentido conforme [contrato efetivo](../specs/005-grupos-locais/contracts/http.md); resolução real de endereço retorna indisponível até integração autorizada. B07 implementa GET /api/v1/students/:id/journey, apenas dia atual para admin/operador, e serviço interno de comandos conforme [contrato efetivo](../specs/006-jornada-comandos/contracts/internal-http.md). Sem endpoint de personificação do aluno ou integração real. B08 acrescenta operações internas de fechamento por jornada/lote e cancel_return, com recibos pendentes conciliados e orientação para futuro envio, conforme [contrato B08](../specs/007-fechamento-cancelamento/contracts/internal.md). Não instala agendador nem expõe mutação pública. Demais rotas de domínio abaixo permanecem planejadas. B02 implementa `GET /health/live` (200, status ok) e `GET /health/ready` (200 ok ou 503 unavailable, checkedAt ISO UTC), sem prefixo /api/v1, apenas loopback. [Contrato técnico B02](../specs/001-base-backend/contracts/base.md). Prefixo proposto `/api/v1`. Autenticação própria aprovada em 27/10/2026, ainda não implementada: o NestJS validará sessão, usuário ativo e autorização; contratos de login, criação de conta e recuperação administrativa serão detalhados em B18. Toda operação aplica autorização no servidor, valida entradas e chama as mesmas regras de domínio; nenhum caminho privilegiado da IA ignora horários ou capacidade.

## Convenções

JSON com identificadores, data operacional e versão do recurso. Erros: `code`, `message`, `details` seguros e `requestId`, sem segredos. Proposta HTTP: 400 formato inválido; 401 identidade inválida; 403 papel/ação vedado; 404 recurso inexistente ou fora do acesso do motorista; 409 versão/idempotência/conflito de alocação; 422 regra de negócio; 503 integração indisponível. Operações assíncronas retornam 202 com identificador para acompanhamento, nunca sucesso de confirmação fictício.

Para mutações por comando, exigir `Idempotency-Key`; mesma chave/mesmo conteúdo devolve resultado anterior, mesma chave/conteúdo diferente retorna 409. Aplicar versão esperada às revisões; conflito não é sobrescrito automaticamente. IDs do provedor deduplicam webhooks; reentrega não repete efeito. Idempotência não dispensa autenticação nem validação de recurso. No comando de acesso B03, o contrato implementado exige expectedVersion: repetição/desatualização retorna 409 sem novo efeito; Idempotency-Key genérico continua proposta para os próximos comandos.

## Operações da equipe

| Método/caminho proposto | Permissão | Dados/resultado e regras |
| --- | --- | --- |
| GET /session | Usuário ativo | Identidade validada pelo token e perfil obtido do vínculo local ativo; nunca confiar em perfil enviado pelo cliente. |
| POST /users/invitations; PATCH /users/{id}/access | Admin | PATCH implementado em B03 com role, active e expectedVersion; proteção do último admin. Rota de convite existente retorna indisponível (503); B18 revisará o contrato para criação de contas sem e-mail, conforme decisão de 27/10/2026. |
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

B09 acrescenta `receiveUnordered` à porta interna: eventos novos sem ordem comprovada ficam em `ORDER_UNCERTAIN`. O lote `closeDay` passa a retornar `processed` com `needsAdjustment` e `pending`, ou `failed` com código seguro. Processamento não confirma planejamento; falhas exigem nova tentativa do ID/lote mesmo com avanço do cursor. [Contrato efetivo B09](../specs/008-idempotencia-concorrencia/contracts/internal.md). Identidade e prova de ordenação do provedor continuam pendentes para B18.

`POST /integrations/whatsapp/events`: somente identidade de integração autenticada, escopo restrito. Envelope proposto: `eventId`, telefone de origem, instante informado pelo provedor, tipo e mensagem. Backend grava recebimento durável antes da IA como instante autoritativo dos cortes e resolve aluno pelo telefone; não aceitar `studentId`, perfil ou flags de aprovação fornecidos pela IA. Evento externo é dado não confiável. Mecanismo concreto de autenticação/verificação depende da configuração futura Evolution API (integração direta pelo NestJS, sem n8n).

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

## Contrato implementado B10
GET /api/v1/students/:id/location-suggestions permite somente admin/operador ativos; mostra avaliação atual por trecho, sem consulta de data ou histórico. Comandos de aceite/recusa/pedido são internos e validam recibo durável, horário, revisão e local. [Contrato B10](../specs/009-padroes-sequencia/contracts/internal-http.md). Nenhum endpoint público de mutação de aluno ou envio real.

## Contratos implementados B11
Cadastros de veículos/motoristas, programação semanal, exceções por data e avaliação de propostas conforme [contrato B11](../specs/010-frota-disponibilidade/contracts/http.md). Admin/operador ativos; sem concessão de acesso por cadastro de motorista. Avaliação retorna problemas do lote, sem reservar/confirmar alocação. B12 fará revalidação contra ocupação persistida.

## Contratos implementados B12
Rotas administrativas do dia atual em `/api/v1/operations/current`: demanda/pendências, opções intermunicipais, rascunho versionado e confirmação após fechamento. [Contrato B12](../specs/011-alocacao-planejamento/contracts/http.md). Token de demanda e versão evitam confirmar informação superada; capacidade, locais, disponibilidade e ocupações são revalidados atomicamente. Leitura de motorista permanece futura; correções pela equipe foram acrescentadas em B13 abaixo.

## Contratos implementados B13
GET/POST `/api/v1/students/:id/journey/correction`, somente admin/operador ativos e dia atual. Consulta informa jornada/revisão e recibos pendentes; mutação exige chave idempotente, revisão, justificativa, IDs revisados e alterações explícitas. [Contrato B13](../specs/012-correcoes-equipe/contracts/http.md). Sem rota de histórico, personificação de aluno ou envio de WhatsApp.

## Contratos B16
GET/PUT `/api/v1/groups/:id/stop-order` mantém ordem com versão esperada para admin/operador. GET `/api/v1/operations/groups/:id/itinerary` prepara prévia; POST no sufixo `/publish` publica mediante token atual e revisão. GET `/api/v1/driver/trips/:id/itinerary` restringe orientação aos próprios trechos locais confirmados. Pendências e método manual explícitos, sem rota viária intermunicipal inventada. [Contrato B16](../specs/015-trajeto-contingencia/contracts/http.md).

## Contratos B15
GET `/api/v1/operations/overview` consolida a operação para admin/operador, com data dentro da janela operacional e paginação de alunos. GET/PUT `/api/v1/access/driver-links/:id` consulta/atualiza vínculo pelo ID do usuário, somente admin e com versão esperada. GET `/api/v1/driver/trips` e GET `/api/v1/driver/trips/:id` revalidam conta, perfil, vínculo e atribuição no servidor; motorista apenas lê. [Contrato B15](../specs/014-consultas-operacionais/contracts/http.md).

## Contratos implementados B18.2

POST `/api/v1/integrations/whatsapp/webhook`: segredo próprio e instância configurada, independente do login da equipe; 202 após persistência. GET `/api/v1/integrations/whatsapp/events`: admin/operator, apenas dia atual, paginação e projeção sem segredos. Motorista não acessa eventos. Sem endpoint de envio livre; adaptador usa tentativas B14 persistidas. [Contrato](../specs/018-whatsapp-local/contracts/whatsapp.md). Canal desativado por padrão; nenhum pareamento real comprovado.

## Contratos implementados B14
GET `/api/v1/messages` lista comunicações do dia; POST `/api/v1/messages/:id/retry` exige expectedVersion e falha conhecida ainda pertinente. Somente admin/operador ativos; sem filtro histórico. Executor de horários e despacho permanecem internos, adaptador real desabilitado. [Contrato B14](../specs/013-mensagens-agendamentos/contracts/http.md).

Aplicação controlada B18: POST /api/v1/integrations/whatsapp/events/:id/apply, corpo {}, admin/operator ativo. Retorna resultado aplicado/rejeitado/pendente; não aceita comando, horário, identidade ou ordering do cliente. Revalida a interpretação persistida e o recibo na mesma transação da jornada. Não envia WhatsApp.

Consulta administrativa de eventos inclui os estados e instantes do despacho de recibos. Não há rota de envio arbitrário ou reenvio cego; o executor depende da flag de envio e da allowlist. [Contrato atualizado](../specs/019-interpretacao-mensagens/contracts/http.md).

## Prévia Maps — 12/11/2026

Todos os endpoints /maps exigem operations:manage. POST /maps/geocode recebe address e retorna candidates. GET /maps/groups/:id?mode=catalog|today retorna ordered, pending e token de revisão. id=direct com mode=direct permite trecho origem/destino. POST /maps/route recebe groupId, mode, token e locations na sequência origem, pontos do grupo, destino. Cada local inclui placeId, lat, lng, address, approximate e pointId (null nos extremos). Backend revalida sequência/revisão e retorna distanceMeters, durationSeconds e polyline. Conteúdo Google não é persistido. MAPS_UNCONFIGURED, MAPS_UNAVAILABLE e MAPS_ROUTE_NOT_FOUND são erros sanitizados.
