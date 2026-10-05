<#
  BinAlert — start local development (Windows PowerShell).

    .\scripts\dev.ps1            frontend (5173) + API (4000)
    .\scripts\dev.ps1 -WithAi    frontend + API + Python AI service (8000)
    .\scripts\dev.ps1 -Only web  frontend only   (web | api | ai)

  Ctrl+C stops every process.
#>
param(
  [switch]$WithAi,
  [ValidateSet('web', 'api', 'ai')]
  [string]$Only
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$nodeArgs = @('scripts/dev.mjs')
if ($WithAi) { $nodeArgs += '--ai' }
if ($Only) { $nodeArgs += @('--only', $Only) }
& node @args
exit $LASTEXITCODE
