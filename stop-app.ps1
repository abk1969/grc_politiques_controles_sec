# Script PowerShell pour arrêter l'application GRC Compliance Mapping AI
# Usage: .\stop-app.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  GRC Compliance Mapping AI - Shutdown" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Arrêter le frontend
Write-Host "[1/2] Arrêt du serveur frontend..." -ForegroundColor Yellow

# Trouver et arrêter les processus npm/node liés à Vite
$viteProcesses = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*vite*"
}

if ($viteProcesses) {
    foreach ($process in $viteProcesses) {
        Stop-Process -Id $process.Id -Force
        Write-Host "✓ Processus frontend arrêté (PID: $($process.Id))" -ForegroundColor Green
    }
} else {
    Write-Host "⚠ Aucun processus frontend en cours d'exécution" -ForegroundColor Yellow
}

Write-Host ""

# Arrêter les services Docker
Write-Host "[2/2] Arrêt des services Docker..." -ForegroundColor Yellow
docker compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Services Docker arrêtés avec succès" -ForegroundColor Green
} else {
    Write-Host "✗ Erreur lors de l'arrêt des services Docker" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Application arrêtée avec succès!" -ForegroundColor Green
Write-Host ""
