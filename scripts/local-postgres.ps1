[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('init','start','status','stop')][string]$Action,
    [Parameter(Mandatory)][ValidateSet('dev','test')][string]$Environment
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$pgRoot = Join-Path $projectRoot '.local/postgres'
$pgBin = Join-Path $pgRoot '17.11/pgsql/bin'
$dataPath = [IO.Path]::GetFullPath((Join-Path $pgRoot "$Environment-data"))
if (!$dataPath.StartsWith([IO.Path]::GetFullPath($pgRoot) + [IO.Path]::DirectorySeparatorChar)) { throw 'Diretório não autorizado.' }
if (Test-Path -LiteralPath $dataPath) {
    if ((Get-Item -LiteralPath $dataPath).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Cluster não pode ser um link.' }
}
$port = if ($Environment -eq 'dev') { 55432 } else { 55433 }
$db = if ($Environment -eq 'dev') { 'techbus_dev' } else { 'techbus_test' }
$appRole = "${db}_app"
$migrationRole = "${db}_migrator"
$marker = Join-Path $dataPath '.techbus-cluster'
$secretPath = Join-Path $pgRoot "$Environment-secrets.json"
$logPath = Join-Path $pgRoot "$Environment-server.log"
$pgCtl = Join-Path $pgBin 'pg_ctl.exe'
if (!(Test-Path -LiteralPath $pgCtl)) { throw 'PostgreSQL 17.11 ausente; consulte quickstart.' }
if ((& (Join-Path $pgBin 'postgres.exe') --version) -ne 'postgres (PostgreSQL) 17.11') { throw 'Versão PostgreSQL divergente.' }
function Assert-FreePort {
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
    try { $listener.Start() } catch { throw "Porta $port ocupada; nenhum serviço será interrompido." } finally { $listener.Stop() }
}
function Invoke-Control([string]$Operation) {
    $controlArgs = @($Operation, '-D', $dataPath, '-w', '-t', '20')
    if ($Operation -eq 'start') { $controlArgs += @('-l', $logPath) }
    if ($Operation -eq 'stop') { $controlArgs += @('-m', 'fast') }
    & $pgCtl @controlArgs
    if ($LASTEXITCODE -ne 0) { throw "pg_ctl $Operation falhou; consulte log local." }
}
function Assert-Owned {
    if (!(Test-Path -LiteralPath $marker) -or (Get-Content -LiteralPath $marker -Raw).Trim() -ne "$db|$port") {
        throw 'Cluster ausente ou sem identificação TechBus; nenhuma alteração executada.'
    }
}
if ($Action -eq 'init') {
    if ((Test-Path -LiteralPath $dataPath) -or (Test-Path -LiteralPath $secretPath)) { throw 'Inicialização recusada: diretório/segredos já existem. Não sobrescrever.' }
    Assert-FreePort
    $envFile = Join-Path $projectRoot $(if ($Environment -eq 'dev') {'backend/.env'} else {'backend/.env.test'})
    if (Test-Path -LiteralPath $envFile) { throw 'Arquivo de ambiente já existe; inicialização não o sobrescreve.' }
    New-Item -ItemType Directory -Path $pgRoot -Force | Out-Null
    $secrets = @{}
    foreach ($key in @('admin','app','migration')) { $secrets[$key] = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24)) }
    $secrets | ConvertTo-Json | Set-Content -LiteralPath $secretPath -Encoding utf8
    $passwordFile = Join-Path $pgRoot "$Environment-init-password.tmp"
    $sqlFile = Join-Path $pgRoot "$Environment-bootstrap.tmp"
    $running = $false
    $oldPgPassword = $env:PGPASSWORD
    try {
        [IO.File]::WriteAllText($passwordFile, $secrets.admin, [Text.UTF8Encoding]::new($false))
        & (Join-Path $pgBin 'initdb.exe') -D $dataPath -U techbus_bootstrap --encoding=UTF8 --locale=C --auth=scram-sha-256 "--pwfile=$passwordFile"
        if ($LASTEXITCODE -ne 0) { throw 'initdb falhou; arquivos preservados para diagnóstico.' }
        @("listen_addresses = '127.0.0.1'", "port = $port", "password_encryption = 'scram-sha-256'", "timezone = 'UTC'", "max_connections = 20") | Add-Content (Join-Path $dataPath 'postgresql.conf')
        Invoke-Control 'start'
        $running = $true
        $env:PGPASSWORD = $secrets.admin
        @"
CREATE ROLE $migrationRole LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '$($secrets.migration)';
CREATE ROLE $appRole LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '$($secrets.app)';
CREATE DATABASE $db OWNER $migrationRole;
REVOKE ALL ON DATABASE $db FROM PUBLIC;
GRANT CONNECT ON DATABASE $db TO $appRole;
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
REVOKE CONNECT ON DATABASE template1 FROM PUBLIC;
\connect $db
REVOKE ALL ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA app AUTHORIZATION $migrationRole;
GRANT USAGE ON SCHEMA app TO $appRole;
"@ | Set-Content -LiteralPath $sqlFile -Encoding utf8
        $bootstrapOutput = & (Join-Path $pgBin 'psql.exe') -X -q -h 127.0.0.1 -p $port -U techbus_bootstrap -d postgres -v ON_ERROR_STOP=1 -f $sqlFile 2>&1
        if ($LASTEXITCODE -ne 0) { throw 'Bootstrap SQL falhou. Credenciais não serão exibidas; cluster preservado.' }
        $appEnv = if ($Environment -eq 'dev') {'development'} else {'test'}
        $httpPort = if ($Environment -eq 'dev') {3000} else {3001}
        @("APP_ENV=$appEnv", "PORT=$httpPort", 'DB_HOST=127.0.0.1', "DB_PORT=$port", "DB_NAME=$db", "DB_USER=$appRole", "DB_PASSWORD=$($secrets.app)", "DB_MIGRATION_USER=$migrationRole", "DB_MIGRATION_PASSWORD=$($secrets.migration)") | Set-Content -LiteralPath $envFile -Encoding utf8
        "$db|$port" | Set-Content -LiteralPath $marker -Encoding utf8
        Write-Output "Cluster $Environment inicializado; credenciais locais em arquivo ignorado."
    } finally {
        $env:PGPASSWORD = $oldPgPassword
        foreach ($temporaryFile in @($passwordFile,$sqlFile)) { if (Test-Path -LiteralPath $temporaryFile) { Remove-Item -LiteralPath $temporaryFile } }
        if ($running) { Invoke-Control 'stop' }
    }
    exit 0
}
Assert-Owned
& $pgCtl status -D $dataPath *> $null
$isRunning = $LASTEXITCODE -eq 0
switch ($Action) {
    'status' { Write-Output "$Environment running=$isRunning host=127.0.0.1 port=$port database=$db" }
    'start' { if ($isRunning) { Write-Output "$Environment já está iniciado." } else { Assert-FreePort; Invoke-Control 'start' } }
    'stop' { if ($isRunning) { Invoke-Control 'stop' } else { Write-Output "$Environment já está parado." } }
}
