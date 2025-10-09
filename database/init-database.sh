#!/bin/bash

# ============================================
# Script d'initialisation de la base de données PostgreSQL
# ============================================

echo "🚀 Initialisation de la base de données GRC Compliance..."

# Configuration
DB_NAME="grc_compliance"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Vérifier si PostgreSQL est installé
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

print_success "PostgreSQL détecté: $(psql --version)"

# Vérifier si la base de données existe déjà
DB_EXISTS=$(psql -U $DB_USER -h $DB_HOST -p $DB_PORT -lqt | cut -d \| -f 1 | grep -w $DB_NAME | wc -l)

if [ $DB_EXISTS -eq 1 ]; then
    print_info "La base de données '$DB_NAME' existe déjà"
    read -p "Voulez-vous la supprimer et la recréer? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Suppression de la base de données existante..."
        dropdb -U $DB_USER -h $DB_HOST -p $DB_PORT $DB_NAME
        print_success "Base de données supprimée"
    else
        print_info "Utilisation de la base de données existante"
    fi
fi

# Créer la base de données si elle n'existe pas
if [ $DB_EXISTS -eq 0 ] || [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Création de la base de données '$DB_NAME'..."
    createdb -U $DB_USER -h $DB_HOST -p $DB_PORT $DB_NAME
    
    if [ $? -eq 0 ]; then
        print_success "Base de données '$DB_NAME' créée"
    else
        print_error "Erreur lors de la création de la base de données"
        exit 1
    fi
fi

# Exécuter le schéma SQL
print_info "Exécution du schéma SQL..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f database/schema.sql

if [ $? -eq 0 ]; then
    print_success "Schéma SQL exécuté avec succès"
else
    print_error "Erreur lors de l'exécution du schéma SQL"
    exit 1
fi

# Afficher les tables créées
print_info "Tables créées:"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\dt"

# Afficher les vues créées
print_info "Vues créées:"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\dv"

# Créer le fichier .env.local avec les informations de connexion
print_info "Création du fichier de configuration..."

# Lire le contenu existant de .env.local
if [ -f .env.local ]; then
    # Vérifier si DATABASE_URL existe déjà
    if grep -q "DATABASE_URL" .env.local; then
        print_info "DATABASE_URL existe déjà dans .env.local"
    else
        # Ajouter DATABASE_URL
        echo "" >> .env.local
        echo "# PostgreSQL Database" >> .env.local
        echo "DATABASE_URL=postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME" >> .env.local
        print_success "DATABASE_URL ajouté à .env.local"
    fi
else
    print_error ".env.local n'existe pas"
fi

# Résumé
echo ""
print_success "============================================"
print_success "Base de données initialisée avec succès!"
print_success "============================================"
echo ""
print_info "Informations de connexion:"
echo "  Base de données: $DB_NAME"
echo "  Utilisateur: $DB_USER"
echo "  Hôte: $DB_HOST"
echo "  Port: $DB_PORT"
echo ""
print_info "Chaîne de connexion:"
echo "  postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
print_info "Prochaines étapes:"
echo "  1. Installer les dépendances: npm install pg prisma"
echo "  2. Importer les données SCF: npm run import:scf"
echo "  3. Lancer l'application: npm run dev"
echo ""

