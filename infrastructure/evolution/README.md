# Evolution local para TechBus

**TechBus utiliza Evolution API.** Fonte oficial 2.3.7, commit `cd800f2976e1e5b682fbf86a01ee4d85ae61f370`; licença e avisos preservados no checkout. Instalação de testes, sem alunos reais e sem promessa de prontidão para produção.

O checkout/dependências ficam em `.local/evolution-api-2.3.7`; sessão, segredos e cluster exclusivo em `.local/evolution-runtime`. Não versionar esses diretórios. O fornecedor não recebe credenciais do TechBus. API `127.0.0.1:8085`, PostgreSQL `127.0.0.1:55434`, banco `evolution_test`, schema `evolution_api`, usuário sem superusuário/criação de bancos/perfis. Esse usuário administra apenas seu banco do fornecedor; as permissões restritas do backend TechBus continuam independentes.

Preparação reproduzível, a partir da raiz, usando Node local 24.22.1 e npm local 11.17.0:

```powershell
git clone --depth 1 --branch 2.3.7 https://github.com/evolution-foundation/evolution-api.git .local/evolution-api-2.3.7
# Dentro do checkout, com o Node/npm locais no PATH:
npm ci --ignore-scripts --no-audit --no-fund
# De volta à raiz:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-evolution.ps1 -Action init
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-evolution.ps1 -Action build
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-evolution.ps1 -Action start
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-evolution.ps1 -Action status
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-evolution.ps1 -Action stop
```

`init` recusa sobrescrever estado/credenciais existentes. Gera segredos próprios e aplica somente dois patches de fonte: bind explícito loopback em `src/main.ts`; remoção de `console.log(messageRaw)` no serviço Baileys. `build` gera Prisma, verifica tipos e compila com as ferramentas do lockfile do fornecedor. `start` aplica migrações somente nesse banco e inicia processo oculto, identificado por PID/instante/executável. `stop` preserva todos os dados. Não usar scripts Linux de remoção/cópia do fornecedor no Windows.

Telemetria, Sentry, Redis, bots e webhook global desativados. Cache local e sessão Prisma. Sem limpeza automática de mensagens nem importação de histórico. O launcher descarta stdout/stderr do fornecedor, que podem conter dados pessoais/segredos; diagnóstico persistido contém somente classe/código de erro, não corpo/stack. O status do processo não substitui a verificação HTTP.

O backend aceita somente configuração explícita, URL fixa e segredos diferentes. Segredo `api` do arquivo privado vai em `EVOLUTION_API_KEY`; `webhook` em `EVOLUTION_WEBHOOK_SECRET`. Não enviar valores pelo chat. `EVOLUTION_SEND_ENABLED=false`, allowlist vazia e nenhum agendador ativo são o estado inicial. Ver [contrato](../../specs/018-whatsapp-local/contracts/whatsapp.md) e [roteiro](../../specs/018-whatsapp-local/quickstart.md). Pareamento QR e destinatário controlado ainda necessários para ensaio real.

## Preservação de horário original (29/10/2026)

O build executa preserve-order.cjs após instalar dependências. O patch captura techbusOriginalOrder na decodificação Baileys, preserva a evidência no buffer e projeta exclusivamente no webhook MESSAGES_UPSERT; não acrescenta campos ao Prisma do fornecedor. Recusa fontes inesperadas; reinstalar dependências exige novo build. check-order-buffer.mjs reproduz as duas ordens de mescla com mensagens sintéticas, sem conexão externa. O campo não é garantia absoluta nem substitui recebimento durável para prazos.
