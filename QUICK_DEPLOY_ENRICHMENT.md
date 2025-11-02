# ⚡ Déploiement Rapide - Enrichissement Agentique

## 🚀 En 5 Minutes

### Étape 1: Appliquer la Migration (1 min)
```bash
# Connexion à PostgreSQL et application de la migration
psql -U grc_user -d grc_compliance -h localhost -f database/migration_add_enriched_fields.sql

# Vérifier que les colonnes existent
psql -U grc_user -d grc_compliance -h localhost -c "
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'compliance_mappings' 
AND column_name IN ('threat', 'risk', 'control_implementation');"
```

**Résultat attendu:**
```
 column_name
─────────────────────────
 threat
 risk
 control_implementation
(3 rows)
```

---

### Étape 2: Redémarrer les Services (2 min)
```bash
# Arrêter les services
docker compose down

# Reconstruire et redémarrer
docker compose up -d --build

# Vérifier que tout est démarré
docker compose ps
```

**Résultat attendu:**
```
NAME                COMMAND                  SERVICE             STATUS
grc-backend-1       "python main.py"         backend             Up
grc-frontend-1      "npm run dev"            frontend            Up
grc-postgres-1      "docker-entrypoint..."   postgres            Up
```

---

### Étape 3: Tester le Flux (2 min)

#### Option A: Avec Docker
```bash
# Vérifier les logs
docker compose logs -f frontend | grep -i "enrichissement"
```

#### Option B: Avec le Script de Test
```bash
# Rendre le script exécutable
chmod +x test_enrichment.sh

# Exécuter les tests
bash test_enrichment.sh
```

**Résultat attendu:**
```
✅ Connexion PostgreSQL réussie
✅ Les 3 colonnes enrichies existent
✅ Backend API accessible
✅ Modèles Python corrects
✅ Schémas Pydantic corrects
✅ Fonction enrichResultsWithAgenticAnalysis existe
✅ App.tsx utilise enrichResultsWithAgenticAnalysis
✅ Vérification des données réussie
✅ Indexes créés (3)
```

---

## 🧪 Test Manuel du Flux Complet

### 1. Accéder à l'Application
```
Frontend: http://localhost:3002
Backend API: http://localhost:8001/docs
```

### 2. Uploader un Fichier Excel
- Cliquer sur "Nouvelle Analyse"
- Sélectionner un fichier Excel avec des exigences
- Mapper les colonnes (ID, Exigence, Point de vérification)

### 3. Observer la Progression
```
Console Frontend (F12):
✅ Analyse Claude terminée: X résultats
🤖 Enrichissement agentique en cours...
✅ Enrichissement agentique terminé: X résultats enrichis
💾 Sauvegarde des résultats Claude dans PostgreSQL...
✅ X résultats Claude sauvegardés
```

### 4. Vérifier le Dashboard
- Aller à l'onglet "Exigences"
- Vérifier que les colonnes sont remplies:
  - ✅ Mappings (SCF / ISO / COBIT)
  - ✅ Menaces & Risques
  - ✅ Implémentation

---

## 🔍 Vérification des Données

### Vérifier les Mappings Enrichis
```sql
-- Connexion à PostgreSQL
psql -U grc_user -d grc_compliance -h localhost

-- Vérifier les données enrichies
SELECT 
  id,
  requirement_id,
  threat,
  risk,
  control_implementation
FROM compliance_mappings 
WHERE threat IS NOT NULL 
LIMIT 5;
```

### Statistiques
```sql
SELECT 
  COUNT(*) as total_mappings,
  COUNT(threat) as with_threat,
  COUNT(risk) as with_risk,
  COUNT(control_implementation) as with_implementation,
  ROUND(100.0 * COUNT(threat) / COUNT(*), 2) as threat_coverage_pct
FROM compliance_mappings;
```

---

## 🐛 Troubleshooting Rapide

### Problème: "Colonne n'existe pas"
```bash
# Solution: Appliquer la migration
psql -U grc_user -d grc_compliance -h localhost -f database/migration_add_enriched_fields.sql
```

### Problème: Champs enrichis vides
```bash
# Vérifier les logs
docker compose logs frontend | tail -50

# Vérifier que l'enrichissement s'exécute
docker compose logs frontend | grep -i "enrichissement"
```

### Problème: Erreur "API non disponible"
```bash
# Vérifier que le backend est démarré
curl http://localhost:8001/health

# Redémarrer si nécessaire
docker compose restart backend
```

### Problème: Enrichissement très lent
```
C'est normal! L'enrichissement utilise 8 agents spécialisés.
Temps estimé: 6-8 secondes par exigence
Pour 10 exigences: ~60-80 secondes
```

---

## ✅ Checklist Post-Déploiement

- [ ] Migration SQL appliquée
- [ ] Services redémarrés
- [ ] Tests passent (`bash test_enrichment.sh`)
- [ ] Upload Excel fonctionne
- [ ] Enrichissement s'exécute (vérifier logs)
- [ ] Champs enrichis visibles au dashboard
- [ ] Données sauvegardées en BD
- [ ] Pas de crash en cas d'erreur

---

## 📊 Résultats Attendus

### Dashboard - Avant
```
Mappings (SCF / ISO / COBIT): [Vides]
Menaces & Risques: [Non analysé]
Implémentation: [Non disponible]
```

### Dashboard - Après
```
Mappings (SCF / ISO / COBIT): [Remplis par Claude]
Menaces & Risques: [Remplis par Enrichissement]
Implémentation: [Remplis par Enrichissement]
```

---

## 🎉 Succès!

Si vous voyez les champs enrichis au dashboard, c'est que tout fonctionne! 🚀

Pour plus de détails, consultez:
- `ENRICHMENT_IMPLEMENTATION_GUIDE.md` - Guide complet
- `ENRICHMENT_CHANGES_SUMMARY.md` - Résumé des changements

