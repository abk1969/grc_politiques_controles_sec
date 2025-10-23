#!/bin/bash
# Script Bash pour arrêter l'application GRC Compliance Mapping AI
# Usage: ./stop-app.sh

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}  GRC Compliance Mapping AI - Shutdown${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""

# Arrêter le frontend
echo -e "${YELLOW}[1/2] Arrêt du serveur frontend...${NC}"
if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill $FRONTEND_PID
        echo -e "${GREEN}✓ Frontend arrêté (PID: $FRONTEND_PID)${NC}"
        rm .frontend.pid
    else
        echo -e "${YELLOW}⚠ Le processus frontend n'est pas en cours d'exécution${NC}"
        rm .frontend.pid
    fi
else
    echo -e "${YELLOW}⚠ Fichier .frontend.pid non trouvé${NC}"
    echo -e "${YELLOW}Tentative d'arrêt de tous les processus npm...${NC}"
    pkill -f "vite" || echo -e "${YELLOW}Aucun processus Vite trouvé${NC}"
fi

echo ""

# Arrêter les services Docker
echo -e "${YELLOW}[2/2] Arrêt des services Docker...${NC}"
docker compose down

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Services Docker arrêtés avec succès${NC}"
else
    echo -e "${RED}✗ Erreur lors de l'arrêt des services Docker${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Application arrêtée avec succès!${NC}"
echo ""
