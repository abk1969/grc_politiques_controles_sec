# Script PowerShell pour lancer l'application GRC Compliance Mapping AI
# Usage: .\start-app.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  GRC Compliance Mapping AI - Startup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Docker est installé et en cours d'exécution
Write-Host "[1/4] Vérification de Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker détecté: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    Write-Host "Veuillez installer Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    exit 1
}

# Vérifier si Docker daemon est en cours d'exécution
try {
    docker info | Out-Null
    Write-Host "✓ Docker daemon est en cours d'exécution" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker daemon n'est pas en cours d'exécution" -ForegroundColor Red
    Write-Host "Veuillez démarrer Docker Desktop" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Démarrer les services Docker (backend + PostgreSQL)
Write-Host "[2/4] Démarrage des services Docker (Backend + PostgreSQL)..." -ForegroundColor Yellow
Write-Host "Cela peut prendre quelques minutes lors du premier démarrage..." -ForegroundColor Gray

docker compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Services Docker démarrés avec succès" -ForegroundColor Green
} else {
    Write-Host "✗ Erreur lors du démarrage des services Docker" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Attendre que le backend soit prêt
Write-Host "[3/4] Attente du démarrage du backend (chargement du modèle ML)..." -ForegroundColor Yellow
$maxAttempts = 60
$attempt = 0
$backendReady = $false

while ($attempt -lt $maxAttempts -and -not $backendReady) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            Write-Host "✓ Backend API est opérationnel" -ForegroundColor Green
        }
    } catch {
        $attempt++
        Write-Host "." -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Host ""
    Write-Host "✗ Le backend n'a pas démarré dans le temps imparti" -ForegroundColor Red
    Write-Host "Vérifiez les logs avec: docker compose logs backend" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Démarrer le frontend
Write-Host "[4/4] Démarrage du serveur de développement frontend..." -ForegroundColor Yellow

# Vérifier si npm est installé
try {
    $npmVersion = npm --version
    Write-Host "✓ npm détecté: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm n'est pas installé" -ForegroundColor Red
    Write-Host "Veuillez installer Node.js: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Installer les dépendances si nécessaire
if (-not (Test-Path "node_modules")) {
    Write-Host "Installation des dépendances npm..." -ForegroundColor Yellow
    npm install
}

# Démarrer le serveur frontend en arrière-plan
Write-Host "Démarrage du serveur Vite..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev"

Start-Sleep -Seconds 3

Write-Host "✓ Frontend démarré" -ForegroundColor Green
Write-Host ""

# Afficher les informations de connexion
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Application démarrée avec succès!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs disponibles:" -ForegroundColor White
Write-Host "  Frontend (dev):    http://localhost:3002" -ForegroundColor Cyan
Write-Host "                     http://localhost:3003 (si 3002 occupé)" -ForegroundColor Gray
Write-Host "  Frontend (Docker): http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Backend API:       http://localhost:8001" -ForegroundColor Cyan
Write-Host "  API Docs:          http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host "  PostgreSQL:        localhost:5433" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services Docker:" -ForegroundColor White
docker compose ps
Write-Host ""
Write-Host "Pour arrêter l'application:" -ForegroundColor Yellow
Write-Host "  1. Arrêter le frontend: Ctrl+C dans la fenêtre du serveur Vite" -ForegroundColor Gray
Write-Host "  2. Arrêter Docker: docker compose down" -ForegroundColor Gray
Write-Host ""
Write-Host "Pour voir les logs:" -ForegroundColor Yellow
Write-Host "  Backend:  docker compose logs backend -f" -ForegroundColor Gray
Write-Host "  Frontend: docker compose logs frontend -f" -ForegroundColor Gray
Write-Host "  Postgres: docker compose logs postgres -f" -ForegroundColor Gray
Write-Host ""
