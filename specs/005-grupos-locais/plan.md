# Plano B06 — Grupos e locais
23/10/2026. [Spec](spec.md), checklist 16/16, decisões e implementação integral autorizadas.

## Summary / Technical Context
Ampliar registry com LocationService, porta AddressValidator e adaptador SQL de locais separado para manter organização. Reutilizar transação, pool, autorização e erros B03–B05. Mesmo Node 24.22.1, npm 11.17.0, Nest 11.2.7, TS 5.8.3, TypeORM 0.3.31, pg 8.16.3, PostgreSQL 17.11 local dev/test; nenhuma dependência ou extensão nova.

## Constitution Check
Aprovado antes/depois do desenho: decisões manuais por sentido, preservação de referências, nenhuma integração real, TDD em interfaces de domínio/serviço/HTTP e banco real isolado. Sem efeitos em jornada ou veículos. Validador normal indisponível; somente testes substituem a porta com respostas sintéticas. Padrões guardam origem e referência do pedido/consentimento, sem afirmar autenticidade de mensagem ainda não integrada.

## Project Structure
`backend/src/registry/domain/locations.ts`, `application/{location.service,location-ports}.ts`, `infrastructure/location-queries.ts`, `http/location.controller.ts`; integrar ports, postgres-registry-store e registry.module. Migração `1793000000000-local-places.ts`. Testes unit/locations, integration/locations e e2e/locations.

## Transações e limites
Escritas B06 e leituras consistentes: executor FOR SHARE → advisory lock transacional (82406,1) → aluno se necessário. Adequado ao recorte de uma empresa e operações cadastrais curtas; outros módulos não obtêm o lock B06 depois de bloquear aluno. Validação de endereço fora da transação, após autorização preliminar; revalidar executor, região/grupo e revisão antes de gravar. Chave canônica do adaptador identifica retorno; mesmo texto não comprova identidade. FK composta fixa sentido; grupo não muda sentido na edição. Todos os PATCH têm expectedVersion; criação de padrão usa versão 0 (ausente). Listas paginadas 1–100.

Desativação não apaga relações; leitura de padrões expõe usable/issue e needsAdjustment. Novas utilizações revalidam cadeia ativa. Consumidores futuros revalidam dentro de seus comandos, não reutilizam uma avaliação como autorização permanente. Local novo não recebe ordem de trajeto inventada.

## Validação
RED/GREEN por fatia; cardinalidade/sentido, identidade validada, falhas preservando padrão, pedido/consentimento, referências inativas e concorrência. Migração/reversão somente banco test vazio com última migração identificada; aplicar dev explicitamente. Regressão/build/lint/types e limpeza por IDs sintéticos.
