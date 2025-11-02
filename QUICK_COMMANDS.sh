#!/bin/bash

# 🚀 Commandes Rapides - Enrichissement Agentique
# Usage: source QUICK_COMMANDS.sh

echo "📋 Commandes Rapides Disponibles:"
echo "=================================="
echo ""

# 1. Déployer
deploy_enrichment() {
    echo "🚀 Déploiement de l'enrichissement agentique..."
    echo ""
    
    echo "1️⃣  Appliquer la migration SQL..."
    psql -U grc_user -d grc_compliance -h localhost -f database/migration_add_enriched_fields.sql
    
    echo ""
    echo "2️⃣  Redémarrer les services..."
    docker compose down
    docker compose up -d --build
    
    echo ""
    echo "3️⃣  Attendre le démarrage..."
    sleep 5
    
    echo ""
    echo "4️⃣  Vérifier la santé..."
    curl -s http://localhost:8001/health | jq .
    
    echo ""
    echo "✅ Déploiement terminé!"
}

# 2. Tester
test_enrichment() {
    echo "🧪 Exécution des tests..."
    chmod +x test_enrichment.sh
    bash test_enrichment.sh
}

# 3. Vérifier les données
check_data() {
    echo "📊 Vérification des données enrichies..."
    psql -U grc_user -d grc_compliance -h localhost -c "
    SELECT 
      COUNT(*) as total_mappings,
      COUNT(threat) as with_threat,
      COUNT(risk) as with_risk,
      COUNT(control_implementation) as with_impl,
      ROUND(100.0 * COUNT(threat) / COUNT(*), 2) as coverage_pct
    FROM compliance_mappings;"
}

# 4. Vérifier les logs
check_logs() {
    echo "📝 Logs du frontend (enrichissement)..."
    docker compose logs frontend | grep -i "enrichissement" | tail -20
}

# 5. Vérifier la santé
check_health() {
    echo "🏥 Vérification de la santé des services..."
    echo ""
    echo "Backend:"
    curl -s http://localhost:8001/health | jq .
    echo ""
    echo "Services Docker:"
    docker compose ps
}

# 6. Rollback
rollback_enrichment() {
    echo "⚠️  Rollback de l'enrichissement..."
    echo ""
    echo "1️⃣  Arrêter les services..."
    docker compose down
    echo ""
    echo "2️⃣  Supprimer les colonnes..."
    psql -U grc_user -d grc_compliance -h localhost -c "
    ALTER TABLE compliance_mappings DROP COLUMN IF EXISTS threat;
    ALTER TABLE compliance_mappings DROP COLUMN IF EXISTS risk;
    ALTER TABLE compliance_mappings DROP COLUMN IF EXISTS control_implementation;"
    echo ""
    echo "3️⃣  Redémarrer les services..."
    docker compose up -d --build
    echo ""
    echo "✅ Rollback terminé!"
}

# 7. Afficher les résultats enrichis
show_enriched() {
    echo "📋 Résultats enrichis (premiers 5)..."
    psql -U grc_user -d grc_compliance -h localhost -c "
    SELECT 
      id,
      requirement_id,
      threat,
      risk,
      control_implementation
    FROM compliance_mappings 
    WHERE threat IS NOT NULL 
    LIMIT 5;"
}

# 8. Afficher les statistiques
show_stats() {
    echo "📊 Statistiques d'enrichissement..."
    psql -U grc_user -d grc_compliance -h localhost -c "
    SELECT 
      mapping_source,
      COUNT(*) as count,
      COUNT(threat) as with_threat,
      COUNT(risk) as with_risk,
      COUNT(control_implementation) as with_impl
    FROM compliance_mappings
    GROUP BY mapping_source;"
}

# 9. Nettoyer les logs
clean_logs() {
    echo "🧹 Nettoyage des logs..."
    docker compose logs --tail 0 -f > /dev/null 2>&1 &
    echo "✅ Logs nettoyés!"
}

# 10. Afficher l'aide
show_help() {
    echo "📚 Commandes Disponibles:"
    echo ""
    echo "  deploy_enrichment    - Déployer l'enrichissement (5 min)"
    echo "  test_enrichment      - Exécuter les tests"
    echo "  check_data           - Vérifier les données enrichies"
    echo "  check_logs           - Vérifier les logs d'enrichissement"
    echo "  check_health         - Vérifier la santé des services"
    echo "  rollback_enrichment  - Rollback de l'enrichissement"
    echo "  show_enriched        - Afficher les résultats enrichis"
    echo "  show_stats           - Afficher les statistiques"
    echo "  clean_logs           - Nettoyer les logs"
    echo "  show_help            - Afficher cette aide"
    echo ""
    echo "Usage: source QUICK_COMMANDS.sh && deploy_enrichment"
}

# Afficher l'aide au chargement
show_help

