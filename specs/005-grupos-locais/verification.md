# Verificação B06 — 23/10/2026

## Autorização e fluxo
Taís confirmou as duas recomendações de vínculos e desativação. Spec atualizada e checklist 16/16 aprovado antes da implementação; setup-plan.ps1, setup-tasks.ps1 e check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks executados. Pesquisa/dados/contratos/guia/tarefas preenchidos, sem repetir levantamento. Hooks ausentes. Constituição 1.0.0 preservada e conferida antes/depois do desenho.

## Entrega
- Grupos separados por sentido; região com um grupo de distribuição e ponto com um grupo de coleta, reforçados por FK composta no PostgreSQL.
- Cadastros e edições autorizadas por admin/operador, listas paginadas, revisões esperadas e proteção contra alterações concorrentes.
- Resolução automática de endereço quando a porta comprova área/região/grupo; identidade canônica evita fusão por grafia. Runtime normal retorna ADDRESS_VALIDATION_UNAVAILABLE; apenas testes usam simulador.
- Padrões independentes por sentido, registro de origem/referência e revisões. Mudança exige pedido/consentimento declarado; inicial permitido apenas primeiro preenchimento. Falha preserva anterior. Resolução de endereço não altera padrão por conta própria.
- Desativação preserva referências e padrões, bloqueia novas utilizações e informa needsAdjustment/issue ao consultar padrões. Sem cascata de cancelamento, exclusão, troca automática ou mensagem.
- Validação fora da transação, autorização preliminar e revalidação de ator/vínculos antes da gravação. Operações curtas B06 serializadas com lock transacional; padrão também bloqueia aluno. Sem transação aberta enquanto aguarda futura integração de mapas.

## Evidências
RED observado antes do domínio, serviço de cadastros, resolução de endereço, padrões e rotas HTTP; GREEN por fatia. Casos adicionais validaram concorrência, desativação durante validação e permissões reais.

`node node_modules/jest/bin/jest.js --runInBand`: **24 suítes, 150 testes aprovados** (132 anteriores + 18 B06). Novos: 6 unitários; 8 de serviço/persistência; 2 de migração/permissões; 2 jornadas HTTP com múltiplas asserções. PostgreSQL isolado real, verificador de identidade e porta geográfica substituídos apenas em testes. Runtime real indisponível também testado sem substituir AddressValidator.

`npm run build`, `npm run lint`, `tsc --noEmit`: aprovados. Ajustes de tipos dos fixtures HTTP/consulta SQL e remoção de import não usado concluídos; nenhum problema funcional permaneceu. Migração aplicada em test/dev, reversão restrita à última migração B06 com tabelas vazias; reaplicação idempotente. Migrações anteriores preservadas. Aplicação sem DELETE/DDL e sem reescrita de identidade de retorno.

Conferência final: dev/test sem migrações pendentes e zero registros sintéticos remanescentes nas cinco tabelas B06, alunos, vigências e equipe. Os clusters já estavam em execução no início desta implementação e foram mantidos nesse estado. Links locais conferidos; git diff --check sem erros. **10/10 tarefas concluídas.**

## Limites e próxima etapa
Sem integração real, geometria validada, presença comprovada, jornada, frota ou otimização. Origem/referência do pedido é declarada pela equipe; não comprova mensagem externa ainda não integrada. Consumidores futuros devem revalidar dentro da própria transação, mantendo ordem de locks e regras temporais. SQL administrativo direto deve respeitar invariantes. Sem novos commits/push; B04–B06 permanecem no working tree. Próxima etapa B07 — jornada e comandos explícitos.
