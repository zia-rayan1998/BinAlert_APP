<#
  BinAlert — start the Python AI service on its own (Windows PowerShell).
  Creates ai-service\.venv and installs requirements.txt on first run.

    .\scripts\dev-ai.ps1
    .\scripts\dev-ai.ps1 -Port 8001
#>
param([int]$Port = 8000)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$service = Join-Path $root 'ai-service'
Set-Location $service

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command python3 -ErrorAction SilentlyContinue }
if (-not $python) {
  Write-Error 'Python was not found on PATH. Install Python 3.11+ from https://www.python.org/downloads/ and reopen PowerShell.'
}

$venvPython = Join-Path $service '.venv\Scripts\python.exe'

if (-not (Test-Path $venvPython)) {
  Write-Host '==> Creating virtualenv .venv' -ForegroundColor Green
  & $python.Source -m venv .venv
  if ($LASTEXITCODE -ne 0) { Write-Error 'Virtualenv creation failed.' }
}

Write-Host '==> Installing requirements.txt' -ForegroundColor Green
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { Write-Error 'Dependency install failed.' }

if (-not (Test-Path (Join-Path $service '.env'))) {
  Copy-Item (Join-Path $service '.env.example') (Join-Path $service '.env')
  Write-Host '    created .env from .env.example' -ForegroundColor DarkGray
}

Write-Host "==> Starting uvicorn on http://127.0.0.1:$Port" -ForegroundColor Green
& $venvPython -m uvicorn app.main:app --host 127.0.0.1 --port $Port --reload
exit $LASTEXITCODE
