# Verificação B16 — trajeto e contingência

Data: 26/10/2026. Q1/Q2 confirmadas conjuntamente; especificação, checklist 16/16, plano, pesquisa, modelo, contratos e dez tarefas pelo Spec Kit. Constituição e decisões anteriores preservadas; nenhum hook configurado.

## Entrega
- Ordem padrão por grupo/sentido com locais ativos, IDs únicos e revisão esperada; edição concorrente não sobrescreve silenciosamente outra.
- Prévia de locais confirmados e pendências sem posição. Publicação incompleta, obsoleta ou sem planejamento confirmado é rejeitada.
- Publicação explícita separada da ordem padrão, vinculada à versão confirmada do planejamento; rascunho não altera sequência publicada.
- Consulta do motorista reutiliza a autorização transacional B15. Cancelamentos retiram paradas vazias; ordem alterada aguarda nova publicação com alerta; planejamento substituído exige publicação compatível.
- Contrato automático interno e adaptador padrão indisponível; saída simulada validada como permutação exata, sem PII ou publicação automática.

## Evidências
TDD: falhas observadas por domínio/tabelas/serviços/rotas ausentes antes de implementar cada fatia. Onze testes novos em cinco suítes, cobrindo filtragem e paradas compartilhadas, locais pendentes, IDs inválidos/duplicados, privilégio/reversão, edições/publicações concorrentes, prévia obsoleta, sequência publicada, cancelamento, troca de plano, revogação, janela após meia-noite, HTTP e resultado automático inválido/indisponível.

Regressão: **328/328 testes em 61 suítes**, Jest --runInBand, 60,081 s. Build, lint e tsc --noEmit aprovados. Migração Itineraries1793900000000 aplicada somente nos PostgreSQL locais dev/test, com aplicação sem DELETE/DDL. Reversão vazia e reaplicação verificadas em teste; ambos os bancos sem migrações pendentes ou dados sintéticos remanescentes nas tabelas operacionais conferidas.

Dez tarefas concluídas. Links locais conferidos em 149 documentos, sem destinos ausentes; git diff --check sem erros. Ambos os PostgreSQL locais encerrados ao finalizar.

## Ocorrências e limites
Teste HTTP identificou que a consulta exigia indevidamente a data opcional; corrigido. Verificação de tipos identificou inferência restrita de UUIDs na fixture HTTP, corrigida com lista de strings. Nenhuma nova dependência, infraestrutura ou credencial externa.

A primeira tentativa de encerrar os bancos não foi executada por limite do serviço de aprovação automática. Na retomada solicitada pela usuária, a nova tentativa foi autorizada e ambos foram encerrados normalmente.

Entrega é de itinerário local manual, sem mapas, navegação, distância/tempo calculados ou trajeto geográfico intermunicipal. O automático continua prioritário e condicionado à escolha/autorização do fornecedor, resolução dos locais/âncoras e validação viária em B18; ver [pesquisa](research.md). Simulação não comprova trajeto real. Sem frontend (B19), ensaio de carga ou histórico operacional público.

Próxima etapa: B17 — revisão integrada do backend, antes das integrações reais. Nenhum commit automático realizado.
