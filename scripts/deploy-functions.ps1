#Requires -Version 5.1
<#
.SYNOPSIS
  Deploys every Edge Function under supabase/functions with the correct flags.
  Stops at the first failure and prints a summary.
#>
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Guest-facing, webhook, mock signer, health — verify_jwt off (matches supabase/config.toml).
# admin-refund and send-order-email also have verify_jwt = false in config.toml
# (they enforce auth inside the function).
$noVerifyJwt = @(
  'create-order',
  'validate-discount',
  'submit-contact',
  'subscribe-newsletter',
  'track-order',
  'payment-webhook',
  'mock-sign-payment',
  'health',
  'admin-refund',
  'send-order-email'
)

$functionsDir = Join-Path $root 'supabase\functions'
$names = Get-ChildItem -Path $functionsDir -Directory |
  Where-Object {
    $_.Name -notlike '_*' -and
    (Test-Path (Join-Path $_.FullName 'index.ts'))
  } |
  Select-Object -ExpandProperty Name |
  Sort-Object

if ($names.Count -eq 0) {
  Write-Host "No functions found under supabase/functions" -ForegroundColor Red
  exit 1
}

$ok = @()
$failed = $null

Write-Host "Deploying $($names.Count) functions with --use-api ..." -ForegroundColor Cyan

foreach ($name in $names) {
  $deployArgs = @('supabase', 'functions', 'deploy', $name, '--use-api')
  if ($noVerifyJwt -contains $name) {
    $deployArgs += '--no-verify-jwt'
  }

  Write-Host ""
  Write-Host (">>> npx " + ($deployArgs -join ' ')) -ForegroundColor Cyan
  & npx @deployArgs
  if ($LASTEXITCODE -ne 0) {
    $failed = $name
    Write-Host "FAILED: $name (exit $LASTEXITCODE)" -ForegroundColor Red
    break
  }
  $ok += $name
  Write-Host "OK: $name" -ForegroundColor Green
}

Write-Host ""
Write-Host "======== DEPLOY SUMMARY ========" -ForegroundColor Cyan
Write-Host ("Succeeded ({0}): {1}" -f $ok.Count, ($ok -join ', '))
if ($failed) {
  Write-Host "Failed: $failed" -ForegroundColor Red
  Write-Host "Remaining not attempted: $(($names | Where-Object { $ok -notcontains $_ -and $_ -ne $failed }) -join ', ')"
  exit 1
}
Write-Host "All functions deployed." -ForegroundColor Green
exit 0
