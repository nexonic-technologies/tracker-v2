# deploy.ps1 — Manually trigger Vercel redeploy for tracker-v2 (staging)
# Usage: .\deploy.ps1 [-Force]

param (
  [switch]$Force
)

Write-Host "🔍 Running Pre-flight Deployment Version Check..." -ForegroundColor Cyan

if (-not $Force) {
  node ./scripts/verify-deploy-version.mjs --target=frontend
  if ($LASTEXITCODE -ne 0) {
    Write-Host "🛑 Deploy aborted: Frontend version verification failed." -ForegroundColor Red
    Write-Host "   Bump version with 'npm run version:bump patch' or use '.\deploy.ps1 -Force'" -ForegroundColor Yellow
    exit 1
  }
} else {
  Write-Host "⚠️  -Force flag supplied: bypassing local version verification." -ForegroundColor Yellow
}

Write-Host "🚀 Triggering Vercel redeploy..." -ForegroundColor Cyan

$response = Invoke-WebRequest `
  -Uri "https://api.vercel.com/v1/integrations/deploy/prj_UdXVQYNkXFhYLyfkSA0qPDcA9WU6/M1yqwixl80" `
  -Method GET `
  -UseBasicParsing

if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
  Write-Host "✅ Deploy triggered successfully (HTTP $($response.StatusCode))." -ForegroundColor Green
  Write-Host "   Check: https://workhub-teal-gamma.vercel.app/" -ForegroundColor Gray
} else {
  Write-Host "❌ Deploy trigger failed. Status: $($response.StatusCode)" -ForegroundColor Red
}
