# Guia local — B18.1

Backend implementado; [resultados](verification.md). Sem frontend pronto, conta padrão ou envio de e-mail. Use ambientes locais B02 e dados fictícios. Segredos não devem ir para chat, arquivos versionados, argumentos ou logs.

## Preparar e executar

Da raiz, PowerShell:

```powershell
. ./scripts/use-local-node.ps1
./scripts/local-postgres.ps1 -Action start -Environment dev
./scripts/local-postgres.ps1 -Action start -Environment test
Set-Location backend
npm run migration:show -- --env dev
npm run migration:run -- --env dev
npm run migration:run -- --env test
```

A migração nova já foi aplicada nos dois ambientes desta máquina. Repetição não cria contas ou duplica tabelas. Aplicação sem DDL; migrador separado e configuração isolada conforme [B02](../001-base-backend/quickstart.md).

## Primeiro admin e recuperação técnica

Em terminal interativo privado, somente quando desejar criar o admin de testes:

```powershell
npm run auth:bootstrap -- --env dev
```

Informar e-mail solicitado. Comando exige credencial local de manutenção, gera temporária e exibe uma única vez para entrega manual. Não grave/transmita o terminal. Recusa equipe existente, inclusive concorrente. Nenhuma conta real criada na implementação.

Para recuperar o único admin ativo:

```powershell
npm run auth:recover-admin -- --env dev
```

Informar ID exato; e-mail somente se conta antiga ainda não tem credencial. Não reativa nem altera perfil/e-mail existente. Mais de um admin ativo exige fluxo administrativo normal; operador não redefine admin. Scripts recusam execução não interativa e argumentos extras/credenciais na linha de comando.

## Fluxo da API

```powershell
npm run start:dev
```

Base local http://127.0.0.1:3000 conforme configuração existente. Seguir [contratos](contracts/auth.md) usando cliente HTTP que não grave senhas/tokens no histórico:

1. POST /api/v1/auth/login com e-mail/temporária devolve token password-change, sem acesso operacional.
2. POST /api/v1/auth/password com esse Bearer e newPassword (15–128 caracteres, diferente da temporária) consome contexto. Fazer novo login com senha definitiva.
3. Admin cria via POST /api/v1/users; conta antiga sem credencial usa POST /api/v1/users/:id/credentials. Entrega manual da temporária.
4. Admin consulta metadados para obter credentialVersion e usa POST /api/v1/users/:id/password-reset com expectedCredentialVersion. Invalida senha/contextos/sessões anteriores; resposta perdida exige novo reset explícito, não recuperação do segredo antigo.
5. POST /api/v1/auth/logout revoga; repetição não gera novo efeito. GET /session é passivo. X-TechBus-Activity: passive indica outros polls de fundo.

Temporária 24h, contexto de troca 10 minutos (nunca além da temporária), sessão 1h de inatividade/12h absoluta. Tentativas limitadas por conta/origem; janela conservadora pode durar até um minuto adicional. Campos desconhecidos recusados. E-mail cadastrado não significa caixa postal verificada.

## Verificar

```powershell
npm test
npm run test:integration
npm run test:e2e
npm run lint
npx tsc --noEmit
npm run build
```

Integração/e2e usam PostgreSQL test e HTTP locais; executar sequencialmente porque compartilham banco isolado. Fixtures próprias/sintéticas. Validam prazos, permissões, duplicatas, concorrência, revogação, bootstrap e recuperação. Sem Google, WhatsApp ou alunos reais.

Ao terminar, sair de backend e usar scripts/local-postgres.ps1 -Action stop -Environment test/dev se os clusters não forem necessários a outra atividade. Não encerrar processos desconhecidos.

## B19

Token somente em memória; nenhum refresh, cookie de autenticação ou storage persistente. Validar abertura, F5, fechar/reabrir, restauração e voltar/avançar com cache, sem mostrar dados antigos. Proteção de renderização/CSP e polls passivos são necessários. Testes HTTP B18.1 não comprovam esses comportamentos de navegador.
