#Requires -Version 5.1
<#
.SYNOPSIS
  Checks that expected Supabase Edge Function secret names are present.
  Does not print secret values.
#>
$ErrorActionPreference = 'Continue'

$requiredSecrets = @(
  'APP_URL',
  'EMAIL_FROM',
  'PAYMENT_PROVIDER',
  'PAYMENT_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'STORE_NOTIFY_EMAIL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY'
)

Write-Host "Running: npx supabase secrets list" -ForegroundColor Cyan
$rawLines = @(& npx supabase secrets list --output json 2>&1 | ForEach-Object { "$_" })
$exit = $LASTEXITCODE
if ($exit -ne 0) {
  Write-Host "FAILED: supabase secrets list (exit $exit)" -ForegroundColor Red
  Write-Host ($rawLines -join "`n")
  exit 1
}

$present = [System.Collections.Generic.HashSet[string]]::new()
foreach ($line in $rawLines) {
  if ($line -match '"name"\s*:\s*"([^"]+)"') {
    [void]$present.Add($Matches[1])
  }
}

if ($present.Count -eq 0) {
  Write-Host "FAILED: no secret names parsed from CLI output" -ForegroundColor Red
  Write-Host ($rawLines -join "`n")
  exit 1
}

Write-Host ""
Write-Host "Present secrets:" -ForegroundColor Green
$present | Sort-Object | ForEach-Object { Write-Host "  $_" }

$missing = @($requiredSecrets | Where-Object { -not $present.Contains($_) })

Write-Host ""
if ($missing.Count -eq 0) {
  Write-Host "OK: all required secret names are set." -ForegroundColor Green
  exit 0
}

Write-Host "MISSING secret names:" -ForegroundColor Yellow
$missing | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
exit 2
