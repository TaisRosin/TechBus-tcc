[CmdletBinding()]
param([ValidateSet('api','front')][string]$Service='front')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'use-local-node.ps1')
if ($Service -eq 'api') {
    & (Join-Path $PSScriptRoot 'local-postgres.ps1') -Action start -Environment dev
    Push-Location (Join-Path $projectRoot 'backend')
    try {
        & $script:TechBusNode node_modules/@nestjs/cli/bin/nest.js build
        if ($LASTEXITCODE -ne 0) { throw 'Build do backend falhou.' }
        & $script:TechBusNode scripts/panel-backend.cjs
    } finally { Pop-Location }
} else {
    Push-Location (Join-Path $projectRoot 'frontend')
    try { & $script:TechBusNode node_modules/vite/bin/vite.js --host 127.0.0.1 } finally { Pop-Location }
}
