# Plano de desenvolvimento

[Início](../README.md) · [Escopo](escopo.md) · [Requisitos](requisitos.md) · [Fluxos](fluxos.md) · [Decisões](decisoes.md) · [Plano](plano-desenvolvimento.md)

TechBus — Sistema para gestão de transporte universitário. Plano por faixas de datas, sem estimativa de horas. Considera maior disponibilidade de Taís nos fins de semana. Metas sujeitas a revisão, não garantia de esforço suficiente ou prazo; base B02 e autorização B03 implementadas localmente; demais módulos seguem planejados.

## Marcos e sequência

**B00, preparação B01 e base B02 concluídas.** Resultados no [registro B02](../specs/001-base-backend/verification.md). B03 concluída com [13 tarefas e validação local](../specs/002-autorizacao-equipe/verification.md). Próxima especificação: B04. Não altera os marcos de entrega.

Por orientação do orientador, concluir todo o backend do escopo vigente até **08/11**, preparado para interfaces de integração; conectar serviços reais depois. Backend NestJS e frontend React com Vite, Tailwind CSS e shadcn/ui escolhidos em 20/10/2026. Preparação documental de acessos e ferramentas pode ocorrer antes; integração real não.

Meta funcional e congelamento em **22/11**; reserva **23 a 29/11**; defesa **30/11 a 05/12/2026**. Data do texto acadêmico e reunião com o orientador pendentes. Os módulos de calendário, vigência, perfis, padrões de locais e recomendação aumentam o trabalho do backend e sua validação: revisar viabilidade conforme avanço, sem declarar marcos cumpridos por calendário.

## Entregas previstas em 2026

| Faixa de datas | Foco | Entrega e marco de conclusão |
| --- | --- | --- |
| 12 a 18 de outubro | Consolidar regras e direção técnica; desenhar dados/interfaces; preparar documentalmente acessos. | Representar alunos/vigências, calendário universitário, dias habituais, grupos por sentido, locais/padrões, frota, motoristas e perfis. Registrar opções técnicas e pendências, inclusive novo local no plano B e avaliação acadêmica. |
| 19 a 25 de outubro | Cadastros, acessos e elegibilidade no backend. | Validar administração exclusiva de usuários/permissões, gestão operacional por admin/operador, leitura restrita do motorista, telefone cadastrado, contrato vigente e calendário/exceções. Sem financeiro, autocadastro ou histórico consultável. |
| 26 de outubro a 1 de novembro | Confirmações, locais e recomendação intermunicipal. | Simular respostas/revisões até 17h, volta padrão somente para ida confirmada, sem resposta excluído, cancelamento até 22h e correção manual da equipe. Validar área atendida, preservação do local válido, quarta utilização/consentimento, max(ida, volta), equivalentes e insuficiência simultânea. |
| 2 a 8 de novembro | Concluir backend e validação de R01–R22, com entradas simuladas. | Verificar 05h/11h/13h/16h, lembretes específicos, falhas/reenvio, resumo/encaminhamento, contagens, alocação, perfis e consultas do painel. Conferir bloqueio de confirmação tardia e ausência de WhatsApp automático em correção manual. Preparar interfaces externas e avaliar trajeto automático; se inviável/ameaçar prazo, registrar plano B. Marco só cumprido com backend validado. |
| 9 a 15 de novembro | Integrações reais após backend completo. | Integrar Supabase Auth e envio de e-mails de acesso, além de Evolution API, via n8n ou diretamente conforme decisão pendente, e IA escolhida depois por Taís entre OpenAI/Gemini; validar respostas, resumos, falhas e lembretes no canal real. Endereços/mapas e cálculo automático conforme definição técnica e prazo; se necessário, ativar plano B sem prometer otimização. |
| 16 a 22 de novembro | Painel conectado, perfis e validação ponta a ponta. | Verificar casos críticos de R01–R22, operação por universidade/etapa, capacidade, correções, locais e consultas do motorista. Registrar evidências, limitações e trajeto automático ou plano B. Preparar/executar avaliação comparativa conforme protocolo definido, sem presumir resultados. Meta funcional/congelamento em 22/11. |
| 23 a 29 de novembro | Reserva e preparação final. | Corrigir e verificar falhas, consolidar documentação/evidências e resultados disponíveis, apresentação e ensaio. Sem funcionalidades novas; replanejar com o orientador se correções excederem a reserva. |

## Acompanhamento e limites

Em 22/10/2026, implementada a [base B02](../specs/001-base-backend/plan.md) sob autorização, com 18 tarefas e validação local. Ver [evidências](../specs/001-base-backend/verification.md). Autorização local concluída em B03; cadastros e integrações reais permanecem para os próximos incrementos.

Produzir documentação incremental, incluindo decisões e evidências de validação, sem deixar toda escrita para a última semana. Detalhar cedo métricas, protocolo e amostra da comparação acadêmica confirmada. Revisão de conversas antigas por Taís não bloqueia esta documentação.

Se backend atrasar, comunicar e replanejar antes de conectar serviços reais. Se integração bloquear, registrar impacto; demonstração simulada não equivale a entrega real. Não cortar requisitos essenciais silenciosamente; simplificar aparência e adiar opcionais para proteger núcleo.

Trajeto automático é alta prioridade; plano B apenas se inviável/atrasar: ordem cadastrada por grupo/sentido, filtragem de locais confirmados sem otimização, equilíbrio de tempos ou distâncias prometidas. Inserção de novo endereço nessa ordem precisa ser resolvida operacionalmente.

Supabase escolhido para dados sobre PostgreSQL; Railway/Hetzner ainda sem composição/hospedagem escolhida. Supabase Auth e TypeORM/migrações confirmados; versões de frontend/serviços, duração de sessão, retenção, mapas e modelo de IA ainda pendentes. Gemini tem preferência experimental condicionada, sem alegação de gratuidade ou compatibilidade. Não presumir API incluída na assinatura ChatGPT.

## Detalhamento técnico do planejamento

O [backlog](backlog.md), consolidado em 22/10/2026, detalha tarefas futuras e dependências, apoiado por [arquitetura](arquitetura.md), [dados](modelo-dados.md) e [API](api.md). B00, preparação B01 e base B02 concluídas; B03 entregue; B04–B05 completam o primeiro bloco recomendado. B17 é a revisão do backend antes das integrações de B18. Esses documentos não comprovam execução nem alteram datas ou garantem esforço suficiente; a validação dos módulos segue R01–R22 e O01.
