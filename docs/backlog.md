# Backlog técnico proposto

[Início](../README.md) · [Arquitetura](arquitetura.md) · [Dados](modelo-dados.md) · [API](api.md) · [Backlog](backlog.md) · [Regras](requisitos.md)

B00 e preparação B01 concluídas; B02 implementada localmente, com [evidências](../specs/001-base-backend/verification.md). B03 concluída quanto à autorização local, com [evidências](../specs/002-autorizacao-equipe/verification.md); B04 concluída localmente em [cadastros/vigências](../specs/003-cadastros-vigencias/verification.md); B05 concluída localmente em [calendários/elegibilidade](../specs/004-calendarios-elegibilidade/verification.md); B06 concluída localmente em [grupos/locais](../specs/005-grupos-locais/verification.md); B07–B20 ainda não implementadas. Ordem segue dependências; não substitui o [plano por datas](plano-desenvolvimento.md), não estima horas nem garante prazo. Regras R01–R22 e O01 permanecem fonte de aceitação.

| Ordem | Tarefa pequena | Depende de | Critério de conclusão futura |
| --- | --- | --- | --- |
| B00 | Seleção de skills e método — concluída | — | Conjunto, finalidade e lacunas registrados em [skills](skills-desenvolvimento.md). TDD crítico e SDD por tarefa aprovados. Instalações de frontend e seleção específica de integrações programadas para suas etapas, sem bloquear B00. |
| B01 | Escolhas mínimas do primeiro bloco — concluídas | B00 | Supabase Auth, TypeORM/migrações e convenções de tempo registrados. Preparação técnica executada em B02; ver situação abaixo. |
| B02 | Estruturar módulos e contratos internos — implementado | B01 | Entrada, casos de uso, regras e repositórios separados; relógio substituível; nenhuma integração externa real. |
| B03 | Implementar autorização de papéis — concluída localmente | B02 | Admin exclusivo para convites/perfis/configurações; operador não escala privilégios; motorista não consulta viagem alheia. R20. |
| B04 | Cadastros de universidade, aluno e vigência — concluída localmente | B03 | Catálogo fixo, telefone único, contrato só datas e verificação interna de cadastro/vigência. Padrões de locais entregues em B06, com validação geográfica real ainda pendente; consumidores de consultas/confirmações ainda futuros. |
| B05 | Calendários e elegibilidade — concluída localmente | B04 | Semana e exceções por universidade; habitual/extra; contrato e operação obrigatórios, sem operação não confirma. R03. |
| B06 | Grupos e locais — concluída localmente, validação geográfica simulada | B05 | Grupos manuais por sentido, embarque pré-cadastrado, contrato de validação de endereço simulado, inválido preserva válido. R12/R14/R15. |
| B07 | Jornada e comandos explícitos | B06 | Estados por sentido, última informação válida, “vou”, só ida/só volta, recusa e indecisão; incompreensão não confirma. R05/R06/R08. |
| B08 | Fechamento e cancelamento | B07 | Volta padrão só com ida confirmada sem recusa; origem marcada; não respondente excluído. Bloquear nova confirmação/troca após 17h e permitir só cancelar volta até 22h. R07/R09/R10. |
| B09 | Idempotência e concorrência da jornada | B08 | Duplicatas não repetem efeito; fechamento repetido não desfaz cancelamento; versão velha não vence revisão; testar limites do relógio. |
| B10 | Padrões e sequência de locais | B09 | Contar uma contribuição por data/trecho confirmado; cancelamento/revisão recalcula; quarta sequência sugere, só aceite/pedido muda padrão. R13/R22. |
| B11 | Frota, disponibilidade e etapas | B06 | Assentos passageiros e tipos; mesmo veículo ida/permanência/retorno; motorista por trecho; reuso local posterior. R14/R18. |
| B12 | Recomendação e confirmação da alocação | B09, B11 | max(ida,volta), equivalentes, menor suficiente, empresa confirma; duas confirmações simultâneas não duplicam veículo; insuficiência não reparte automaticamente. R16/R17. |
| B13 | Correções da equipe | B12 | Após 17h permitidas a admin/operador; excesso invalida planejamento até ajuste; não cria mensagem automática. R11. |
| B14 | Mensagens persistentes e agendamentos simulados | B09 | 05h/11h/13h/16h, só elegíveis/pendentes, lembrete só volta quando necessário; falha não apaga confirmação, reenvio não duplica efeitos. R04/R19. |
| B15 | Consultas operacionais e motorista | B13, B14 | Painel atual com origens/falhas/pendências; motorista só atribuições com telefones; sem histórico público. R19/R20/R22. |
| B16 | Trajeto e contingência | B06, B12 | Contrato do automático preparado e viabilidade avaliada; plano B preserva ordem filtrada, local novo fica identificado até regra de inserção definida. R21/O01. |
| B17 | Revisão integrada do backend | B10, B15, B16 | Casos críticos de requisitos e autorização/concorrrência demonstrados com entradas simuladas; documentar lacunas. Só marcar backend completo se critérios satisfeitos. |
| B18 | Conectar serviços externos | B17 | Evolution API (via n8n ou integração direta, a definir), IA escolhida por Taís e demais serviços necessários conectados e validados; segredo restrito, comando validado pelo backend, sem acesso direto da IA ao banco. |
| B19 | Painel e validação ponta a ponta | B18 | Fluxos reais e permissões verificados; registrar automático ou ativação de plano B, limitações e evidências. |
| B20 | Avaliação acadêmica e preparação | Protocolo definido; B19 para resultados reais | Comparar conforme métricas/amostra acordadas; não presumir ganhos. Documentação incremental desde B01, consolidação/ensaio na reserva. |

## Primeiro bloco recomendado

B00 concluída quanto à seleção, conforme [skills](skills-desenvolvimento.md). Instalação não significa implementação do TechBus. TDD crítico e SDD por tarefa confirmados; preparação técnica realizada em B02, preservando escolhas mínimas de B01.

Na seleção de skills de B00 e nas escolhas de B01, considerar a [referência PRM 2026](decisoes.md#referência-técnica--prm-2026), sem copiar configurações incompletas nem assumir suas bibliotecas e versões como obrigatórias.

Preparação técnica e base B02 executadas. O bloco B02–B05 compreende: base modular, acesso da equipe, cadastros, vigências e elegibilidade de calendário. Entrega verificável: uma equipe autorizada cadastra um aluno e o backend determina corretamente se deve consultar naquele dia; telefone desconhecido, contrato encerrado e ausência de operação não confirmam uso. Este bloco não conecta WhatsApp/IA nem cria financeiro ou histórico.

## Decisões técnicas mínimas e posteriores

Autenticação (Supabase Auth), persistência (TypeORM/migrações) e convenções de tempo estão confirmadas em [decisões](decisoes.md#consolidação-da-entrevista--22102026). Contratos, endpoints e esquema físico seguem detalhamento incremental; dependências do backend fixadas no lockfile de B02.

Antes dos respectivos módulos: representação de regiões e canonicalização de endereços, inserção de novo local na ordem do plano B, disponibilidade por janelas/etapas e retenção mínima. IA, mapas, infraestrutura, versões e parâmetros de serviços podem ser escolhidos antes de B18; não bloqueiam desenho ou testes simulados das regras.

Backend 08/11, funcional 22/11, reserva 23–29/11 e defesa 30/11–05/12/2026 continuam metas sujeitas a revisão. Não aumentar promessa para acomodar o backlog: se trabalho exceder a janela, comunicar e replanejar com o orientador, preservando requisitos essenciais e priorizando o trajeto automático com contingência aprovada.

## Situação de B01

Atualização de execução em 22/10/2026: preparação aprovada e realizada em B02, conforme [pesquisa](../specs/001-base-backend/research.md), [tarefas](../specs/001-base-backend/tasks.md) e [verificação](../specs/001-base-backend/verification.md). Os números 001/T001 não renumeram B00–B20.

- [X] Versões exatas do backend fixadas e verificadas por instalação/build/testes. Frontend e serviços externos ficam para suas etapas.
- [X] PostgreSQL 17.11 provisionado em dois clusters locais privados; migrações explícitas, usuários distintos e isolamento verificados. Sem Supabase real.

Já aprovados: Supabase Auth com SDK no React/token no Nest, perfis locais e bloqueio de desativados; TypeORM com synchronize: false; migrações versionadas; corte exato e recebimento durável antes da IA; deduplicação e proteção contra eventos antigos; ambiente isolado e versões compatíveis como diretriz. Vigência inclusiva e rejeição de sobreposições também confirmadas para B04.

Detalhamento de autenticação (expiração/inatividade e procedimentos de admin inicial/reenvio/troca de e-mail) pertence a B03, com configuração real e SMTP em B18. Ordenação técnica/fechamento concorrente deve ganhar casos de aceitação em B08/B09. São refinamentos de módulos, não novas escolhas de provedor/ORM nem motivo para antecipar integrações. Essas duas entregas são preparação para implementação, não novas decisões de produto nem ampliação do critério original de B01. A conclusão documental de B01 não autoriza implementação sem novo pedido.
