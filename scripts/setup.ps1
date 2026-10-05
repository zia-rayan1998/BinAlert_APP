<#
  BinAlert — one-shot local setup (Windows PowerShell).
  Thin wrapper around scripts/setup.mjs so the same logic runs on every OS.

    .\scripts\setup.ps1
    .\scripts\setup.ps1 -SkipAi
#>
param([switch]$SkipAi)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js was not found on PATH. Install Node 20.11+ from https://nodejs.org and reopen PowerShell.'
}

$nodeArgs = @('scripts/setup.mjs')
if ($SkipAi) { $nodeArgs += '--skip-ai' }
& node @args
exit $LASTEXITCODE
