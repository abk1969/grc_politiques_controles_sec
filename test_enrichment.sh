#!/bin/bash

# Script de test pour vérifier l'implémentation de l'enrichissement agentique
# Usage: bash test_enrichment.sh

set -e

echo "🧪 Test d'Implémentation - Enrichissement Agentique"
echo "=================================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_USER="grc_user"
DB_NAME="grc_compliance"
DB_HOST="localhost"
API_URL="http://localhost:8001"

# Fonction pour afficher les résultats
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        exit 1
    fi
}

# Test 1: Vérifier la connexion à PostgreSQL
echo "Test 1: Connexion à PostgreSQL..."
psql -U $DB_USER -d $DB_NAME -h $DB_HOST -c "SELECT 1;" > /dev/null 2>&1
test_result $? "Connexion PostgreSQL réussie"

# Test 2: Vérifier que les colonnes existent
echo ""
echo "Test 2: Vérifier les colonnes enrichies..."
COLUMNS=$(psql -U $DB_USER -d $DB_NAME -h $DB_HOST -t -c "
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'compliance_mappings' 
AND column_name IN ('threat', 'risk', 'control_implementation');
")

if [ "$COLUMNS" -eq 3 ]; then
    test_result 0 "Les 3 colonnes enrichies existent"
else
    echo -e "${YELLOW}⚠️  Colonnes manquantes ($COLUMNS/3). Appliquer la migration...${NC}"
    psql -U $DB_USER -d $DB_NAME -h $DB_HOST -f database/migration_add_enriched_fields.sql
    test_result $? "Migration appliquée"
fi

# Test 3: Vérifier la connexion au backend
echo ""
echo "Test 3: Connexion au backend API..."
curl -s "$API_URL/health" > /dev/null 2>&1
test_result $? "Backend API accessible"

# Test 4: Vérifier les modèles Python
echo ""
echo "Test 4: Vérifier les modèles Python..."
python3 -c "
from backend.models import ComplianceMapping
import inspect

# Vérifier que les colonnes existent
cols = [c.name for c in ComplianceMapping.__table__.columns]
required = ['threat', 'risk', 'control_implementation']
for col in required:
    if col not in cols:
        raise Exception(f'Colonne {col} manquante')
print('OK')
" > /dev/null 2>&1
test_result $? "Modèles Python corrects"

# Test 5: Vérifier les schémas Pydantic
echo ""
echo "Test 5: Vérifier les schémas Pydantic..."
python3 -c "
from backend.schemas import MappingBase
import inspect

# Vérifier que les champs existent
fields = MappingBase.model_fields.keys()
required = ['threat', 'risk', 'control_implementation']
for field in required:
    if field not in fields:
        raise Exception(f'Champ {field} manquant')
print('OK')
" > /dev/null 2>&1
test_result $? "Schémas Pydantic corrects"

# Test 6: Vérifier les fichiers TypeScript
echo ""
echo "Test 6: Vérifier les fichiers TypeScript..."
if grep -q "enrichResultsWithAgenticAnalysis" services/mlService.ts; then
    test_result 0 "Fonction enrichResultsWithAgenticAnalysis existe"
else
    test_result 1 "Fonction enrichResultsWithAgenticAnalysis manquante"
fi

# Test 7: Vérifier App.tsx
echo ""
echo "Test 7: Vérifier App.tsx..."
if grep -q "enrichResultsWithAgenticAnalysis" App.tsx; then
    test_result 0 "App.tsx utilise enrichResultsWithAgenticAnalysis"
else
    test_result 1 "App.tsx n'utilise pas enrichResultsWithAgenticAnalysis"
fi

# Test 8: Vérifier les données en BD
echo ""
echo "Test 8: Vérifier les données enrichies en BD..."
ENRICHED_COUNT=$(psql -U $DB_USER -d $DB_NAME -h $DB_HOST -t -c "
SELECT COUNT(*) FROM compliance_mappings 
WHERE threat IS NOT NULL OR risk IS NOT NULL OR control_implementation IS NOT NULL;
")
echo "   Mappings enrichis trouvés: $ENRICHED_COUNT"
test_result 0 "Vérification des données réussie"

# Test 9: Vérifier les indexes
echo ""
echo "Test 9: Vérifier les indexes..."
INDEXES=$(psql -U $DB_USER -d $DB_NAME -h $DB_HOST -t -c "
SELECT COUNT(*) FROM pg_indexes 
WHERE tablename = 'compliance_mappings' 
AND indexname LIKE 'idx_compliance_mappings_%';
")
if [ "$INDEXES" -ge 3 ]; then
    test_result 0 "Indexes créés ($INDEXES)"
else
    echo -e "${YELLOW}⚠️  Indexes manquants ($INDEXES/3)${NC}"
fi

# Résumé
echo ""
echo "=================================================="
echo -e "${GREEN}✅ Tous les tests sont passés!${NC}"
echo ""
echo "Prochaines étapes:"
echo "1. Redémarrer les services: docker compose down && docker compose up -d --build"
echo "2. Uploader un fichier Excel pour tester le flux complet"
echo "3. Vérifier les logs: docker compose logs -f frontend"
echo "4. Vérifier le dashboard pour les champs enrichis"
echo ""

