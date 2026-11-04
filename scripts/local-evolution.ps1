[CmdletBinding()]
param([Parameter(Mandatory)][ValidateSet('init','build','start','status','stop')][string]$Action)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$runtime = Join-Path $projectRoot '.local/evolution-runtime'
$source = Join-Path $projectRoot '.local/evolution-api-2.3.7'
$data = Join-Path $runtime 'pg-data'
$bin = Join-Path $projectRoot '.local/postgres/17.11/pgsql/bin'
$node = Join-Path $projectRoot '.local/node-v24.22.1-win-x64/node.exe'
$marker = Join-Path $runtime '.techbus-evolution'
$secretsFile = Join-Path $runtime 'secrets.json'
$processFile = Join-Path $runtime 'process.json'
foreach ($path in @($runtime,$source,$data)) {
  if (![IO.Path]::GetFullPath($path).StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Invalid local path' }
  if ((Test-Path -LiteralPath $path) -and ((Get-Item -LiteralPath $path).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Links not permitted' }
}
function Assert-Free([int]$Port) {
  $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$Port)
  try { $listener.Start() } finally { $listener.Stop() }
}
function Control-Database([string]$Operation) {
  $arguments = @($Operation,'-D',$data,'-w','-t','20')
  if ($Operation -eq 'start') { $arguments += @('-l',(Join-Path $runtime 'postgres.log')) }
  if ($Operation -eq 'stop') { $arguments += @('-m','fast') }
  & (Join-Path $bin 'pg_ctl.exe') @arguments
  if ($LASTEXITCODE -ne 0) { throw 'Evolution database control failed' }
}
function New-Secret {
  $bytes = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return ([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant()
}
function Read-Process {
  if (!(Test-Path -LiteralPath $processFile)) { return $null }
  $saved = Get-Content -LiteralPath $processFile -Raw | ConvertFrom-Json
  $process = Get-Process -Id $saved.id -ErrorAction SilentlyContinue
  if (!$process) { return $null }
  if ($process.Path -ne $node -or $process.StartTime.ToUniversalTime().Ticks.ToString() -ne $saved.started) { throw 'Process identity changed; refusing control' }
  return $process
}
if ($Action -eq 'init') {
  if ((Test-Path -LiteralPath $runtime) -or (Test-Path -LiteralPath (Join-Path $source '.env'))) { throw 'Existing runtime preserved; initialization refused' }
  $revision = & git -C $source rev-parse HEAD
  if ($LASTEXITCODE -ne 0 -or $revision -ne 'cd800f2976e1e5b682fbf86a01ee4d85ae61f370') { throw 'Pinned Evolution source required' }
  Assert-Free 55434
  New-Item -ItemType Directory -Path $runtime | Out-Null
  $secrets = @{ admin=(New-Secret); database=(New-Secret); api=(New-Secret); webhook=(New-Secret) }
  $secrets | ConvertTo-Json | Set-Content -LiteralPath $secretsFile -Encoding utf8
  $passwordFile = Join-Path $runtime 'init-password.tmp'
  $sqlFile = Join-Path $runtime 'bootstrap.tmp'
  $previousPassword = $env:PGPASSWORD
  $running = $false
  try {
    [IO.File]::WriteAllText($passwordFile,$secrets.admin,[Text.UTF8Encoding]::new($false))
    & (Join-Path $bin 'initdb.exe') -D $data -U evolution_bootstrap --encoding=UTF8 --locale=C --auth=scram-sha-256 "--pwfile=$passwordFile"
    if ($LASTEXITCODE -ne 0) { throw 'Evolution initdb failed' }
    @("listen_addresses = '127.0.0.1'",'port = 55434',"password_encryption = 'scram-sha-256'","timezone = 'UTC'",'max_connections = 20') | Add-Content -LiteralPath (Join-Path $data 'postgresql.conf')
    Control-Database 'start'; $running=$true
    $env:PGPASSWORD=$secrets.admin
    @"
CREATE ROLE evolution_local LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '$($secrets.database)';
CREATE DATABASE evolution_test OWNER evolution_local;
REVOKE ALL ON DATABASE evolution_test FROM PUBLIC;
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
REVOKE CONNECT ON DATABASE template1 FROM PUBLIC;
\connect evolution_test
REVOKE ALL ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA evolution_api AUTHORIZATION evolution_local;
"@ | Set-Content -LiteralPath $sqlFile -Encoding utf8
    $result = & (Join-Path $bin 'psql.exe') -X -q -h 127.0.0.1 -p 55434 -U evolution_bootstrap -d postgres -v ON_ERROR_STOP=1 -f $sqlFile 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Evolution database bootstrap failed; secrets not printed' }
    $values = @{
      SERVER_PORT='8085'; SERVER_URL='http://127.0.0.1:8085'; TELEMETRY_ENABLED='false'; SENTRY_DSN='';
      CORS_ORIGIN='http://127.0.0.1:8085'; CORS_CREDENTIALS='false'; LOG_LEVEL='ERROR'; LOG_BAILEYS='fatal';
      DATABASE_CONNECTION_URI="postgresql://evolution_local:$($secrets.database)@127.0.0.1:55434/evolution_test?schema=evolution_api&connection_limit=5";
      DATABASE_CONNECTION_CLIENT_NAME='techbus_test'; DATABASE_DELETE_MESSAGE='false'; DATABASE_SAVE_DATA_HISTORIC='false';
      DATABASE_SAVE_DATA_CONTACTS='false'; DATABASE_SAVE_DATA_CHATS='false'; DATABASE_SAVE_DATA_LABELS='false';
      CACHE_REDIS_ENABLED='false'; CACHE_LOCAL_ENABLED='true'; AUTHENTICATION_API_KEY=$secrets.api;
      AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES='false'; WEBHOOK_GLOBAL_ENABLED='false'
    }
    $content = [IO.File]::ReadAllText((Join-Path $source '.env.example'))
    foreach ($key in $values.Keys) { $content=[regex]::Replace($content,"(?m)^$key=.*$",("$key="+$values[$key])) }
    [IO.File]::WriteAllText((Join-Path $source '.env'),$content,[Text.UTF8Encoding]::new($false))
    $main = Join-Path $source 'src/main.ts'
    $content = [IO.File]::ReadAllText($main)
    if (!$content.Contains('server.listen(httpServer.PORT, () =>')) { throw 'Unexpected server source' }
    [IO.File]::WriteAllText($main,$content.Replace('server.listen(httpServer.PORT, () =>',"server.listen(httpServer.PORT, '127.0.0.1', () =>"),[Text.UTF8Encoding]::new($false))
    $baileys=Join-Path $source 'src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts'
    $content=[IO.File]::ReadAllText($baileys)
    if (!$content.Contains('console.log(messageRaw);')) { throw 'Unexpected message logger source' }
    [IO.File]::WriteAllText($baileys,$content.Replace('console.log(messageRaw);','// TechBus local: never print inbound message contents.'),[Text.UTF8Encoding]::new($false))
    '2.3.7|cd800f2976e1e5b682fbf86a01ee4d85ae61f370|55434|8085' | Set-Content -LiteralPath $marker -Encoding ascii
    Write-Output 'Evolution runtime initialized. Credentials private; sending not configured.'
  } finally {
    $env:PGPASSWORD=$previousPassword
    foreach ($temporary in @($passwordFile,$sqlFile)) { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary } }
    if($running) { Control-Database 'stop' }
  }
  exit 0
}
if (!(Test-Path -LiteralPath $marker) -or (Get-Content -LiteralPath $marker -Raw).Trim() -ne '2.3.7|cd800f2976e1e5b682fbf86a01ee4d85ae61f370|55434|8085') { throw 'Owned runtime marker required' }
& (Join-Path $bin 'pg_ctl.exe') status -D $data *> $null
$databaseRunning = $LASTEXITCODE -eq 0
switch ($Action) {
  'build' {
    & $node (Join-Path $projectRoot 'infrastructure/evolution/preserve-order.cjs')
    if($LASTEXITCODE -ne 0) { throw 'Original order patch failed' }
    if (!(Test-Path -LiteralPath (Join-Path $source 'node_modules/prisma/build/index.js'))) { throw 'Run reviewed npm ci --ignore-scripts first' }
    $env:PATH="$(Split-Path $node);$env:PATH"
    Push-Location $source
    try {
      & $node node_modules/prisma/build/index.js generate --schema prisma/postgresql-schema.prisma
      if($LASTEXITCODE -ne 0) { throw 'Prisma generate failed' }
      & $node node_modules/typescript/bin/tsc --noEmit
      if($LASTEXITCODE -ne 0) { throw 'Evolution typecheck failed' }
      & $node node_modules/tsup/dist/cli-default.js
      if($LASTEXITCODE -ne 0) { throw 'Evolution build failed' }
    } finally { Pop-Location }
  }
  'start' {
    if(Read-Process) { Write-Output 'Evolution already running'; break }
    Assert-Free 8085
    if(!$databaseRunning) { Assert-Free 55434; Control-Database 'start' }
    $migrations=Join-Path $source 'prisma/migrations'
    if(!(Test-Path -LiteralPath $migrations)) { Copy-Item -LiteralPath (Join-Path $source 'prisma/postgresql-migrations') -Destination $migrations -Recurse }
    Push-Location $source
    try {
      & $node node_modules/prisma/build/index.js migrate deploy --schema prisma/postgresql-schema.prisma
      if($LASTEXITCODE -ne 0) { throw 'Evolution migrations failed' }
      $launcher=Join-Path $projectRoot 'infrastructure/evolution/launch.cjs'
      $process=Start-Process -FilePath $node -ArgumentList @(('"'+$launcher+'"')) -WorkingDirectory $source -WindowStyle Hidden -PassThru
      @{ id=$process.Id; started=$process.StartTime.ToUniversalTime().Ticks.ToString() } | ConvertTo-Json | Set-Content -LiteralPath $processFile -Encoding ascii
      Write-Output 'Evolution starting on 127.0.0.1:8085; no instance paired.'
    } finally { Pop-Location }
  }
  'status' { $process=Read-Process; Write-Output "Evolution process=$([bool]$process) database=$databaseRunning API=127.0.0.1:8085 PostgreSQL=127.0.0.1:55434" }
  'stop' {
    $process=Read-Process
    if($process) { Stop-Process -Id $process.Id }
    if($databaseRunning) { Control-Database 'stop' }
    Write-Output 'Evolution stopped; persistent files preserved.'
  }
}
