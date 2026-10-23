# Dot-source from PowerShell: . ./scripts/use-local-node.ps1
$script:TechBusRoot = Split-Path $PSScriptRoot -Parent
$script:TechBusNode = Join-Path $script:TechBusRoot '.local/node-v24.22.1-win-x64/node.exe'
$script:TechBusNpm = Join-Path $script:TechBusRoot '.local/npm-11.17.0/package/bin/npm-cli.js'
if (!(Test-Path -LiteralPath $script:TechBusNode) -or !(Test-Path -LiteralPath $script:TechBusNpm)) {
    throw 'Prepare Node 24.22.1 e npm 11.17.0 em .local conforme quickstart.'
}
$env:PATH = "$(Split-Path $script:TechBusNode);$env:PATH"
$env:npm_config_cache = Join-Path $script:TechBusRoot '.local/npm-cache'
$shimDir = Join-Path $script:TechBusRoot '.local/npm-bin'
New-Item -ItemType Directory $shimDir -Force | Out-Null
$shimFile = Join-Path $shimDir 'npm.cmd'
@"
@echo off
"$script:TechBusNode" "$script:TechBusNpm" %*
"@ | Set-Content -LiteralPath $shimFile -Encoding ascii
# A native shim preserves the -- separator when forwarding npm script arguments.
Set-Alias -Name npm -Value $shimFile -Scope Global
