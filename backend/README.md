# 🐍 Backend Python - GRC Compliance Mapping avec ML/NLP

Backend API REST basé sur FastAPI avec analyse sémantique ML pour le mapping automatique de conformité.

---

## 📋 Vue d'ensemble

Ce backend remplace les appels coûteux à l'API Claude/Gemini par des modèles ML open-source pour :

- ✅ **Analyse sémantique** des exigences de politiques
- ✅ **Matching intelligent** avec les frameworks SCF, ISO 27001/27002, COBIT 5
- ✅ **Clustering** des exigences similaires
- ✅ **Recommandations automatiques** avec scores de confiance
- ✅ **Stockage persistant** dans PostgreSQL

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         FastAPI Backend                 │
│  ┌───────────────────────────────────┐  │
│  │  main.py (API REST)               │  │
│  │  - /api/import/excel              │  │
│  │  - /api/analyze/batch             │  │
│  │  - /api/requirements              │  │
│  │  - /api/stats                     │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  ml_service.py                    │  │
│  │  - Sentence-BERT (multilingual)   │  │
│  │  - Similarité cosinus             │  │
│  │  - Cache embeddings               │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  database.py + models.py          │  │
│  │  - SQLAlchemy ORM                 │  │
│  │  - PostgreSQL                     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🚀 Installation

### Prérequis

- **Python 3.9+**
- **PostgreSQL 12+** (actif sur le port 5432)
- **~2 GB d'espace disque** (pour le modèle ML)

### Étape 1 : Créer l'environnement virtuel

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### Étape 2 : Installer les dépendances

```bash
pip install -r requirements.txt
```

**⏱️ Cela peut prendre 5-10 minutes** (installation de PyTorch, Sentence-Transformers, etc.)

### Étape 3 : Configurer PostgreSQL

```bash
# Retourner au répertoire racine du projet
cd ..

# Lancer le script d'initialisation
./database/init-database.sh

# Ou manuellement sur Windows
psql -U postgres -h localhost -p 5432 -f database/schema.sql
```

### Étape 4 : Configurer les variables d'environnement

```bash
cd backend

# Copier le fichier exemple
cp .env.example .env

# Éditer .env et ajuster si nécessaire
nano .env  # ou notepad .env sur Windows
```

**Contenu de `.env` :**

```env
DATABASE_URL=postgresql://postgres@localhost:5432/grc_compliance
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Étape 5 : Importer les contrôles SCF

```bash
# Le script cherche automatiquement le fichier Excel SCF
python import_scf_controls.py
```

**Sortie attendue :**

```
📂 Fichier SCF trouvé: 20250910_secure-controls-framework-scf-2025-2_vf.xlsx
📖 Lecture de la feuille: Controls
📊 Lignes lues: 1500
✅ Importés: 1450
⏭️ Ignorés: 50
```

---

## ▶️ Démarrage

### Lancer le serveur

```bash
cd backend
python main.py
```

**Ou avec Uvicorn (recommandé pour le développement) :**

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Sortie attendue :**

```
🤖 Chargement du modèle ML: paraphrase-multilingual-mpnet-base-v2
✅ Modèle ML chargé avec succès
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### Vérifier que l'API fonctionne

```bash
# Ouvrir dans le browser
http://localhost:8000

# Ou via curl
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

### Documentation interactive

FastAPI génère automatiquement une documentation Swagger :

- **Swagger UI** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc

---

## 📡 API Endpoints

### Health Check

```http
GET /
GET /health
```

**Réponse :**

```json
{
  "status": "healthy",
  "database": "connected",
  "ml_service": "ready"
}
```

---

### Import Excel

```http
POST /api/import/excel
Content-Type: multipart/form-data

file: <fichier.xlsx>
```

**Réponse :**

```json
{
  "success": true,
  "total_imported": 150,
  "sheets": [
    {
      "sheet_name": "Politiques",
      "rows_imported": 150
    }
  ],
  "message": "Import réussi: 150 exigences importées"
}
```

---

### Recherche de similarité

```http
POST /api/analyze/similarity
Content-Type: application/json

{
  "requirement_text": "L'organisme doit mettre en place un contrôle d'accès basé sur les rôles",
  "top_k": 5
}
```

**Réponse :**

```json
[
  {
    "control_id": "SCF-IAC-01",
    "control_title": "Identity & Access Management",
    "control_description": "Implement role-based access control...",
    "similarity_score": 0.87,
    "domain": "Identity & Access Control",
    "category": "Access Control"
  },
  ...
]
```

---

### Analyse batch

```http
POST /api/analyze/batch
Content-Type: application/json

{
  "requirement_ids": [1, 2, 3, 4, 5]
}
```

**Réponse :**

```json
{
  "success": true,
  "analyzed_count": 5,
  "results": [
    {
      "requirement_id": 1,
      "best_match": {
        "control_id": "SCF-IAC-01",
        "similarity_score": 0.87,
        "auto_mapped": true
      },
      "alternatives": [...]
    },
    ...
  ]
}
```

---

### CRUD Requirements

```http
GET    /api/requirements              # Liste toutes les exigences
GET    /api/requirements/{id}         # Détails d'une exigence
POST   /api/requirements              # Créer une exigence
PUT    /api/requirements/{id}         # Mettre à jour
DELETE /api/requirements/{id}         # Supprimer
```

---

### Statistiques

```http
GET /api/stats
```

**Réponse :**

```json
{
  "total_requirements": 150,
  "analyzed": 120,
  "pending": 25,
  "manual": 5,
  "total_mappings": 120,
  "completion_rate": 83.33
}
```

---

## 🧠 Modèle ML

### Sentence-BERT Multilingual

**Modèle :** `paraphrase-multilingual-mpnet-base-v2`

| Caractéristique | Valeur |
|----------------|--------|
| **Langues** | 50+ (dont français, anglais) |
| **Dimension** | 768 |
| **Performance** | ~50ms par texte |
| **Taille** | ~420 MB |
| **Source** | Hugging Face Transformers |

### Comment ça marche ?

1. **Vectorisation** : Chaque texte (exigence ou contrôle) est converti en un vecteur de 768 dimensions
2. **Similarité** : Calcul de la similarité cosinus entre les vecteurs
3. **Ranking** : Tri par score décroissant
4. **Seuil** : Mapping automatique si score > 0.60

### Cache des embeddings

Les embeddings des contrôles SCF sont **mis en cache** pour accélérer les recherches :

```
backend/cache/scf_embeddings.pkl  (~50 MB)
```

- ⚡ **Première analyse** : ~10 secondes (calcul des embeddings)
- ⚡ **Analyses suivantes** : ~100ms (cache utilisé)

---

## 🗂️ Structure des fichiers

```
backend/
├── main.py                    # Point d'entrée FastAPI
├── database.py                # Configuration SQLAlchemy
├── models.py                  # Modèles de base de données
├── schemas.py                 # Schémas Pydantic
├── ml_service.py              # Service ML (Sentence-BERT)
├── import_scf_controls.py     # Script d'import SCF
├── requirements.txt           # Dépendances Python
├── .env                       # Configuration (ne pas commiter)
├── .env.example               # Exemple de configuration
├── README.md                  # Ce fichier
│
├── cache/                     # Cache des embeddings
│   └── scf_embeddings.pkl
│
└── logs/                      # Logs de l'application
    └── app.log
```

---

## 🔧 Configuration avancée

### Ajuster le seuil de confiance

Dans `.env` :

```env
ML_CONFIDENCE_THRESHOLD=0.70  # Plus strict (moins de mappings auto)
ML_CONFIDENCE_THRESHOLD=0.50  # Plus permissif (plus de mappings auto)
```

### Changer le modèle ML

```env
# Modèle actuel (recommandé)
ML_MODEL_NAME=paraphrase-multilingual-mpnet-base-v2

# Alternative plus rapide mais moins précise
ML_MODEL_NAME=paraphrase-multilingual-MiniLM-L12-v2

# Alternative pour le français uniquement
ML_MODEL_NAME=sentence-camembert-base
```

**⚠️ Attention** : Changer le modèle nécessite de recréer le cache d'embeddings.

### Désactiver le cache

```env
CACHE_ENABLED=false
```

---

## 🧪 Tests

### Test de connexion à la base de données

```bash
python database.py
```

### Test du modèle ML

```python
from ml_service import MLMappingService

ml = MLMappingService()
print(ml.get_model_info())
```

### Test d'import SCF

```bash
python import_scf_controls.py
```

### Test de l'API

```bash
# Installer httpie
pip install httpie

# Tester l'API
http GET http://localhost:8000/health
http GET http://localhost:8000/api/stats
```

---

## 🐛 Dépannage

### Erreur : "PostgreSQL connection refused"

```bash
# Vérifier que PostgreSQL est actif
psql -U postgres -h localhost -p 5432 -l

# Si erreur, démarrer PostgreSQL
# Windows : Services > PostgreSQL
# Linux : sudo systemctl start postgresql
```

### Erreur : "No module named 'sentence_transformers'"

```bash
# Réinstaller les dépendances
pip install --upgrade -r requirements.txt
```

### Erreur : "Model download failed"

Le modèle ML se télécharge au premier lancement. Si ça échoue :

```bash
# Téléchargement manuel
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')"
```

### Performance lente

```bash
# Vérifier que le cache est activé
ls -lh backend/cache/scf_embeddings.pkl

# Si absent, lancer une analyse pour créer le cache
curl -X POST http://localhost:8000/api/analyze/batch \
  -H "Content-Type: application/json" \
  -d '{"requirement_ids": [1, 2, 3]}'
```

---

## 📊 Performances

### Benchmarks

| Opération | Temps | Notes |
|-----------|-------|-------|
| Import 150 exigences | ~2 sec | Insertion PostgreSQL |
| Première analyse (cache vide) | ~10 sec | Calcul embeddings SCF |
| Analyse suivante (avec cache) | ~100 ms | Cache utilisé |
| Batch 50 exigences | ~5 sec | Avec cache |
| Recherche similarité | ~50 ms | Par exigence |

### Optimisations

- ✅ **Cache embeddings** : Évite le recalcul
- ✅ **Batch processing** : Traite plusieurs exigences en une fois
- ✅ **Connection pooling** : Réutilisation des connexions DB
- ✅ **CORS optimisé** : Pas de préflight inutiles

---

## 🔄 Intégration Frontend

Le frontend React appelle ce backend via `mlService.ts` :

```typescript
// services/mlService.ts
const response = await fetch('http://localhost:8000/api/import/excel', {
  method: 'POST',
  body: formData
});
```

Voir `services/mlService.ts` pour plus de détails.

---

## 📝 Logs

Les logs sont écrits dans :

- **Console** : Logs colorés en temps réel
- **Fichier** : `backend/logs/app.log`

Configuration dans `.env` :

```env
LOG_LEVEL=INFO    # DEBUG, INFO, WARNING, ERROR
LOG_FILE=backend/logs/app.log
```

---

## 🚀 Déploiement Production

### Avec Uvicorn + systemd (Linux)

```bash
# Créer un service systemd
sudo nano /etc/systemd/system/grc-backend.service
```

```ini
[Unit]
Description=GRC Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/poli_cont_app/backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable grc-backend
sudo systemctl start grc-backend
```

### Avec Docker (à venir)

Un `Dockerfile` sera fourni prochainement.

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez suivre ces étapes :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 📄 Licence

Ce projet est sous licence MIT.

---

## 📞 Support

Pour toute question ou problème :

- **Issues GitHub** : [Créer une issue](https://github.com/votre-repo/issues)
- **Documentation** : Voir `MLOPS_INTEGRATION.md` et `ARCHITECTURE_COEXISTENCE.md`

---

**Dernière mise à jour** : 2025-10-07
