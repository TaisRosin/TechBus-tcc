# Verificação B10 — 25/10/2026

## Entrega
Sequências por trecho derivadas de jornadas confirmadas; sugestão na quarta utilização do alternativo; dias sem uso ignorados; outro local reinicia. Recusa não repete na mesma sequência. Local desconhecido suspende e resolução recalcula. Aceite/pedido explícito altera somente padrão com evidência, sem modificar jornada.

## Fluxo
Decisões FR-005/006 confirmadas → especificação/checklist 16/16 → setup-plan e artefatos → setup-tasks → check-prerequisites → implementação TDD. Mesmas interfaces públicas de testes adotadas no projeto. Constituição preservada, sem hooks/extensions registrados. T004 executada antes da leitura persistida T003 por dependência da tabela de decisões.

## Evidências
- Novos testes: 3 de domínio, 12 de integração funcional, 1 de privilégios/migração e 1 HTTP.
- TDD observou falhas antes do cálculo/suspensão, tabela, serviço, recusa, aceite, pedido e rota.
- Integração com PostgreSQL real: quarta utilização; revisão/cancelamento; interpretação atrasada; recusa e nova sequência; aceite/pedido; retorno independente; reentrega; concorrência entre conexões; corte 17h; ordem incerta; aluno/local inativos; rejeição de flags extras.
- Falha injetada após gravar resultado reverte padrão, decisão e recibo; retry aplica uma vez. Migração recusa reversão com decisões presentes.
- HTTP: 401 sem autenticação, 403 motorista/inativo, 200 admin/operador, 400 consulta de data, ausência de mutação pública.
- Migração PlacePatterns1793300000000 aplicada nos bancos dev/test locais. Aplicação SELECT/INSERT na tabela de decisões, sem UPDATE/DELETE.

## Limites
Sugestão calculada não é comprovante de envio. Identidade real, WhatsApp e agendamento permanecem B14/B18; geografia real continua indisponível. Sem histórico operacional público, política de retenção ou benchmark. Versões, PostgreSQL/Supabase e infraestrutura preservados. Alterações anteriores não commitadas mantidas; nenhum commit automático.

Regressão completa: **235 testes aprovados em 36 suítes**, incluindo 17 testes novos B10. Build, lint e TypeScript sem emissão aprovados. O lint inicialmente identificou uma variável de teste que deveria ser const; corrigida e validada novamente.

Conferência final: dev/test sem migrações pendentes e zero registros sintéticos de jornadas, recibos, cadastros, contratos, equipe, locais e padrões. Duas fixtures das primeiras execuções foram identificadas e removidas pelos IDs registrados; limpeza automática dos testes corrigida. Links locais aprovados em 21 arquivos e git diff --check sem erros. Checklist 16/16; tarefas 11/11. Próxima etapa B11 — frota, disponibilidade e etapas.
Clusters locais dev/test encerrados ao final, preservando seus arquivos e dados.
