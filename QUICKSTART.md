# 🚀 Guide de Démarrage Rapide - MLOps GRC Compliance

Guide pas à pas pour lancer l'application complète avec le backend ML.

---

## ✅ Prérequis

Avant de commencer, vérifiez que vous avez :

- [x] **Node.js 14+** installé
- [x] **Python 3.9+** installé
- [x] **PostgreSQL 12+** installé et actif
- [x] **~2 GB d'espace disque libre**
- [x] **Connexion Internet** (pour télécharger le modèle ML)

### Vérifier les installations

```bash
# Node.js
node --version  # Doit afficher v14+ ou supérieur

# Python
python --version  # Doit afficher 3.9+ ou supérieur

# PostgreSQL
psql --version  # Doit afficher 12+ ou supérieur
```

---

## 📦 Installation Complète (15 minutes)

### Étape 1 : PostgreSQL Database

```bash
# Se placer dans le répertoire du projet
cd /c/Users/globa/poli_cont_app

# Lancer le script d'initialisation
./database/init-database.sh
```

**Sur Windows (si le script bash ne fonctionne pas) :**

```bash
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE grc_compliance;"
psql -U postgres -h localhost -p 5432 -d grc_compliance -f database/schema.sql
```

**✅ Attendu :** La base `grc_compliance` est créée avec 4 tables.

---

### Étape 2 : Backend Python

```bash
# Aller dans le dossier backend
cd backend

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# Installer les dépendances (⏱️ 5-10 minutes)
pip install -r requirements.txt
```

**✅ Attendu :** Toutes les dépendances sont installées.

---

### Étape 3 : Configuration

```bash
# Vérifier que .env existe
cat .env

# Si vide ou inexistant, copier depuis .env.example
cp .env.example .env
```

**Contenu de `backend/.env` :**

```env
DATABASE_URL=postgresql://postgres@localhost:5432/grc_compliance
API_PORT=8000
```

---

### Étape 4 : Import des Contrôles SCF

```bash
# Toujours dans backend/ avec venv activé
python import_scf_controls.py
```

**✅ Attendu :** ~1450 contrôles SCF importés dans PostgreSQL.

**Sortie attendue :**

```
📂 Fichier SCF trouvé: 20250910_secure-controls-framework-scf-2025-2_vf.xlsx
📖 Lecture de la feuille: Controls
✅ Importés: 1450
```

---

### Étape 5 : Frontend React

```bash
# Retourner au répertoire racine
cd ..

# Installer les dépendances Node.js (si pas déjà fait)
npm install
```

---

## ▶️ Démarrage (2 terminaux requis)

### Terminal 1 : Backend Python

```bash
cd backend
venv\Scripts\activate  # ou source venv/bin/activate sur Linux
python main.py
```

**✅ Attendu :**

```
🤖 Chargement du modèle ML: paraphrase-multilingual-mpnet-base-v2
✅ Modèle ML chargé avec succès
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**🌐 Tester :** Ouvrir http://localhost:8000 dans le browser → Devrait afficher un message JSON.

---

### Terminal 2 : Frontend React

```bash
# Dans un NOUVEAU terminal
cd /c/Users/globa/poli_cont_app
npm run dev
```

**✅ Attendu :**

```
  VITE v6.2.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
```

**🌐 Ouvrir :** http://localhost:5173

---

## 🧪 Test de l'Application

### 1. Vérifier le Backend

```bash
# Dans un nouveau terminal ou via browser
curl http://localhost:8000/health
```

**Réponse attendue :**

```json
{
  "status": "healthy",
  "database": "connected",
  "ml_service": "ready"
}
```

---

### 2. Tester le Frontend

1. Ouvrir http://localhost:5173
2. Sélectionner un fichier Excel (par exemple : `202500908_Extratc_Exig_IA_Politiques_contrôles_vf.xlsx`)
3. Mapper les colonnes
4. Cliquer sur "Analyser"

**✅ Attendu :** Les exigences sont analysées et des mappings SCF suggérés.

---

## 🎯 Workflow Complet

```
1. User uploads Excel
        │
        ▼
2. Backend parse & insert into PostgreSQL
        │
        ▼
3. ML Service vectorize requirements (Sentence-BERT)
        │
        ▼
4. Calculate similarity with SCF controls
        │
        ▼
5. Return top 5 matches with confidence scores
        │
        ▼
6. Frontend displays results in Dashboard
```

---

## 📊 Ports Utilisés

| Service | Port | URL |
|---------|------|-----|
| **PostgreSQL** | 5432 | N/A (local only) |
| **Backend Python** | 8000 | http://localhost:8000 |
| **Frontend React** | 5173 | http://localhost:5173 |

---

## 🐛 Dépannage Rapide

### Problème : Backend ne démarre pas

**Erreur :** `ModuleNotFoundError: No module named 'fastapi'`

**Solution :**

```bash
cd backend
pip install -r requirements.txt
```

---

### Problème : Erreur de connexion PostgreSQL

**Erreur :** `connection refused`

**Solution :**

```bash
# Vérifier que PostgreSQL est actif
psql -U postgres -l

# Si pas actif, démarrer
# Windows : Services → PostgreSQL → Démarrer
# Linux : sudo systemctl start postgresql
```

---

### Problème : Frontend ne se connecte pas au backend

**Erreur :** `Failed to fetch` dans la console

**Solutions :**

1. Vérifier que le backend est lancé (http://localhost:8000)
2. Vérifier le fichier `services/mlService.ts` ligne 8 :

```typescript
const API_BASE_URL = 'http://localhost:8000';
```

3. Vérifier les CORS dans `backend/main.py` ligne 40 :

```python
allow_origins=["http://localhost:5173"]
```

---

### Problème : Modèle ML ne se télécharge pas

**Erreur :** `Connection timeout`

**Solution :**

```bash
# Télécharger manuellement le modèle
cd backend
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')"
```

---

## 🔄 Arrêter l'Application

### Arrêt propre

```bash
# Terminal 1 (Backend Python)
Ctrl + C

# Terminal 2 (Frontend React)
Ctrl + C
```

### Redémarrer

Simplement relancer les deux commandes :

```bash
# Terminal 1
cd backend && python main.py

# Terminal 2
npm run dev
```

---

## 📚 Prochaines Étapes

Maintenant que l'application fonctionne :

1. **Tester avec vos propres fichiers Excel**
2. **Explorer l'API** : http://localhost:8000/docs
3. **Ajuster les seuils de confiance** dans `backend/.env`
4. **Consulter les statistiques** : http://localhost:8000/api/stats
5. **Lire la documentation complète** :
   - `backend/README.md` - Documentation backend
   - `MLOPS_INTEGRATION.md` - Architecture MLOps
   - `ARCHITECTURE_COEXISTENCE.md` - Architecture technique

---

## 💡 Astuces

### Commande tout-en-un (Windows)

Créer un fichier `start-all.bat` :

```batch
@echo off
echo Starting Backend...
start cmd /k "cd backend && venv\Scripts\activate && python main.py"

timeout /t 3

echo Starting Frontend...
start cmd /k "npm run dev"

echo Both services started!
```

### Commande tout-en-un (Linux/Mac)

Créer un fichier `start-all.sh` :

```bash
#!/bin/bash

# Démarrer le backend en arrière-plan
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!

# Attendre que le backend soit prêt
sleep 5

# Démarrer le frontend
cd ..
npm run dev

# Cleanup à la fin
trap "kill $BACKEND_PID" EXIT
```

```bash
chmod +x start-all.sh
./start-all.sh
```

---

## 📊 Checklist de Démarrage

- [ ] PostgreSQL installé et actif
- [ ] Base `grc_compliance` créée
- [ ] Tables créées (schema.sql exécuté)
- [ ] Python 3.9+ installé
- [ ] Environnement virtuel créé (`venv`)
- [ ] Dépendances Python installées
- [ ] Contrôles SCF importés (~1450)
- [ ] Node.js installé
- [ ] Dépendances npm installées
- [ ] Backend lancé (port 8000)
- [ ] Frontend lancé (port 5173)
- [ ] Test réussi avec un fichier Excel

---

## 🎉 Félicitations !

Votre application GRC Compliance Mapping avec ML est opérationnelle ! 🚀

Vous avez maintenant :

- ✅ Un backend Python avec analyse sémantique ML
- ✅ Un frontend React moderne
- ✅ Une base PostgreSQL pour la persistance
- ✅ Des mappings automatiques intelligents
- ✅ Un système sans coûts d'API

---

**Besoin d'aide ?** Consultez les documents :
- `backend/README.md`
- `MLOPS_INTEGRATION.md`
- `ARCHITECTURE_COEXISTENCE.md`

**Dernière mise à jour :** 2025-10-07
