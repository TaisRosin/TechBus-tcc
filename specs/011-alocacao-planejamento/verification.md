# Verificação B12 — 25/10/2026

## Entrega
Demanda por universidade e grupo, recomendação intermunicipal de menores capacidades equivalentes, rascunho versionado e confirmação após fechamento. Seleção local manual e escolha manual de veículo maior suficiente preservadas. Confirmação revalida pendências, capacidade, cadastros, disponibilidade, motorista e ocupações, incluindo datas adjacentes. Rascunho não reserva e não libera confirmação anterior. Cancelamento sinaliza ajuste sem trocar veículo ou enviar mensagem.

## Fluxo e evidências
FR-006/007 confirmados → spec/checklist 16/16 → setup-plan → plano/research/dados/contratos/quickstart → setup-tasks → check-prerequisites → implementação incremental. Constituição preservada; sem hooks/extensions registrados. Nenhuma dependência ou arquitetura externa alterada.

TDD registrou falhas antes do domínio, migração, snapshot, rascunhos, confirmação e rotas. Casos adicionais validaram rollback real, confirmação concorrente/idempotente, conflitos entre datas, motorista ocupado mesmo com outro veículo, reuso posterior, calendário/frota alterados e cancelamento. Teste detectou opção que ignorava ocupação local na própria data: corrigido para considerar outras alocações confirmadas, preservando a possibilidade de substituir o ciclo da universidade consultada.

**274 testes em 44 suítes**, incluindo **13 testes novos B12**. A regressão inicial passou em 273/274: o teste antigo de migrações falhou por PostgreSQL dev desligado (ECONNREFUSED 55432); após iniciar o cluster, esse teste passou. Lint corrigiu tipagem de consultas SQL e matchers de testes. Build e TypeScript sem emissão verificados. Não foram constatadas falhas de negócio pendentes.

Migração OperationPlanning1793500000000 aplicada em dev/test locais. Aplicação sem DELETE/DDL; reversão com plano existente bloqueada e testada. Reversão/reaplicação com tabelas vazias passou no banco de testes. Build, TypeScript e 15 testes das suítes operation/operational-date passaram novamente após os ajustes finais. Dev/test conferidos sem migrações pendentes nem fixtures remanescentes; clusters encerrados preservando arquivos. Links locais conferidos em 21 arquivos e git diff --check aprovado. Checklist 16/16, tarefas 12/12; revisão final da constituição sem desvios.

## Limites e continuidade
API apenas administrativa do dia atual; sem frontend novo, histórico público, atribuições de motorista, mapas, WhatsApp/IA ou Supabase remoto. Fechamento B08 permanece serviço interno; não foi criado agendador real. Ocupações são escritas exclusivamente pelo backend sob a barreira transacional existente; integração futura deve manter essa regra. Não foi realizado benchmark de escala.

Próxima etapa B13: correções da equipe e ajuste do planejamento. Alterações anteriores preservadas; sem commit automático.
