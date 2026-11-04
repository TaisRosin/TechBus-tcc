# Implementation Plan: B18.2 — WhatsApp local

Data: 28/10/2026. [Spec](spec.md). Implementação técnica autorizada pela continuidade; pareamento e envio real dependem do aparelho/destinatário de testes. Não ampliar para Gemini ou agendamento.

## Technical Context

NestJS11.2.7/Node24.22.1/TypeORM0.3.31/PostgreSQL17.11 existentes, testes Jest/Supertest. Evolution2.3.7 separada em .local, commit fixado em research.md; seu lockfile não altera backend. Ambiente Windows local; cache em memória e sessão Prisma, banco próprio55434, API8085 somente loopback.

## Constitution Check

Aprovado antes/depois do desenho: TDD em duplicatas/identidade/tempo; banco teste isolado, recebimento anterior à interpretação, nenhum comando de IA ou envio real por presunção. Sem exclusão automática. Pareamento real não é comprovado pelo fornecedor simulado.

## Project Structure

backend/src/whatsapp/{domain.ts,config.ts,store.ts,service.ts,sender.ts,controller.ts,whatsapp.module.ts}; backend/src/infrastructure/database/migrations/1794100000000-whatsapp-channel.ts; integração em app.module.ts/config/environment.ts/registry.module.ts. Testes backend/test/unit/whatsapp.spec.ts, integration/whatsapp.spec.ts e e2e/whatsapp.e2e-spec.ts. scripts/local-evolution.ps1 e infrastructure/evolution/ documentam preparação/processo isolado. WhatsAppModule importado por RegistryModule, reutilizando o mesmo store no receptor e no adaptador B14. AppModule repassa a configuração opcional.

## Fases

1. Pesquisa oficial e revisão de dependências/skills; checkout privado fixado.
2. Receptor autenticado, projeção limitada e transação evento/recibo. Não alterar chegada ao retomar interpretação; não interpretar nada nesta etapa.
3. Adaptador B14 com proteção de tentativas, allowlist e resultados incertos; status correlacionado somente por ID comprovado.
4. Serviço nativo com patches mínimos rastreáveis, segredos locais, cluster próprio e teste de prontidão sem pareamento.
5. Regressão, documentação e roteiro de pareamento/teste real. Se instalação nativa falhar, registrar diagnóstico concreto antes de escolher alternativa.

## Riscos

Ausência de idempotency key no fornecedor impede reenviar resultado incerto. Histórico/ordem incompleta ficam pendentes; prova de ordenação será detalhada B18.3. Baileys da versão oficial é prerelease interno do fornecedor, sem promessa de estabilidade. Serviço possui dependências legadas; isolamento local e ausência de alunos reais são limites desta avaliação, não aprovação para produção.
