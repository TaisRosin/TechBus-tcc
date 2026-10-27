# Decisões, referências e pendências

[Início](../README.md) · [Escopo](escopo.md) · [Requisitos](requisitos.md) · [Fluxos](fluxos.md) · [Decisões](decisoes.md) · [Plano](plano-desenvolvimento.md)

Consolidação vigente das decisões explícitas de Taís. [Requisitos](requisitos.md) contém os critérios e casos críticos; [fluxos](fluxos.md) detalha a operação. Não há implementação ou teste concluído implícito nesta documentação.

## Decisões confirmadas

| Tema | Decisão vigente |
| --- | --- |
| Produto | TechBus, Sistema para gestão de transporte universitário; WhatsApp/IA são componentes. |
| Operação | Uma empresa, noturno, Unimater/Unidep; coleta mista em São Lourenço até fiscalização, intermunicipal separado por universidade no mesmo veículo de ida/retorno, distribuição local novamente mista por regiões. |
| Grupos e frota local | Grupos diferentes por sentido definidos pela empresa, que escolhe veículos locais. Sem recomendação local, divisão automática ou equilíbrio de tempos. Um grupo por veículo na distribuição permite reuso após retorno. |
| Recomendação intermunicipal | Menor disponível para max(ida, volta) por universidade; único veículo priorizado, mesma capacidade como equivalentes, empresa confirma. Insuficiência gera alerta/manual, sem repartição ou dupla alocação simultânea. |
| Confirmações | Até 17h, última informação explícita válida prevalece. Ida/“vou” implica volta salvo recusa explícita; só ida/só volta limita; “não vou” nenhum salvo só volta declarada. |
| Pendências e volta padrão | Sem resposta não conta. Indeciso de ida não confirma. Ida confirmada + volta indecisa recebe lembretes de volta; às 17h inclui volta por padrão, sinaliza origem e informa aluno, com cancelamento até 22h. |
| Após 17h | Aluno só cancela volta confirmada até 22h; sem confirmação tardia, troca de ponto ou aprovação tardia. Equipe pode corrigir listas, sem notificação WhatsApp automática; excesso de assentos exige ajuste antes de confirmar planejamento. |
| Locais | Até 17h embarque pré-cadastrado; desembarque dentro da área aceito automaticamente e vinculado a grupo/região. Inválido não substitui local válido. Padrão só muda por pedido/consentimento; quarta utilização consecutiva do alternativo gera sugestão por trecho. |
| Consulta e calendário | 05h inicial, 11h/13h/16h lembretes de pendências, America/Sao_Paulo. Dia habitual aluno + operação universidade + vigência; extra iniciado pelo aluno até 17h se há operação. |
| Comunicação | Telefone cadastrado, sem autocadastro; resumo final, esclarecimento e encaminhamento à equipe se incompreensão persistir. Falhas destacadas, reenvio pela equipe, sem apagar respostas válidas. |
| Equipe | Admin/operador gerenciam cadastros, vigências, calendários e operação. Só admin usuários/perfis/permissões/configurações gerais. Motorista lê apenas viagens atribuídas, incluindo telefones, sem edição. |
| Trajeto | Automático de alta prioridade, opcional se comprometer entrega. Plano B aprovado: ordem manual por grupo/sentido filtrada pelos confirmados; sem otimização prometida. |
| Exclusões | Nenhum financeiro; contrato só vigência. Sem histórico operacional consultável, presença real, rastreamento, múltiplas empresas, diurno ou colégio. |
| Avaliação | Testes comparativos acadêmicos confirmados; métricas, protocolo e amostra a detalhar, sem resultados presumidos. |

## Direção tecnológica

| Item | Situação |
| --- | --- |
| Backend e frontend | Escolhidos em 20/10/2026: NestJS no backend; React, Vite, Tailwind CSS e shadcn/ui no frontend. Substituem a direção anterior de Next.js. Na entrevista consolidada em 22/10/2026: Vite no frontend e Nest CLI no backend, sem exigir hospedagens ou repositórios separados. |
| Evolution API | Escolhida; uso via n8n ou integração direta pelo backend permanece aberto, conforme atualização de 20/10/2026. Configuração e versões a definir. |
| IA | OpenAI (“ChatGPT” no vocabulário da usuária) ou Gemini, escolha manual posterior por Taís conforme custo/facilidade. Gemini tem preferência experimental condicionada. |
| Dados | Supabase escolhido em 20/10/2026 para dados sobre PostgreSQL. TypeORM e migrações versionadas com `synchronize: false` confirmados em entrevista; modelagem física e versões exatas ainda pendentes. |
| Infraestrutura | Railway e Hetzner indicados pelo orientador; uso, composição e hospedagem definitiva pendentes. |
| Mapas e endereços | Provedor e método técnico de validação pendentes; Google Maps é possibilidade. |
| Login | Supabase Auth; e-mail/senha individual para toda a equipe, convite administrativo com senha definida pelo usuário e recuperação por e-mail. SDK no React e token validado pelo Nest; perfis e bloqueio de usuários no backend. Implementação e integração ainda não realizadas. |

Não houve verificação de preço, gratuidade, planos ou compatibilidade. Não presumir que assinatura ChatGPT cobre uso de API. Nenhuma contratação ou implementação realizada. Por orientação do orientador: todo backend primeiro, interfaces preparadas; integrações reais depois. Entradas simuladas são estratégia de validação, não prova de integração entregue.

## Consolidação da entrevista — 22/10/2026

As confirmações desta conversa fecham escolhas de planejamento, sem implementar o sistema. Não representam aprovação de todas as recomendações apresentadas no levantamento geral.

- **B00:** seleção concluída, com TDD nas regras críticas, SDD por pequenas tarefas e uso das skills conforme [registro](skills-desenvolvimento.md). Instalar shadcn/web-design-guidelines antes do frontend; revisar skills de integrações antes de B18.
- **Persistência:** TypeORM, migrações versionadas desde o início, `synchronize: false`. Selecionar e fixar versões estáveis compatíveis; ambiente PostgreSQL de desenvolvimento/testes isolado. Números exatos e modo de provisionamento ainda não definidos.
- **Tempo:** alterações ordinárias do aluno somente antes de 17:00:00; cancelamento de volta confirmada antes de 22:00:00, em America/Sao_Paulo. Vale o recebimento durável no backend antes da interpretação pela IA. Atraso da IA não altera esse instante; chegada após o limite não reabre a janela.
- **Duplicatas/ordenação:** não repetir efeitos; mensagem comprovadamente antiga não sobrescreve revisão mais recente. Ordem incerta gera pendência à equipe. O mecanismo concreto e a conciliação com fechamento concorrente serão detalhados nos contratos e testes, sem abrir confirmação tardia.
- **Acesso:** Supabase Auth com e-mail/senha, sem cadastro público. Admin envia convite; usuário define senha. Recuperação por link ao e-mail cadastrado não reativa desativado. SDK Supabase no React envia token ao Nest, que verifica autenticidade/validade, vínculo ativo e permissões locais. Saída explícita; duração/inatividade ainda dependem de verificação técnica, sem presumir recursos de plano.
- **Admin inicial e exceções:** primeiro administrador por procedimento controlado; convite inválido/expirado com orientação e reenvio pelo admin; perda/erro de e-mail atendido pelo admin com verificação da pessoa. Detalhes dos procedimentos ainda serão especificados, sem cadastro público.
- **Vigências:** datas inicial e final inclusivas; rejeitar datas invertidas e sobreposição para o mesmo aluno. Exemplo: 01 a 30/11 cobre ambos os dias; renovação seguinte pode começar em 01/12.
- **Sequência de execução:** backend completo primeiro, autorização com substituto controlado de autenticação para testes; Supabase Auth/SMTP e demais serviços reais conectados e validados depois. Simulação não comprova login, convite ou recuperação real.

Referências técnicas consultadas na entrevista: [Nest/TypeORM](https://docs.nestjs.com/data/typeorm), [migrações TypeORM](https://typeorm.io/docs/migrations/setup/), [sessões Supabase](https://supabase.com/docs/guides/auth/sessions), [convites](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), [recuperação](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [envio de e-mail](https://supabase.com/docs/guides/auth/auth-smtp). Não equivalem a validação de versões/compatibilidade do projeto.

## Pendências

Registro histórico de planejamento em 22/10/2026 (aprovação e execução posteriores registradas ao final): [constituição 1.0.0](../.specify/memory/constitution.md) preenchida e fluxo specify → plan → tasks exercitado para [B02](../specs/001-base-backend/spec.md). [Versões e provisionamento local](../specs/001-base-backend/research.md) são propostas técnicas para aprovação, não escolhas de produto reabertas nem ambiente instalado. Planeja-se PostgreSQL por dois clusters privados Windows, sem serviços externos. Aprovação de implementação ainda pendente conforme pedido de Taís. A pendência de preparar a constituição está resolvida; instalações de frontend continuam futuras.

1. **Preparação técnica após B01:** pesquisar e registrar versões compatíveis do primeiro bloco e definir como provisionar o PostgreSQL isolado de desenvolvimento/testes e executar migrações. As escolhas de autenticação, ORM/migrações e convenções de tempo já estão confirmadas; ver [situação de B01](backlog.md#situação-de-b01).
2. **Acessos:** duração/inatividade da sessão, detalhes de criação do primeiro admin, reenvio e verificação em troca/perda de e-mail. Especificar nos módulos de acesso e validar serviço, URLs de retorno e envio SMTP em B18; não reabrir o provedor ou o método de login.
3. **Antes dos respectivos módulos:** representação/canonicalização de regiões e endereços; novo endereço válido na ordem do plano B e tratamento até ordenar (resolvidos em B16 abaixo); disponibilidade por etapas/janelas; recuperação de lembretes após indisponibilidade (resolvida em B14 abaixo); janela operacional consultável (resolvida em B15 abaixo); desativação de cadastros referenciados e retenção mínima. As recomendações gerais sobre esses itens continuam propostas, não decisões confirmadas.
4. **Integrações:** Evolution API direta ou n8n, IA OpenAI/Gemini, mapas/validação/cálculo, infraestrutura, conexão remota PostgreSQL, SMTP e parâmetros dos serviços. Integração direta foi recomendada, não aprovada. Avaliar viabilidade do trajeto automático durante o backend, preservando a prioridade e a contingência.
5. **Dados operacionais:** empresa preencher origem comum, regiões/grupos, pontos, frota, motoristas, alunos/vigências e calendários reais; não são novas decisões de escopo.
6. **Acadêmico:** métricas/protocolo/amostra dos testes comparativos, prazo próprio do texto, dia específico da defesa e reunião com o orientador. Revisar viabilidade das metas sem alterá-las silenciosamente.
7. **Ferramentas:** instalação futura das duas skills selecionadas de frontend; constituição do Spec Kit preenchida e utilizada em B02. Identificação da ferramenta específica mencionada pelo orientador continua incerta, sem bloquear as escolhas já confirmadas.

A sequência de locais usa dias de uso confirmado do trecho, considerando cancelamentos, pois não existe presença comprovada. Dias sem uso não quebram sequência; outro local reinicia.

## Referência técnica — PRM 2026

Projeto local indicado por Taís em 20/10/2026: `C:/Users/taisr/Documents/PRM - 2026`. Está em desenvolvimento. Inspeção estática dos manifestos, configurações e exemplos de código; sem executar aplicação/testes, acessar banco, ler credenciais ou modificar arquivos externos. Referência para organização e aprendizado, sem comprovar prontidão ou compatibilidade de versões.

| Evidência inspecionada no PRM | Uso como referência no TechBus |
| --- | --- |
| `menu-backend/package.json`, `src/main.ts` e `src/cases/spots/`: NestJS, módulos, controllers, services, entidades e DTOs por funcionalidade. | Orientar organização modular do backend; adaptar às regras e contratos próprios do TechBus. |
| `menu-backend/src/app.module.ts`: TypeORM com PostgreSQL e conexão por variável de ambiente. | TypeORM posteriormente escolhido por confirmação explícita de Taís; não copiar versões nem synchronize: true do PRM. Supabase foi informado por Taís como parte da arquitetura, mas o provedor da conexão não foi verificado nesta leitura, que não acessou segredos. |
| `menu-frontend/vite.config.ts`, `package.json` e `components.json`: React/Vite, Tailwind CSS e shadcn/ui. | Referência concreta da stack escolhida. No PRM, Vite está no frontend e o backend usa os comandos Nest; não foi identificado uso de Vite no backend nos arquivos inspecionados. |
| `menu-frontend/src/cases/spots/`, `src/lib/axios.ts` e `src/main.tsx`: DTOs, serviços HTTP, hooks e componentes; Axios e TanStack React Query. | Avaliar organização por funcionalidade e acesso à API. Axios e React Query são candidatos, não novas escolhas definitivas. |

Limites observados: configuração de banco com `synchronize: true`, sem migrações localizadas no inventário; bootstrap sem ValidationPipe global; exemplo de teste e2e ainda espera `Hello World!`, enquanto AppModule não registra controller raiz. Há detalhes incompletos nos exemplos, como `@Delete('id')` em spots e `aplication/json` no cliente HTTP. Esses trechos exigem revisão antes de eventual reaproveitamento; não foram corrigidos no PRM nem executados para diagnóstico completo.

A referência não fecha autenticação, permissões, migrações, integrações Evolution API/n8n ou requisitos específicos de concorrência e horários do TechBus. A seleção B00 foi posteriormente concluída por confirmação explícita na entrevista; a referência isoladamente não aprovou ferramentas ou configurações.

## Histórico superado — não aplicar

- Em 20/10/2026, NestJS e React/Vite/Tailwind CSS/shadcn/ui substituíram a direção anterior React/Next.js; Supabase passou de provável a escolhido. A obrigatoriedade anterior de n8n foi reaberta: Evolution API pode ser integrada via n8n ou diretamente, a definir.
- Aprovação de ida tardia e indefinição de nova volta tardia: substituídas pelo bloqueio de alterações do aluno após 17h, exceto cancelamento de volta até 22h. Correção pela equipe é fluxo separado.
- Dois lembretes e horários indefinidos: substituídos pela consulta 05h e três lembretes 11h/13h/16h.
- Toda indecisão de volta excluída da capacidade: substituída pela volta padrão às 17h quando ida está confirmada e não há recusa explícita. Não respondentes continuam excluídos.
- Aprovação individual da empresa para qualquer endereço de volta: substituída por aceitação automática dentro da área atendida, com método técnico ainda aberto.
- Recomendação local, agrupamento automático e equilíbrio de tempos: descartados. Veículos locais e grupos são manuais.
- Cálculo automático tratado como extra adiado desde o início: substituído por alta prioridade com plano B só se necessário.

## Comparação com a proposta aprovada

Fonte preservada: C:/Users/taisr/Downloads/PROPOSTA TAÍS A. ROSIN - SISTEMA PARA GESTÃO DE TRANSPORTE UNIVERSITÁRIO.pdf. Leitura registrada em 13/10/2026; PDF original intacto. Título: “Sistema para Gestão de Transporte Universitário - Controle de Demanda e Apoio à Tomada de Decisão”. Conversas antigas podem ser complementadas manualmente por Taís, sem bloquear este trabalho; não se presume consulta integral ao histórico.

Da introdução (páginas 2–3) vieram o problema das mensagens dispersas e a consolidação manual da demanda. Dos objetivos e metodologia (páginas 4–6), o sistema de apoio à decisão, levantamento do processo/requisitos e avaliação do protótipo. A proposta caracteriza pesquisa aplicada/exploratória com pesquisa bibliográfica e estudo de caso; isso descreve o plano acadêmico, não etapas já executadas.

| Proposta | Consolidação atual |
| --- | --- |
| Python e framework escrito “FasAPI”, HTML/CSS/JS (página 8) | Direção atual: NestJS no backend e React/Vite/Tailwind CSS/shadcn/ui no frontend. |
| Banco relacional/PostgreSQL (páginas 5, 7–8) | Supabase escolhido para dados sobre PostgreSQL; TypeORM e migrações versionadas confirmados; modelagem física pendente. |
| WhatsApp Business Platform e chatbot por regras (página 8) | Evolution API escolhida; n8n ou integração direta ainda a definir; IA OpenAI ou Gemini ainda a escolher. Não presumir equivalência técnica entre modalidades. |
| Veículos, capacidade, recomendação e regiões (páginas 6 e 8) | Recomendação somente intermunicipal por universidade, max(ida, volta); grupos/veículos locais manuais; frota insuficiente resolvida pela empresa. |
| Comparação antes/depois: consolidação, inconsistências e esforço (páginas 5 e 8–9) | Avaliação comparativa confirmada. Indicadores citados são referências para detalhar métricas/protocolo/amostra, sem ganhos medidos ou estimativa de horas de desenvolvimento. |
| Cerca de 250 estudantes e mais de 5 veículos (página 2) | Contexto da proposta, sem nova verificação; não fixa volume de testes, desempenho ou garantia de capacidade local. |
| Fluxos e cronograma gerais (páginas 6 e 9) | Regras atuais deste conjunto prevalecem, incluindo 17h/22h, padrões de volta, locais, calendários e perfis. Plano por datas e defesa 30/11–05/12/2026. |

Estatísticas e bibliografia da proposta não foram verificadas externamente nesta revisão; não são resultados do sistema. A documentação registra a evolução do recorte sem alegar avaliação já realizada.

## Execução autorizada de B02 — 22/10/2026

Base local implementada sob autorização explícita, seguindo constituição, spec, plan e 18 tarefas. [Evidências](../specs/001-base-backend/verification.md) e [guia executável](../specs/001-base-backend/quickstart.md). Preparação remanescente de B01 realizada.

Node 24.22.1, npm 11.17.0, Nest 11.2.7 (CLI 11.0.10), TypeScript 5.8.3, TypeORM 0.3.31, @nestjs/typeorm 11.0.0 e pg 8.16.3 fixados. Patches Nest/TypeORM corrigiram achados da auditoria runtime; pesquisa preserva pins inicialmente propostos e motivo da atualização. Ajustes auxiliares de lint/tipos/testes corrigiram compatibilidade, sem troca de arquitetura.

PostgreSQL 17.11 privado por ZIP Windows, dois clusters loopback separados (55432 dev, 55433 teste), sem serviço global. Credenciais sintéticas distintas, aplicação sem DDL/superusuário, migrações com papel próprio, synchronize=false/migrationsRun=false. Não altera escolha de Supabase para a integração futura nem decide hospedagem.

Entregues live/ready, configuração restrita local, fatia HTTP/caso de uso/portas/adaptadores, Clock substituível e conversão America/Sao_Paulo. Fixture reversível exclusivamente de teste; modelo físico de negócio ainda aberto. [Entrada para B03](../specs/001-base-backend/next-b03.md) preparada sem implementar autorização. Pendências de serviços, sessões, mapas e infraestrutura permanecem.

## B03 — decisões e autorização em 22/10/2026

Taís aceitou conjuntamente: três perfis fixos (admin, operador, motorista), sem permissões personalizadas; exatamente um perfil por usuário; múltiplos administradores permitidos, com bloqueio da desativação/retirada de perfil do último administrador ativo, inclusive por ele próprio. Regras detalhadas em [spec B03](../specs/002-autorizacao-equipe/spec.md).

Após respostas de negócio, implementação integral da B03 autorizada: specify → plan → tasks → implement, sem nova aprovação a cada tarefa ou detalhe técnico, testes e documentação incrementais. Reutilizar decisões, reunir dúvidas relevantes numa única mensagem e evitar relatórios rotineiros extensos. Interromper por dúvida de negócio não resolvida, risco importante ou ação potencialmente destrutiva. B18/serviços reais continuam fora desta autorização.

### Resultado da B03

Autorização local implementada e validada: 13 tarefas, 72 testes totais (42 adicionados ao conjunto B02), tipos/build/lint aprovados. [Evidências](../specs/002-autorizacao-equipe/verification.md). Sem novas dependências. Tabela mínima de equipe, migração explícita e papel de aplicação restrito; nenhuma senha/token armazenado, seed de usuários somente em testes. Concorrência preserva último admin e revalida ator. Supabase/Auth/SMTP, configuração real de sessão e consultas reais de viagens continuam fora desta entrega. Na conclusão da B03, o próximo incremento era B04; resultado posterior abaixo.

## B04 — decisões e implementação em 23/10/2026

Taís confirmou conjuntamente as duas recomendações: (1) aluno inativo não recebe consultas automáticas nem novas confirmações, mesmo com contrato vigente; cadastro/vigências e confirmações existentes são preservados, estas ajustadas manualmente pela equipe; (2) zero dias habituais é válido para uso somente extra, sem consultas habituais automáticas, sujeito a vigência, operação da universidade e prazo. Resposta autoriza implementação integral conforme fluxo acordado após dúvidas de negócio.

[Spec B04](../specs/003-cadastros-vigencias/spec.md), plano e tarefas seguem Spec Kit, aproveitando R01/R02. Catálogo fixo Unimater/Unidep, alunos, primeira vigência atômica, renovação/edição, telefone normalizado único e revisões. Sobreposição protegida por transação e bloqueio do aluno; SQL administrativo deve respeitar o mesmo protocolo. Nenhuma extensão nova de PostgreSQL. Datas inclusivas e verificação cadastral interna usam relógio operacional existente. Dias habituais vazios são aceitos; nenhuma alteração cancela confirmações ou envia mensagem.

13 tarefas; 110 testes totais (38 novos), com [evidências](../specs/003-cadastros-vigencias/verification.md). Mesmas versões, dependências e infraestrutura B02/B03; migração apenas nos dois clusters locais. Auth/Supabase reais não utilizados. Verificação cadastral não é elegibilidade completa nem autorização definitiva de confirmação: calendário em B05; locais padrão em B06; jornada e consumidores de consulta/confirmação nos incrementos próprios. Na conclusão da B04, próxima etapa B05; resultado posterior abaixo.

## B05 — decisão e implementação em 23/10/2026

Taís confirmou que correções de calendário valem imediatamente para novas avaliações, preservando confirmações existentes para ajuste manual, sem envio automático ou reabertura de prazo. Confirmação autorizou implementação integral conforme fluxo acordado.

[Spec e plano B05](../specs/004-calendarios-elegibilidade/spec.md): semana habitual e exceções por universidade, precedência da exceção, revisão compartilhada para evitar sobrescrita concorrente. Calendário sem configuração não presume operação; nenhuma semana real foi cadastrada. Restabelecer regra semanal preserva registro da exceção com decisão de herança, sem exclusão automática.

Elegibilidade interna combina cadastro ativo, vigência inclusiva e operação; consulta habitual exige dia habitual, pedido extra dispensa esse dia e exige recebimento antes de 17:00:00 em America/Sao_Paulo. Relógio substituível, instante recebido preservado frente à interpretação tardia. Avaliação não confirma viagem nem autoriza reutilização posterior sem revalidação transacional. Jornadas/agendamentos e recepção durável continuam nos incrementos próprios.

10 tarefas concluídas; 132 testes totais (22 novos), build/lint/tipos aprovados. [Evidências](../specs/004-calendarios-elegibilidade/verification.md). Migrações em PostgreSQL local dev/test, sem dependências novas, mudança de Supabase/infraestrutura ou serviços reais. Na conclusão da B05, próxima etapa B06; resultado posterior abaixo.

## B06 — decisões e implementação em 23/10/2026

Taís confirmou conjuntamente: ponto de embarque vinculado a um único grupo de coleta e região atendida a um único grupo de distribuição; um grupo pode reunir vários pontos/regiões. Desativar ponto, região ou grupo referenciado é permitido, preserva padrões/confirmações existentes, bloqueia novas utilizações e sinaliza ajuste manual. Nenhuma substituição ou mensagem automática.

[Spec B06](../specs/005-grupos-locais/spec.md), plano e tarefas seguem essas decisões. Cadastro manual por sentido, padrões independentes com revisão e registro da origem/referência de pedido ou consentimento. Cadastro inicial não pode ser reutilizado para sobrescrever padrão existente. Local de retorno identificado pela chave canônica do adaptador, sem fundir grafias por suposição. Endereço fora da área, ambíguo, indisponível ou com vínculos inativos não substitui informação válida.

Validação real de endereço permanece indisponível no runtime; testes substituem a porta com evidências sintéticas. Sem provedor de mapas, geometrias, credenciais ou serviço externo escolhidos. R01 tem estrutura de padrões implementada; uso real do desembarque depende da integração geográfica futura. Jornada diária B07/B08, sequência B10 e ordem/otimização B16 continuam fora da B06. Confirmações existentes ainda não são entidades implementadas; B06 não cria nem altera essas futuras jornadas.

10 tarefas, 150 testes totais (18 novos), build/lint/tipos aprovados. [Evidências](../specs/005-grupos-locais/verification.md). Migração explícita em dev/test locais, aplicação sem DELETE/DDL, nenhuma dependência nova ou mudança de PostgreSQL/Supabase/infraestrutura. Próxima etapa B07 — jornada e comandos explícitos.

## B07 — decisões e implementação em 23/10/2026

Taís confirmou conjuntamente: “vou” após “só ida” preserva recusa de volta até alteração explícita desse trecho; intenção explícita sem local válido conta na demanda, com pendência obrigatória antes de concluir o planejamento operacional. Sem local inventado ou validação presumida.

[Spec, plano e tarefas B07](../specs/006-jornada-comandos/spec.md) reutilizam B04–B06. Jornada única por aluno/dia, estados/origens por sentido, locais diários separados dos padrões, elegibilidade revalidada na transação e leitura administrativa apenas do dia. Recebimento interno durável antecede interpretação; repetição não reaplica, comando antigo não vence revisão e ordem incerta gera pendência. Mudança de universidade sinaliza ajuste sem mover contexto diário.

Comandos permanecem internos até identificação confiável na integração futura; não há endpoint público de personificação, WhatsApp/IA reais ou mapas. Fechamento das 17h e cancelamento até 22h ficam B08; tratamento ampliado de eventos externos/concorrência, B09. Confirmação sem local não autoriza concluir planejamento; bloqueio operacional será consumido em B12. [Evidências](../specs/006-jornada-comandos/verification.md). Próxima etapa B08.
B07 verificada: 11 tarefas, 182 testes totais (32 novos), build/lint/tipos aprovados. Migração em dev/test locais, sem registros sintéticos remanescentes.

## B08 — decisão e implementação em 24/10/2026

Taís confirmou: perda de elegibilidade antes do fechamento impede nova volta padrão; preservar confirmações existentes e sinalizar ajuste manual. Repetição do fechamento não cria nova confirmação após reativação; nova informação tempestiva válida é conciliada na sua revisão, com revalidação atual.

[Spec B08](../specs/007-fechamento-cancelamento/spec.md), plano e tarefas reutilizam B07. Fechamento por jornada e lote limitado, origem padrao_fechamento, cancelamento no intervalo [17h,22h) e reconciliação pelo recebimento durável. Recusa tempestiva prevalece sobre derivação de fechamento; atualização anterior da ida não restaura volta cancelada. Cancelamento que depende de interpretação anterior fica registrado e é conciliado, sem presumir confirmação. Locais ausentes/inativos continuam pendência, sem retirar intenção da demanda.

Executor e comandos são internos; leitura administrativa atual mostra origem, pendências e orientação determinística para o aluno. Nenhuma mensagem foi enviada e nenhum cron/agendador real foi instalado. B14/B18 tratarão execução agendada/integrações; B09 ampliará evidências de ordenação externa, falhas e concorrência. Migração aditiva preserva B07 e recusa reversão com dados B08 que seriam perdidos. [Evidências](../specs/007-fechamento-cancelamento/verification.md). Próxima etapa B09.
B08 verificada: 10 tarefas, 210 testes totais (28 novos), build/lint/tipos aprovados. Migração em dev/test locais, sem pendências ou registros sintéticos remanescentes.

## B09 — implementação em 24/10/2026

Reutilizadas as decisões de recebimento durável, idempotência e ordem incerta, sem novas regras de negócio. [Spec B09](../specs/008-idempotencia-concorrencia/spec.md): entrada interna `receiveUnordered`, recuperação transacional e lote com resultados `processed`/`failed`, incluindo pendências. Processado não significa planejamento operacional aprovado.

Falhas injetadas pela porta de persistência nos testes usam transações PostgreSQL reais: recibo, jornada e resultado não deixam efeitos parciais. Reentrega conserva o primeiro recebimento efetivamente durável; concorrência não duplica demanda nem restaura volta cancelada. Sem migração, dependência ou alteração de infraestrutura.

O refinamento de ordenação externa nesta etapa é encaminhar entrada sem prova para pendência. Identificação, envelope e prova do provedor serão implementados em B18; não foram inventados contratos da Evolution API. [Evidências B09](../specs/008-idempotencia-concorrencia/verification.md). Próxima etapa B10.

## B10 — decisões confirmadas e implementação local

Confirmado B10: após recusa, não repetir sugestão na mesma sequência; outro local e quatro novas utilizações do alternativo permitem nova proposta. Uso confirmado sem local identificado suspende a sugestão até resolução e recálculo, preservando a confirmação na demanda.

[Especificação](../specs/009-padroes-sequencia/spec.md), plano e tarefas reaproveitam B06–B09. Sequências derivadas das jornadas atuais, uma contribuição por data/trecho; cancelamento e revisão recalculam sem duplicar registros. Aceite/pedido explícito registra evidência e altera somente o padrão, preservando jornada do dia. Leitura administrativa atual protegida; comandos internos usam recibo durável e prazo anterior às 17h. Mensagens/identidade real continuam B14/B18. Nova tabela mínima de decisões com migração aditiva e reversão bloqueada quando houver evidências. [Verificação](../specs/009-padroes-sequencia/verification.md).

## B11 — disponibilidade e frota

Decisões B11 confirmadas em 25/10/2026: disponibilidade por faixas de início/fim informadas pela empresa e associadas às etapas; ciclo intermunicipal inclui ida, permanência e retorno. Programação semanal por veículo, com exceção por data prevalecendo. Sem configuração, não presumir disponibilidade.

[Spec B11](../specs/010-frota-disponibilidade/spec.md), plano e tarefas reutilizam autorização/cadastros existentes. Veículos e motoristas são cadastros operacionais; cadastrar motorista não cria login nem concede acesso. Avaliação de propostas verifica disponibilidade integral, grupos/motoristas ativos e sobreposições do lote; mesmo veículo intermunicipal e motoristas por trecho. Não reserva recursos nem confirma planejamento; B12 revalidará contra ocupações persistidas, inclusive datas adjacentes. [Evidências](../specs/010-frota-disponibilidade/verification.md).

## B12 — alocação e planejamento

Confirmado por Taís em 25/10/2026: opções/rascunhos podem ser consultados antes das 17h; confirmação definitiva somente após fechamento e resolução das pendências. A empresa pode escolher manualmente veículo maior disponível/suficiente; o menor adequado continua recomendado, com equivalentes.

[Spec B12](../specs/011-alocacao-planejamento/spec.md) implementa demanda por universidade/grupo, rascunho versionado e confirmação transacional. Locais inválidos não reduzem demanda; impedem confirmação. Troca de rascunho preserva a fotografia e ocupações anteriores até confirmação válida. Cancelamento/alteração de jornada sinaliza revisão, sem trocar veículo nem gerar mensagem. Conflitos de veículo/motorista incluem datas adjacentes; reuso posterior permitido. [Evidências](../specs/011-alocacao-planejamento/verification.md). Correções da equipe permanecem B13; infraestrutura e integrações reais inalteradas.

## B13 — correções da equipe
Confirmado por Taís: correção altera apenas os trechos selecionados, sem inferir volta pela ida manual; a equipe pode encerrar pendências anteriores depois de revisá-las explicitamente e registrar justificativa. Mensagens antigas revisadas não desfazem a correção; novo cancelamento válido do aluno continua permitido.

[Spec B13](../specs/012-correcoes-equipe/spec.md) reutiliza autorização, jornada, elegibilidade, locais, sequências e planejamento. Registro mínimo identifica origem da equipe, responsável, instante e motivo. Revisões concorrentes e reenvios são protegidos; correção com excesso sinaliza ajuste e preserva ocupações até substituição válida. Não gera WhatsApp automático, muda padrões silenciosamente ou contorna elegibilidade. [Evidências](../specs/012-correcoes-equipe/verification.md).

## B17 — revisão integrada do backend
Revisão técnica autorizada em 26/10/2026, sem nova regra de negócio. A [matriz R01–R22/O01](../specs/016-revisao-backend/coverage.md) vincula evidências locais e dependências externas. O cenário integrado exercita falha de envio, resposta recebida no prazo e interpretada após fechamento, planejamento, correção de endereço, publicação e cancelamento.

Corrigido filtro que retirava indevidamente aluno confirmado do trecho intermunicipal quando seu ponto local era desativado. Conforme B15, universidade/sentido inequívocos preservam o passageiro com local pendente e alerta; associação local inválida continua fora da lista local até ajuste. Não há troca automática de grupo ou veículo. [Verificação B17](../specs/016-revisao-backend/verification.md).

## B16 — trajeto e contingência
Confirmado por Taís em 26/10/2026: local novo é inserido manualmente pela equipe na ordem; enquanto houver local confirmado sem posição, não publicar itinerário completo. Preservar passageiro, demanda e alocação. Alterar ordem padrão exige nova publicação explícita para atualizar a orientação do motorista; até lá, manter última ordem publicada com alerta. Cancelamentos filtram paradas sem passageiros imediatamente.

Ordem por grupo/sentido e publicação por data/grupo são separadas. Publicação revalida prévia, revisão e planejamento confirmado; substituição confirmada do planejamento exige publicação compatível. Autorização/janela B15 preservadas. Preparação automática usa contrato interno e teste simulado de permutação exata, sem dados pessoais ou publicação automática. Viabilidade condicionada a fornecedor, resolução geográfica, âncoras e validação viária em B18; nenhuma integração real ou decisão de abandonar O01. [Spec](../specs/015-trajeto-contingencia/spec.md), [pesquisa](../specs/015-trajeto-contingencia/research.md) e [verificação](../specs/015-trajeto-contingencia/verification.md).

## B15 — consultas operacionais e motorista
Confirmado por Taís em 26/10/2026: consultar a data atual e a operação anterior enquanto houver trecho confirmado ainda não encerrado pelo horário previsto, inclusive após meia-noite. Isso não cria histórico pesquisável nem reabre prazos de comandos.

Durante revisão, preservar veículo/trecho confirmado com alerta; retirar cancelados imediatamente e mostrar os demais confirmados atuais somente quando a associação ao trecho for inequívoca. Mudança de grupo não transfere automaticamente passageiros entre trechos locais; intermunicipal mantém associação por universidade/sentido. Ambiguidades ficam para a equipe. Vínculo exclusivo conta/motorista é explícito e gerenciado somente pelo admin. [Spec B15](../specs/014-consultas-operacionais/spec.md).

## B14 — mensagens e agendamentos simulados
Confirmado por Taís em 26/10/2026: após indisponibilidade, recuperar somente o contato mais recente ainda pertinente antes das 17h, sem acumular anteriores; após 17h não recuperar consultas/lembretes. Extra válido iniciado pelo aluno recebe os próximos lembretes de trechos pendentes, sem consulta inicial em dia não habitual.

[Spec B14](../specs/013-mensagens-agendamentos/spec.md) reutiliza calendário, jornada, fechamento e autorização. Mensagens e tentativas são persistidas antes do adaptador, com revalidação no despacho e retry administrativo versionado. Falha não altera viagem; sending/unknown exigem reconciliação futura, sem reenvio cego. Primeiro recebimento elegível identifica quais lembretes são posteriores ao extra; correção manual preserva esse marcador e não dispara comunicação. Porta padrão desabilitada e executor interno simulável, sem cron ou fornecedor conectado. [Evidências](../specs/013-mensagens-agendamentos/verification.md). Próxima etapa B15.
