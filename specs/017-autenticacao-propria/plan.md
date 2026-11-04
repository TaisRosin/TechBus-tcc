# Implementation Plan: B18.1 — autenticação própria

**Branch Git observado**: `main` (sem mudança nesta preparação) | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)
**Feature Directory**: `specs/017-autenticacao-propria`, selecionado em `.specify/feature.json`; identificador do Spec Kit não é confirmação de branch Git.

## Summary

Completar identidade real para a autorização B03 com email/senha, sessões opacas revogáveis, senha temporária de 24h e recuperação administrativa. Preservar os IDs e vínculos existentes. Implementação autorizada em 28/10/2026, com resultados em [verification.md](verification.md).

## Technical Context

- TypeScript 5.8.3, Node 24.22.1, NestJS 11.2.7, TypeORM 0.3.31 e pg 8.16.3 conforme backend/package.json; preservar lockfile.
- PostgreSQL local isolado conforme B02; aplicação sem DDL, migrador separado, synchronize:false e migrationsRun:false.
- Jest unit/integration/e2e e Supertest existentes, relógio substituível e PostgreSQL real isolado para concorrência.
- Plataforma Windows local, serviço HTTP loopback; sem frontend neste incremento. B19 deve cumprir contrato de memória/recarga/restauração.
- Escala: uma equipe/empresa com dados fictícios, sem meta inventada de usuários de produção. Custo criptográfico medido localmente e concorrência limitada conforme pesquisa; registrar latência/memória, sem prometer SLA.
- Sem dependência nova planejada: usar crypto scrypt assíncrono. Pesquisa deve ser revalidada se versão/runtime divergir antes de implementar.

## Constitution Check

Antes/depois do desenho: aprovado documentalmente. Domínio e autorização mantidos; TDD em acesso, tempo e concorrência; isolamento PostgreSQL; relógio injetável; nenhuma integração real, exclusão automática ou senha padrão. Implementação só após aprovação do incremento. Não há exceção à constituição.

## Project Structure

Artefatos: spec.md, research.md, data-model.md, contracts/auth.md, quickstart.md, tasks.md e checklists/requirements.md neste diretório.

Arquivos existentes a integrar: backend/src/access/access.module.ts; application/ports.ts e access.service.ts; http/access.guard.ts e access.controller.ts; infrastructure/postgres-team-store.ts; backend/src/infrastructure/database/migrations/ e backend/package.json.

Arquivos novos propostos sob backend/src/access/: domain/auth.ts; application/auth.service.ts e auth.ports.ts; infrastructure/postgres-auth-store.ts, password-hasher.ts e session-verifier.ts; http/auth.controller.ts; cli/auth-bootstrap.ts e auth-recover-admin.ts. Testes sob backend/test/unit/auth.spec.ts, integration/auth.spec.ts e e2e/auth.e2e-spec.ts. Migração futura com timestamp único no diretório existente, sem editar migrações históricas.

## Desenho e fases

1. Pesquisa concluída: [research.md](research.md), fontes oficiais e inspeção B03. Preferir crypto scrypt estável já disponível; Argon2 pode ser alternativa após verificar estabilidade/suporte, sem alegar que inexiste no Node atual.
2. Dados/contratos definidos em [data-model.md](data-model.md) e [contracts/auth.md](contracts/auth.md). Tabelas aditivas, sessão de troca separada; revalidação de credencial e autorização antes do commit; lock B03 preservado.
3. Implementação futura em fatias: fundação persistente/crypto → US1 login/logout → US2 criação/troca → US3 recuperação/bootstrap → regressão e evidências. Testes antes das regras de cada fatia.
4. Ensaio backend com contas sintéticas. US1 pode ser demonstrada isoladamente com fixture; entrega B18.1 requer todas as três histórias. Frontend não é condição para testar API, mas SC-005 completo só pode ser declarado em B19.

## Decisões complementares de contrato

Consultas automáticas de fundo usarão cabeçalho opcional `X-TechBus-Activity: passive`: ausência significa ação interativa; passive nunca renova last_activity. Verificador pode receber intenção de renovação por parâmetro opcional, sem passar perfil vindo do cliente. O cabeçalho não concede permissão nem estende limite absoluto. GET /session usa passive por padrão. O painel B19 deve classificar seus polls; cliente malicioso ainda pode simular atividade, limitação normal de timeout de inatividade, sem promessa de detectar presença humana.

Desativação revoga sessões no mesmo protocolo de transação do acesso. Troca de perfil usa permissões atuais; não exige reautenticar por si só. Recuperação invalida senha/contextos/sessões anteriores; login concorrente relê versão após derivação. Contexto restrito só pode trocar senha/sair. Entradas login/password/logout usam metadado público somente para dispensar o guard operacional: password valida credencial restrita e logout valida o Bearer no serviço. Demais rotas passam pelo guard; bootstrap/técnico somente CLI restrita. Health público existente preservado.

## Riscos e validação

XSS pode ler token em memória; B19 precisa proteger renderização e validar restauração sem exibir dados antigos. Sem interface pronta, não declarar experiência de navegador concluída. Perfis continuam validados no backend. Custos scrypt medidos antes da entrega; não reduzir proteção silenciosamente. Banco indisponível nega autenticação. Response perdida de temporária exige regenerar, não recuperar segredo armazenado. Retenção futura não bloqueia teste isolado; nenhum expurgo automático agora.

## Encerramento

Seguir [quickstart](quickstart.md), registrar resultados reais em verification.md somente após implementação. Próxima integração externa continua Evolution/Baileys; Google Cloud não bloqueia B18.1.
