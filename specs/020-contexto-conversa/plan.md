# Plano B18.4 — contexto de conversa

Entrada: [spec.md](spec.md). Atualização 05/11: implementação validada localmente, com encerramento aprovado de uma pergunta por cadeia. Reutilizados NestJS, TypeORM/PostgreSQL, módulos interpretation/whatsapp/messaging e revisão B13; nenhuma dependência nova. Esquema: [data-model.md](data-model.md).

## Constituição e fronteiras

Preservar princípios I–V: decisões de negócio existentes, validação no backend, TDD crítico, recebimento durável/ordenação e evidências honestas. Sem novos grupos, recomendações locais, reconfirmação geral ou abertura de prazo. US1–US3 verificadas antes/depois de cada fatia. Se a pesquisa inicial não comprovar vínculo causal utilizável, manter resposta pendente e documentar limite; nunca substituir prova por heurística silenciosa.

## Sequência e arquivos previstos

1. Detalhar contrato em research.md, data-model.md e contracts/context.md a partir de backend/src/whatsapp/domain.ts, store.ts e dos retornos do adaptador. Inspecionar payload/patch do conector com dados sintéticos. Definir estados, invalidação, vínculo causal e limite de esclarecimento; decisões de negócio ainda necessárias ficam explícitas.
2. Persistência na migração `1794700000000-conversation-context.ts`, após pontos fixos `1794600000000`, sem synchronize ou alteração retroativa de eventos. Funções de domínio em context.ts; persistência, preparação e encerramento em context-store.ts.
3. Conectar contexto conservador em backend/src/interpretation/service.ts e projeção autenticada em backend/src/whatsapp/domain.ts/store.ts. Reutilizar application.service.ts e validação de jornada; não conferir identidade ao modelo.
4. Implementar esclarecimento em backend/src/interpretation/context-store.ts e despacho em backend/src/whatsapp/clarification-dispatcher.ts, usando reserva persistente, allowlist e resultado incerto sem retry. Tabela própria, separada dos recibos de viagem. Resolver pontos em places.ts e comando completo em journey.ts; expor estado no painel Messages.
5. Integrar diagnóstico/revisão às consultas protegidas existentes em backend/src/whatsapp/service.ts e backend/src/journey/; reutilizar os serviços B13 sem criar um segundo mecanismo de autorização.

## Validação e estratégia

TDD em testes públicos unitários para vínculo/expiração/trecho; integração PostgreSQL para concorrência, rollback, pergunta-resposta e revisão; e2e para autorização. Testar fornecedor e transporte substitutos, sem acessar credenciais reais. Build deve preceder teste de bootstrap. Ensaio real e casos manuais antigos não integram esta validação e seguem abertos em B18.3/T019.

MVP deste incremento: US1, conservando pendência quando não houver prova. Depois US2 e US3. Pesquisa de persistência e transporte pode ser preparada independentemente; aplicação de migração e testes com banco compartilhado são sequenciais. Não há delegação de agentes solicitada.
