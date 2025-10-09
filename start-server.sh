#!/bin/bash

echo "========================================"
echo "  GRC Compliance Mapping AI"
echo "  Démarrage du serveur..."
echo "========================================"
echo ""

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "ERREUR: Node.js n'est pas installé ou n'est pas dans le PATH"
    echo "Veuillez installer Node.js depuis https://nodejs.org/"
    exit 1
fi

echo "Node.js version:"
node --version
echo ""

# Vérifier si les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo "Installation des dépendances..."
    npm install
    echo ""
fi

# Construire l'application si dist n'existe pas
if [ ! -d "dist" ]; then
    echo "Construction de l'application..."
    npm run build
    echo ""
fi

echo "Démarrage du serveur sur http://localhost:3000"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter le serveur"
echo ""
echo "========================================"
echo ""

# Démarrer le serveur simple
node serve.js

