# Quickstart — B02

Windows com PowerShell 7. Ferramentas privadas e segredos ficam em `.local/`, ignorado pelo Git. Execute da raiz, salvo indicação. [Versões/evidências](verification.md).

## Ferramentas em outra máquina

Baixe e confira SHA256 com `Get-FileHash -Algorithm SHA256`. Extraia somente em diretórios novos; se existentes, valide versões sem sobrescrever.

| Ferramenta | Artefato | SHA256 | Destino |
| --- | --- | --- | --- |
| Node 24.22.1 | [ZIP oficial](https://nodejs.org/dist/v24.22.1/node-v24.22.1-win-x64.zip) | `d2046d28c2c3dcd211ac5145c0bf30e2047ef9dfb306693c8c6e2eccd8b95fa5` | `.local/`, mantendo `node-v24.22.1-win-x64/` |
| npm 11.17.0 | [tarball](https://registry.npmjs.org/npm/-/npm-11.17.0.tgz) | `b290bbb35b9e72c3ef84edbe041f28c4479c4d9ee79f555817b8caafe7ce4bba` | `.local/npm-11.17.0/`, mantendo `package/` |
| PostgreSQL 17.11 | [ZIP EDB](https://get.enterprisedb.com/postgresql/postgresql-17.11-5-windows-x64-binaries.zip) | `80379b2c04d51c30225532e0ae04509899141e9957ed096fe749d7fd9df8f82f` | `.local/postgres/17.11/`, mantendo `pgsql/` |

Use `Expand-Archive -LiteralPath <zip> -DestinationPath <destino>` para ZIP e `tar -xzf <tgz> -C <destino>` para npm. Crie os diretórios antes. Hashes identificam os artefatos usados; Node também conferido no manifesto oficial e npm contra integridade do registro. Não instalar serviços globais.

```powershell
. ./scripts/use-local-node.ps1
node --version
npm --version
./.local/postgres/17.11/pgsql/bin/postgres.exe --version
```

Esperado: v24.22.1, 11.17.0, PostgreSQL 17.11.

## Clusters privados

Somente na primeira preparação:

```powershell
./scripts/local-postgres.ps1 -Action init -Environment dev
./scripts/local-postgres.ps1 -Action init -Environment test
```

`init` gera credenciais aleatórias distintas e `backend/.env`/`.env.test`. Não copiar exemplos antes: arquivos existentes não são sobrescritos. Exemplos documentam campos. Não há reset/exclusão. Falhas preservam arquivos para diagnóstico.

Em cada sessão:

```powershell
./scripts/local-postgres.ps1 -Action start -Environment dev
./scripts/local-postgres.ps1 -Action start -Environment test
./scripts/local-postgres.ps1 -Action status -Environment dev
./scripts/local-postgres.ps1 -Action status -Environment test
```

Dev: `127.0.0.1:55432/techbus_dev`; teste: `127.0.0.1:55433/techbus_test`. Portas ocupadas exigem diagnóstico, sem encerrar processos desconhecidos. Integração precisa dos dois: modifica apenas fixture de teste e consulta metadados dev para comprovar isolamento.

## Validação

```powershell
Set-Location backend
npm ci
npm run build
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run migration:show -- --env test
npm run start:dev
```

Consultar `http://127.0.0.1:3000/health/live` e `/health/ready`: 200 com banco disponível. Com banco parado, live permanece 200 e ready retorna 503, sem detalhes da conexão. Encerrar watcher com Ctrl+C. Migrações explícitas: `migration:run`/`migration:revert`, sempre `--env dev` ou `--env test`. Sem synchronize ou migrações no bootstrap; não há migrações de domínio em B02.

Testes cobrem configuração inválida sem segredo, recusa de alvo externo/dev no executor de teste, aplicar/repetir/desfazer/reaplicar fixture, privilégios, timeout e liberação de recursos. Relógio fixo e America/Sao_Paulo: `2026-10-22T02:59:59Z` → 21/10 e `03:00:00Z` → 22/10. Cortes 17h/22h pertencem a B08/B09.

Ao terminar, na raiz:

```powershell
./scripts/local-postgres.ps1 -Action stop -Environment test
./scripts/local-postgres.ps1 -Action stop -Environment dev
```

Reprodução: repetir npm ci em backend com watchers/testes encerrados. Downloads públicos são necessários na primeira instalação; testes não usam Supabase/WhatsApp/IA. [Resultados e limitações](verification.md).
