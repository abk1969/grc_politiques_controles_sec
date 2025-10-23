#!/bin/bash
# Script Bash pour lancer l'application GRC Compliance Mapping AI
# Usage: ./start-app.sh

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}  GRC Compliance Mapping AI - Startup${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""

# Vérifier si Docker est installé et en cours d'exécution
echo -e "${YELLOW}[1/4] Vérification de Docker...${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓ Docker détecté: $DOCKER_VERSION${NC}"
else
    echo -e "${RED}✗ Docker n'est pas installé ou n'est pas dans le PATH${NC}"
    echo -e "${RED}Veuillez installer Docker: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

# Vérifier si Docker daemon est en cours d'exécution
if docker info &> /dev/null; then
    echo -e "${GREEN}✓ Docker daemon est en cours d'exécution${NC}"
else
    echo -e "${RED}✗ Docker daemon n'est pas en cours d'exécution${NC}"
    echo -e "${RED}Veuillez démarrer Docker${NC}"
    exit 1
fi

echo ""

# Démarrer les services Docker (backend + PostgreSQL)
echo -e "${YELLOW}[2/4] Démarrage des services Docker (Backend + PostgreSQL)...${NC}"
echo -e "${GRAY}Cela peut prendre quelques minutes lors du premier démarrage...${NC}"

docker compose up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Services Docker démarrés avec succès${NC}"
else
    echo -e "${RED}✗ Erreur lors du démarrage des services Docker${NC}"
    exit 1
fi

echo ""

# Attendre que le backend soit prêt
echo -e "${YELLOW}[3/4] Attente du démarrage du backend (chargement du modèle ML)...${NC}"
MAX_ATTEMPTS=60
ATTEMPT=0
BACKEND_READY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ] && [ "$BACKEND_READY" = false ]; do
    if curl -s -f http://localhost:8001/health > /dev/null 2>&1; then
        BACKEND_READY=true
        echo -e "${GREEN}✓ Backend API est opérationnel${NC}"
    else
        ATTEMPT=$((ATTEMPT + 1))
        echo -n "."
        sleep 2
    fi
done

if [ "$BACKEND_READY" = false ]; then
    echo ""
    echo -e "${RED}✗ Le backend n'a pas démarré dans le temps imparti${NC}"
    echo -e "${YELLOW}Vérifiez les logs avec: docker compose logs backend${NC}"
    exit 1
fi

echo ""

# Démarrer le frontend
echo -e "${YELLOW}[4/4] Démarrage du serveur de développement frontend...${NC}"

# Vérifier si npm est installé
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm détecté: v$NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm n'est pas installé${NC}"
    echo -e "${RED}Veuillez installer Node.js: https://nodejs.org/${NC}"
    exit 1
fi

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installation des dépendances npm...${NC}"
    npm install
fi

# Démarrer le serveur frontend en arrière-plan
echo -e "${YELLOW}Démarrage du serveur Vite...${NC}"
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!

sleep 3

# Vérifier si le processus frontend est toujours en cours
if ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend démarré (PID: $FRONTEND_PID)${NC}"

    # Sauvegarder le PID pour pouvoir arrêter le frontend plus tard
    echo $FRONTEND_PID > .frontend.pid
else
    echo -e "${RED}✗ Erreur lors du démarrage du frontend${NC}"
    exit 1
fi

echo ""

# Afficher les informations de connexion
echo -e "${CYAN}==========================================${NC}"
echo -e "${GREEN}  Application démarrée avec succès!${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""
echo -e "${NC}URLs disponibles:${NC}"
echo -e "  ${CYAN}Frontend (dev):    http://localhost:3002${NC}"
echo -e "  ${GRAY}                   http://localhost:3003 (si 3002 occupé)${NC}"
echo -e "  ${CYAN}Frontend (Docker): http://localhost:3001${NC}"
echo -e "  ${CYAN}Backend API:       http://localhost:8001${NC}"
echo -e "  ${CYAN}API Docs:          http://localhost:8001/docs${NC}"
echo -e "  ${CYAN}PostgreSQL:        localhost:5433${NC}"
echo ""
echo -e "${NC}Services Docker:${NC}"
docker compose ps
echo ""
echo -e "${YELLOW}Pour arrêter l'application:${NC}"
echo -e "  ${GRAY}1. Arrêter le frontend: ./stop-app.sh${NC}"
echo -e "  ${GRAY}   OU: kill \$(cat .frontend.pid)${NC}"
echo -e "  ${GRAY}2. Arrêter Docker: docker compose down${NC}"
echo ""
echo -e "${YELLOW}Pour voir les logs:${NC}"
echo -e "  ${GRAY}Backend:  docker compose logs backend -f${NC}"
echo -e "  ${GRAY}Frontend: docker compose logs frontend -f${NC}"
echo -e "  ${GRAY}Postgres: docker compose logs postgres -f${NC}"
echo ""
echo -e "${GRAY}PID du frontend sauvegardé dans .frontend.pid${NC}"
echo ""
