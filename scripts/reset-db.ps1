<#
  BinAlert — rebuild the database from scratch (Windows PowerShell).
  DROPS ALL DATA, re-applies migrations, then loads the demo seed.

    .\scripts\reset-db.ps1            reset + seed
    .\scripts\reset-db.ps1 -NoSeed    reset only
#>
param([switch]$NoSeed)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$server = Join-Path $root 'server'

if (-not (Test-Path (Join-Path $server '.env'))) {
  Write-Error 'server\.env is missing. Run .\scripts\setup.ps1 first, or copy server\.env.example to server\.env.'
}

Set-Location $server

Write-Host '==> Resetting the database (all data will be deleted)' -ForegroundColor Yellow
& npm.cmd run prisma:reset
if ($LASTEXITCODE -ne 0) { Write-Error 'prisma migrate reset failed — is PostgreSQL running and DATABASE_URL correct?' }

if (-not $NoSeed) {
  Write-Host '==> Seeding demo data' -ForegroundColor Green
  & npm.cmd run db:seed
  if ($LASTEXITCODE -ne 0) { Write-Error 'Seeding failed.' }
}

Write-Host '==> Done. Optional: npm run db:studio to browse the data.' -ForegroundColor Green
