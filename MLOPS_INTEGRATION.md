# 🤖 Architecture MLOps - Intégration avec l'Application Existante

## 📋 Vue d'ensemble

Ce document décrit comment l'architecture **MLOps open-source** s'intègre dans l'application GRC Compliance Mapping existante, en remplaçant les appels coûteux à l'API Claude/Gemini par des modèles ML locaux.

---

## 🏗️ Architecture Actuelle (Before)

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/TS)                      │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  App.tsx     │───▶│ excelService │───▶│ claudeService│ │
│  │              │    │   (client)   │    │   (API)      │ │
│  └──────────────┘    └──────────────┘    └──────┬───────┘ │
│                                                  │          │
└──────────────────────────────────────────────────┼──────────┘
                                                   │
                                                   ▼
                                        ┌──────────────────┐
                                        │   Claude API     │
                                        │  (💰 Coûteux)    │
                                        └──────────────────┘
```

**Problèmes :**
- ❌ Coût élevé des appels API
- ❌ Dépendance à un service externe
- ❌ Latence réseau
- ❌ Pas de contrôle sur le modèle

---

## 🚀 Nouvelle Architecture (After) avec MLOps

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/TS)                          │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │  App.tsx     │───▶│ excelService │───▶│  mlService   │     │
│  │              │    │   (client)   │    │  (nouveau)   │     │
│  └──────────────┘    └──────────────┘    └──────┬───────┘     │
│                                                  │              │
└──────────────────────────────────────────────────┼──────────────┘
                                                   │ HTTP/REST
                                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│              BACKEND PYTHON (FastAPI)                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  main.py (FastAPI Endpoints)                               │ │
│  └────────┬───────────────────────────────────────────────────┘ │
│           │                                                      │
│  ┌────────▼─────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  ml_service.py   │───▶│ database.py  │───▶│ PostgreSQL   │  │
│  │                  │    │              │    │  + pgvector  │  │
│  │ • Sentence-BERT  │    │ SQLAlchemy   │    └──────────────┘  │
│  │ • Similarité     │    │              │                       │
│  │ • Clustering     │    └──────────────┘                       │
│  └──────────────────┘                                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Avantages :**
- ✅ **Gratuit** : Pas de coût API
- ✅ **Rapide** : Traitement local
- ✅ **Privé** : Données restent dans l'infrastructure
- ✅ **Personnalisable** : Fine-tuning possible
- ✅ **Scalable** : PostgreSQL + FAISS

---

## 🔄 Flux de Données Détaillé

### 1️⃣ Import Excel et Stockage

```
User Upload Excel
       │
       ▼
┌──────────────────┐
│ mlService.ts     │  POST /api/import/excel
│ uploadExcel()    │─────────────────────────▶┌──────────────────┐
└──────────────────┘                          │ Backend FastAPI  │
                                              │                  │
                                              │ 1. Parse Excel   │
                                              │ 2. Insert DB     │
                                              │ 3. Return IDs    │
                                              └────────┬─────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │   PostgreSQL     │
                                              │  requirements    │
                                              │  (status=pending)│
                                              └──────────────────┘
```

### 2️⃣ Analyse ML et Mapping Automatique

```
Frontend demande analyse
       │
       ▼
┌──────────────────┐
│ mlService.ts     │  POST /api/analyze/batch
│ analyzeBatch()   │─────────────────────────▶┌──────────────────────┐
└──────────────────┘                          │ ml_service.py        │
                                              │                      │
                                              │ 1. Load requirements │
                                              │ 2. Vectorize text    │
                                              │    (Sentence-BERT)   │
                                              │ 3. Find similar SCF  │
                                              │    (Cosine Sim)      │
                                              │ 4. Save mappings     │
                                              └────────┬─────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────────┐
                                              │   compliance_mappings│
                                              │   (confidence_score) │
                                              └──────────────────────┘
```

### 3️⃣ Affichage des Résultats

```
Frontend récupère résultats
       │
       ▼
┌──────────────────┐
│ mlService.ts     │  GET /api/requirements?status=analyzed
│ getResults()     │────────────────────────────────────────▶Backend
└──────────────────┘                                              │
       ▲                                                          │
       │                                                          ▼
       │                                              ┌────────────────────┐
       │                                              │  JOIN requirements │
       └───────────────────────────────────────────── │  + mappings        │
                    AnalysisResult[]                  └────────────────────┘
```

---

## 📂 Structure des Fichiers

```
poli_cont_app/
│
├── 📁 backend/                    # ✨ Backend Python (nouveau/amélioré)
│   ├── main.py                    # ✅ FastAPI app (déjà créé, complet)
│   ├── database.py                # ⏳ SQLAlchemy config (à créer)
│   ├── models.py                  # ⏳ DB models (à créer)
│   ├── schemas.py                 # ⏳ Pydantic schemas (à créer)
│   ├── ml_service.py              # ⏳ ML logic (à créer)
│   ├── requirements.txt           # ✅ Dependencies (déjà créé)
│   ├── .env                       # ⏳ Config (à créer)
│   └── README.md                  # ⏳ Documentation (à créer)
│
├── 📁 database/                   # ✅ PostgreSQL (déjà existant)
│   ├── schema.sql                 # ✅ Tables définies
│   └── init-database.sh           # ✅ Script d'initialisation
│
├── 📁 services/                   # 🔄 Frontend services (à adapter)
│   ├── excelService.ts            # ✅ Existant (garder pour preview)
│   ├── claudeService.ts           # ⚠️ Existant (garder comme fallback)
│   └── mlService.ts               # ⏳ Nouveau service (à créer)
│
├── 📁 components/                 # ✅ UI React (peu de changements)
│   ├── App.tsx                    # 🔄 Adapter pour utiliser mlService
│   └── ...                        # ✅ Autres composants (pas de changement)
│
└── 📄 MLOPS_INTEGRATION.md        # 📖 Ce document
```

---

## 🔧 Technologies Utilisées

### Backend Python

| Technologie | Usage |
|------------|-------|
| **FastAPI** | API REST moderne et rapide |
| **PostgreSQL** | Base de données relationnelle |
| **pgvector** | Extension pour embeddings vectoriels |
| **Sentence-Transformers** | Modèle NLP multilingue pour embeddings sémantiques |
| **scikit-learn** | Calcul de similarité cosinus, clustering |
| **pandas** | Manipulation de données Excel |
| **SQLAlchemy** | ORM Python pour PostgreSQL |

### Modèle ML Principal

**`paraphrase-multilingual-mpnet-base-v2`**
- 🌍 **Multilingue** : Supporte français + 50 langues
- 📊 **768 dimensions** : Embeddings de qualité
- ⚡ **Rapide** : ~50ms par texte
- 🎯 **Tâche** : Similarité sémantique entre phrases

---

## 📊 Algorithme de Mapping ML

### Étape 1 : Vectorisation

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')

# Vectoriser l'exigence
requirement_embedding = model.encode(requirement_text)

# Vectoriser tous les contrôles SCF (one-time)
scf_embeddings = model.encode([scf.control_description for scf in scf_controls])
```

### Étape 2 : Calcul de Similarité

```python
from sklearn.metrics.pairwise import cosine_similarity

# Calculer similarité cosinus
similarities = cosine_similarity([requirement_embedding], scf_embeddings)[0]

# Trouver les top 5 matches
top_5_indices = np.argsort(similarities)[-5:][::-1]
top_5_scores = similarities[top_5_indices]
```

### Étape 3 : Mapping Intelligent

```python
# Seuil de confiance
CONFIDENCE_THRESHOLD = 0.60

if top_5_scores[0] >= CONFIDENCE_THRESHOLD:
    # Mapping automatique avec haute confiance
    mapping = {
        "scf_mapping": scf_controls[top_5_indices[0]],
        "confidence_score": top_5_scores[0],
        "mapping_source": "ml"
    }
else:
    # Suggérer mais demander validation manuelle
    mapping = {
        "suggested_mappings": top_5_matches,
        "requires_manual_review": True
    }
```

---

## 🔗 API Endpoints Backend

### Import & Requirements

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/import/excel` | POST | Upload Excel → Parse → Insert DB |
| `/api/requirements` | GET | Liste toutes les exigences |
| `/api/requirements/{id}` | GET | Détails d'une exigence |
| `/api/requirements/{id}` | PUT | Mettre à jour une exigence |
| `/api/requirements/{id}` | DELETE | Supprimer une exigence |

### Analyse ML

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/analyze/similarity` | POST | Trouver contrôles similaires pour 1 exigence |
| `/api/analyze/batch` | POST | Analyser un lot d'exigences |
| `/api/analyze/auto` | POST | Analyse auto de toutes les exigences pending |

### Statistiques

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/stats` | GET | Statistiques globales (total, analyzed, pending) |
| `/api/stats/confidence` | GET | Distribution des scores de confiance |

---

## 🔄 Migration Progressive

### Phase 1 : Backend Setup (En cours)
1. ✅ Créer requirements.txt
2. ✅ Créer main.py avec endpoints
3. ⏳ Créer database.py, models.py, schemas.py
4. ⏳ Créer ml_service.py
5. ⏳ Charger les contrôles SCF dans PostgreSQL

### Phase 2 : Frontend Integration
1. ⏳ Créer mlService.ts
2. ⏳ Adapter App.tsx pour utiliser mlService
3. ⏳ Garder claudeService comme fallback optionnel
4. ⏳ Ajouter un toggle dans l'UI (ML vs Claude)

### Phase 3 : Testing & Optimization
1. ⏳ Tests de performance
2. ⏳ Ajuster les seuils de confiance
3. ⏳ Implémenter le clustering
4. ⏳ Ajouter l'apprentissage continu

---

## 💡 Compatibilité avec l'Existant

### Ce qui reste identique
- ✅ **Interface utilisateur** : Même UI React
- ✅ **excelService** : Toujours utilisé pour preview côté client
- ✅ **Types TypeScript** : `Requirement`, `AnalysisResult` identiques
- ✅ **Composants React** : DashboardScreen, ChatModal, etc.

### Ce qui change
- 🔄 **App.tsx** : Appelle mlService au lieu de claudeService
- 🔄 **Backend** : Python FastAPI au lieu de direct API calls
- 🔄 **Stockage** : PostgreSQL au lieu de mémoire client
- ✨ **Nouveau** : Fonctionnalités ML (clustering, learning)

---

## 🎯 Prochaines Étapes

1. **Compléter les modules backend Python** ✋ (Action immédiate)
2. **Charger les contrôles SCF dans PostgreSQL** (Essentiel)
3. **Créer mlService.ts** (Frontend)
4. **Adapter App.tsx** (Integration)
5. **Tester l'intégration complète** (Validation)

---

## ❓ Questions & Décisions

### Option 1 : Remplacement complet
- Utiliser uniquement le backend ML
- Supprimer claudeService
- ❌ Pas de fallback

### Option 2 : Hybride (Recommandé ⭐)
- Utiliser ML par défaut
- Garder claudeService comme option
- Toggle dans l'UI pour choisir
- ✅ Meilleure flexibilité

**👉 Quelle option préférez-vous ?**

---

## 📝 Notes Importantes

1. **PostgreSQL requis** : L'application nécessite maintenant PostgreSQL
2. **Python 3.9+** : Backend nécessite Python 3.9 ou supérieur
3. **Premiers lancements lents** : Le modèle Sentence-BERT (~400MB) se télécharge au premier lancement
4. **Embeddings cachés** : Vectorisation des contrôles SCF faite une seule fois, puis mise en cache

---

## 🚦 Statut du Projet

| Composant | Statut | Progression |
|-----------|--------|-------------|
| Backend FastAPI | 🟡 En cours | ██████████░░░░░░░░░░ 50% |
| Base de données | ✅ Prêt | ████████████████████ 100% |
| Service ML | ⏳ À faire | ░░░░░░░░░░░░░░░░░░░░ 0% |
| Frontend Service | ⏳ À faire | ░░░░░░░░░░░░░░░░░░░░ 0% |
| Intégration | ⏳ À faire | ░░░░░░░░░░░░░░░░░░░░ 0% |
| Tests | ⏳ À faire | ░░░░░░░░░░░░░░░░░░░░ 0% |

---

**Dernière mise à jour** : 2025-10-07
