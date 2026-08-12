#!/usr/bin/env pwsh
# deploy.ps1 — Manually trigger Vercel redeploy for tracker-v2 (staging)
# Usage: .\deploy.ps1

Write-Host "🚀 Triggering Vercel redeploy..." -ForegroundColor Cyan

$response = Invoke-WebRequest `
  -Uri "https://api.vercel.com/v1/integrations/deploy/prj_UdXVQYNkXFhYLyfkSA0qPDcA9WU6/M1yqwixl80" `
  -Method GET `
  -UseBasicParsing

if ($response.StatusCode -eq 200) {
  Write-Host "✅ Deploy triggered successfully." -ForegroundColor Green
  Write-Host "   Check: https://workhub-teal-gamma.vercel.app/" -ForegroundColor Gray
} else {
  Write-Host "❌ Deploy trigger failed. Status: $($response.StatusCode)" -ForegroundColor Red
}
