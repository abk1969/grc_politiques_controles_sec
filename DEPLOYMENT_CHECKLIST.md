# ✅ Checklist de Déploiement - Enrichissement Agentique

## 📋 Avant le Déploiement

### Préparation
- [ ] Lire `IMPLEMENTATION_COMPLETE.md`
- [ ] Lire `QUICK_DEPLOY_ENRICHMENT.md`
- [ ] Sauvegarder la base de données
- [ ] Vérifier que Docker est démarré
- [ ] Vérifier que PostgreSQL est accessible

### Vérification des Fichiers
- [ ] `backend/models.py` - Modifié ✅
- [ ] `backend/schemas.py` - Modifié ✅
- [ ] `backend/main.py` - Modifié ✅
- [ ] `services/mlService.ts` - Modifié ✅
- [ ] `App.tsx` - Modifié ✅
- [ ] `database/migration_add_enriched_fields.sql` - Créé ✅

---

## 🚀 Déploiement (5 minutes)

### Étape 1: Migration SQL (1 min)
```bash
psql -U grc_user -d grc_compliance -h localhost -f database/migration_add_enriched_fields.sql
```
- [ ] Commande exécutée sans erreur
- [ ] Vérifier les colonnes:
  ```bash
  psql -U grc_user -d grc_compliance -h localhost -c "
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'compliance_mappings' 
  AND column_name IN ('threat', 'risk', 'control_implementation');"
  ```
- [ ] 3 colonnes affichées

### Étape 2: Arrêter les Services (30 sec)
```bash
docker compose down
```
- [ ] Tous les services arrêtés
- [ ] Vérifier: `docker compose ps` (aucun service)

### Étape 3: Reconstruire et Redémarrer (2 min)
```bash
docker compose up -d --build
```
- [ ] Tous les services démarrés
- [ ] Vérifier: `docker compose ps` (3 services UP)

### Étape 4: Vérifier la Santé (1 min)
```bash
# Vérifier le backend
curl http://localhost:8001/health

# Vérifier les logs
docker compose logs backend | tail -20
docker compose logs frontend | tail -20
```
- [ ] Backend répond (status: healthy)
- [ ] Pas d'erreurs critiques dans les logs

---

## 🧪 Tests Post-Déploiement

### Test 1: Automatisé (1 min)
```bash
chmod +x test_enrichment.sh
bash test_enrichment.sh
```
- [ ] Tous les tests passent (✅ 9/9)

### Test 2: Manuel - Upload Excel (3 min)
1. [ ] Accéder à http://localhost:3002
2. [ ] Cliquer "Nouvelle Analyse"
3. [ ] Uploader un fichier Excel
4. [ ] Mapper les colonnes
5. [ ] Observer la progression:
   - [ ] "Analyse Claude terminée"
   - [ ] "Enrichissement agentique en cours"
   - [ ] "Enrichissement agentique terminé"
   - [ ] "Résultats Claude sauvegardés"

### Test 3: Vérifier le Dashboard (2 min)
1. [ ] Aller à l'onglet "Exigences"
2. [ ] Vérifier les colonnes:
   - [ ] "Mappings (SCF / ISO / COBIT)" - Remplis
   - [ ] "Menaces & Risques" - Remplis
   - [ ] "Implémentation" - Remplis
3. [ ] Cliquer sur une exigence pour voir les détails

### Test 4: Vérifier les Données en BD (1 min)
```sql
psql -U grc_user -d grc_compliance -h localhost -c "
SELECT COUNT(*) as total, 
       COUNT(threat) as with_threat,
       COUNT(risk) as with_risk,
       COUNT(control_implementation) as with_impl
FROM compliance_mappings;"
```
- [ ] Résultats affichés
- [ ] Colonnes enrichies non nulles

---

## 🔍 Vérifications Supplémentaires

### Vérifier les Logs
```bash
# Frontend
docker compose logs frontend | grep -i "enrichissement"

# Backend
docker compose logs backend | grep -i "enrichi"
```
- [ ] Logs d'enrichissement visibles
- [ ] Pas d'erreurs critiques

### Vérifier les Performances
```bash
# Mesurer le temps d'enrichissement
docker compose logs frontend | grep "Enrichissement agentique"
```
- [ ] Temps raisonnable (~6-8s par exigence)

### Vérifier la Stabilité
- [ ] Pas de crash après 10 uploads
- [ ] Pas de fuite mémoire
- [ ] Pas de timeout

---

## ✅ Validation Finale

### Checklist Complète
- [ ] Migration SQL appliquée
- [ ] Services redémarrés
- [ ] Tests automatisés passent
- [ ] Upload Excel fonctionne
- [ ] Enrichissement s'exécute
- [ ] Champs enrichis visibles
- [ ] Données sauvegardées en BD
- [ ] Pas de crash
- [ ] Logs propres
- [ ] Performances acceptables

### Résultat Final
- [ ] **SUCCÈS**: Tous les champs sont remplis au dashboard! 🎉

---

## 🚨 En Cas de Problème

### Problème: Colonnes manquantes
```bash
# Solution
psql -U grc_user -d grc_compliance -h localhost -f database/migration_add_enriched_fields.sql
```

### Problème: Services ne démarrent pas
```bash
# Vérifier les logs
docker compose logs

# Redémarrer
docker compose restart
```

### Problème: Enrichissement échoue
```bash
# Vérifier les logs
docker compose logs frontend | tail -50

# Vérifier que Claude API est disponible
echo $ANTHROPIC_API_KEY
```

### Problème: Champs enrichis vides
```bash
# Vérifier que l'enrichissement s'exécute
docker compose logs frontend | grep -i "enrichissement"

# Vérifier les données en BD
psql -U grc_user -d grc_compliance -h localhost -c "
SELECT threat, risk, control_implementation 
FROM compliance_mappings LIMIT 5;"
```

---

## 📞 Support

**Besoin d'aide?**
1. Consulter `QUICK_DEPLOY_ENRICHMENT.md`
2. Consulter `ENRICHMENT_IMPLEMENTATION_GUIDE.md`
3. Exécuter `bash test_enrichment.sh`
4. Vérifier les logs: `docker compose logs -f`

---

## 🎉 Succès!

Si vous avez coché toutes les cases, le déploiement est réussi! 🚀

Les champs enrichis sont maintenant remplis automatiquement au dashboard.

**Prochaines étapes:**
- Monitorer les performances
- Collecter les retours utilisateurs
- Envisager les améliorations futures (parallélisation, cache, etc.)

