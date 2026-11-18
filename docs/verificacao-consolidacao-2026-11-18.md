# Verificação da consolidação — 18/11/2026

Conjunto preparado para versionamento: contexto de conversa, painel operacional, pontos fixos, agendador opt-in, itinerário diário, disponibilidade por dia, endereços estruturados e prévia Maps. Inclui a correção dos extremos da rota por grupo: primeiro e último ponto da ordem padrão permanecem mesmo sem passageiros.

## Validação executada

- Backend: 523 testes aprovados em 83 suítes (unitários, integração e HTTP), em execução única com PostgreSQL test isolado.
- Frontend: 15 testes Playwright aprovados com APIs simuladas.
- TypeScript backend/frontend, lint backend e builds de ambos aprovados.
- Links locais dos 48 documentos Markdown inicialmente preparados verificados sem destinos ausentes; `git diff --cached --check` aprovado.
- Arquivos privados, banco local, dependências, builds, capturas, PDFs gerados, temporários e cache TypeScript excluídos do commit. Verificação de padrões de chaves privadas/API no conteúdo preparado sem ocorrência.

## Incidente local de login

A API respondia, mas a prontidão retornava 503 e o login retornava `AUTH_UNAVAILABLE`. O PostgreSQL dev estava indisponível após interrupção, com um checkpointer órfão e sem processo principal. Após identificação e encerramento somente desse processo órfão, o cluster existente iniciou e concluiu a recuperação automática. Prontidão voltou a 200; login por meio do proxy frontend voltou a rejeitar corretamente uma conta inexistente com 401. Nenhuma senha foi consultada ou alterada; login com a conta da usuária não foi executado pelo agente.

O painel passa a apresentar mensagens claras para `AUTH_UNAVAILABLE` e `SERVER_ERROR`. A orientação de diagnóstico está no [README do frontend](../frontend/README.md).

Esta validação não inclui novos envios WhatsApp, chamadas reais Google/Gemini, hospedagem ou comprovação da cadeia operacional completa. Evidências específicas e limites dos incrementos permanecem em `specs/020-contexto-conversa` a `specs/026-mapas-rotas`.
