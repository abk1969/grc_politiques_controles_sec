# 🔄 Coexistence Node.js + Python + PostgreSQL

## 📊 Situation Actuelle

### ✅ Ce qui est déjà en place

```
✅ PostgreSQL installé et actif (port 5432)
✅ Script init-database.sh existe (sécurisé)
✅ Schema SQL défini (database/schema.sql)
✅ Frontend React (Node.js/Vite)
✅ .env.local avec clés API
```

### 🔍 État de la Base de Données

**PostgreSQL est actif MAIS la base `grc_compliance` n'existe probablement pas encore.**

Le script `init-database.sh` :
- ✅ Vérifie si la base existe
- ✅ Demande confirmation avant d'écraser
- ✅ Crée les tables seulement si nécessaire
- ✅ Ajoute DATABASE_URL dans .env.local

---

## 🏗️ Architecture Multi-Couches (Pas de Conflits)

```
┌─────────────────────────────────────────────────────────────┐
│                   CLIENT (Browser)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          FRONTEND (Node.js + Vite)                          │
│                                                             │
│  🟢 Port: 5173 (dev) ou 3000 (prod)                        │
│  📦 Technologies: React, TypeScript                         │
│  📁 Fichiers: App.tsx, components/, services/              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Services:                                            │  │
│  │  - excelService.ts (parsing client-side)            │  │
│  │  - mlService.ts (appels au backend Python) ⭐ NOUVEAU│  │
│  │  - claudeService.ts (fallback optionnel)            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP REST (localhost:8000)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          BACKEND (Python + FastAPI)                         │
│                                                             │
│  🟢 Port: 8000                                              │
│  📦 Technologies: FastAPI, Sentence-Transformers           │
│  📁 Fichiers: backend/main.py, ml_service.py               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ API Endpoints:                                       │  │
│  │  POST /api/import/excel                             │  │
│  │  POST /api/analyze/batch                            │  │
│  │  GET  /api/requirements                             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ SQLAlchemy ORM
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         DATABASE (PostgreSQL)                               │
│                                                             │
│  🟢 Port: 5432                                              │
│  📦 Base: grc_compliance                                    │
│  📁 Tables: requirements, scf_controls, compliance_mappings │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚦 Ports Utilisés (Pas de Conflits)

| Service | Port | État | Accessible depuis |
|---------|------|------|-------------------|
| **PostgreSQL** | 5432 | ✅ Actif | Backend Python uniquement |
| **Frontend Vite (dev)** | 5173 | 🟡 Quand lancé | Browser (http://localhost:5173) |
| **Frontend Prod** | 3000 | 🟡 Optionnel | Browser (http://localhost:3000) |
| **Backend Python** | 8000 | 🟡 Quand lancé | Frontend (http://localhost:8000) |

**✅ Aucun conflit de port : Tous les services utilisent des ports différents**

---

## 🔒 Sécurité Base de Données

### Option 1 : Base séparée (Recommandé ⭐)

```bash
# L'app ML utilise sa propre base
Base: grc_compliance
Tables: requirements, scf_controls, compliance_mappings

# Si vous avez déjà une autre base PostgreSQL
Base: votre_autre_app
Tables: (vos tables existantes)
```

**✅ Pas de conflit : Bases complètement séparées**

### Option 2 : Schémas séparés (Avancé)

```sql
-- Créer un schéma dédié dans la même base
CREATE SCHEMA grc_ml;

-- Les tables seront dans grc_ml.requirements, etc.
-- Vos autres tables restent dans public.*
```

### Option 3 : Vérification avant création

Le script `init-database.sh` demande **confirmation** :

```bash
La base de données 'grc_compliance' existe déjà
Voulez-vous la supprimer et la recréer? (y/N):
```

**✅ Sécurisé : Pas d'écrasement sans confirmation**

---

## 🔗 Communication Inter-Services

### 1️⃣ Browser → Frontend (Node.js)

```javascript
// L'utilisateur ouvre http://localhost:5173
// React charge dans le browser
```

### 2️⃣ Frontend → Backend (HTTP REST)

```typescript
// services/mlService.ts
const response = await fetch('http://localhost:8000/api/import/excel', {
  method: 'POST',
  body: formData
});
```

### 3️⃣ Backend → PostgreSQL (SQLAlchemy)

```python
# backend/main.py
from database import get_db

# SQLAlchemy gère la connexion automatiquement
db = get_db()
requirements = db.query(Requirement).all()
```

**✅ Pas d'interaction directe entre Node.js et PostgreSQL**

---

## 📦 Dépendances Indépendantes

### Frontend (Node.js)
```json
{
  "dependencies": {
    "react": "^19.2.0",
    "@google/genai": "^1.22.0",
    "@anthropic-ai/sdk": "^0.65.0"
  }
}
```

### Backend (Python)
```txt
fastapi==0.109.0
sqlalchemy==2.0.25
sentence-transformers==2.3.1
```

**✅ Pas de conflit : Chaque environnement est isolé**

---

## 🚀 Démarrage des Services

### Ordre recommandé

```bash
# 1. Démarrer PostgreSQL (déjà actif dans votre cas)
# Rien à faire, déjà lancé

# 2. Initialiser la base (une seule fois)
cd /c/Users/globa/poli_cont_app
./database/init-database.sh

# 3. Démarrer le backend Python (terminal 1)
cd backend
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate sur Windows
pip install -r requirements.txt
python main.py
# → Backend tourne sur http://localhost:8000

# 4. Démarrer le frontend (terminal 2)
cd ..
npm run dev
# → Frontend tourne sur http://localhost:5173
```

### Arrêter les services

```bash
# Backend Python: Ctrl+C dans le terminal 1
# Frontend Node.js: Ctrl+C dans le terminal 2
# PostgreSQL: laissez tourner (service système)
```

---

## 🔧 Configuration .env.local

Après `init-database.sh`, votre `.env.local` contiendra :

```bash
# APIs IA (existant)
GEMINI_API_KEY=votre_clé_gemini
ANTHROPIC_API_KEY=votre_clé_anthropic

# PostgreSQL (ajouté par le script)
DATABASE_URL=postgresql://postgres@localhost:5432/grc_compliance
```

**Le backend Python lit `DATABASE_URL` depuis `.env` (pas `.env.local`)**

Créer `backend/.env` :

```bash
DATABASE_URL=postgresql://postgres@localhost:5432/grc_compliance
```

---

## ⚠️ Points d'Attention

### 1. CORS (Cross-Origin Resource Sharing)

Le backend Python doit autoriser le frontend :

```python
# backend/main.py (déjà configuré)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173"  # Vite dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Variables d'environnement

```
Frontend (React)     → Lit .env.local via Vite
Backend (Python)     → Lit backend/.env via python-dotenv
PostgreSQL           → Pas de .env, utilise la config système
```

### 3. Deux terminaux nécessaires

```
Terminal 1: Backend Python (reste ouvert)
Terminal 2: Frontend Vite (reste ouvert)
```

---

## 🧪 Test de Non-Conflit

### Vérifier les ports

```bash
# PostgreSQL
netstat -an | grep 5432
# → Doit afficher LISTENING

# Backend Python (après démarrage)
netstat -an | grep 8000
# → Doit afficher LISTENING

# Frontend Vite (après démarrage)
netstat -an | grep 5173
# → Doit afficher LISTENING
```

### Vérifier la base de données

```bash
# Se connecter à PostgreSQL
psql -U postgres -h localhost -p 5432

# Lister les bases
\l

# Si grc_compliance existe
\c grc_compliance

# Lister les tables
\dt
```

---

## ✅ Checklist de Coexistence

- [x] PostgreSQL installé et actif (port 5432)
- [ ] Base `grc_compliance` créée (via init-database.sh)
- [ ] Backend Python installé (requirements.txt)
- [ ] Backend Python tourne (port 8000)
- [ ] Frontend React modifié (mlService.ts)
- [ ] Frontend React tourne (port 5173)
- [ ] CORS configuré dans le backend
- [ ] Les 3 services communiquent correctement

---

## 🎯 Réponses Directes à Vos Questions

### Q1: Y aura-t-il un conflit de base de données PostgreSQL existante ?

**R: NON, aucun conflit si vous suivez ces règles :**

1. ✅ Le script `init-database.sh` **demande confirmation** avant d'écraser
2. ✅ La base `grc_compliance` est **dédiée** à cette app
3. ✅ Vos autres bases PostgreSQL **ne sont pas touchées**
4. ✅ Vous pouvez vérifier avant : `psql -U postgres -l` (liste les bases)

### Q2: Les composants Node.js et Python n'auront pas de conflits ?

**R: NON, aucun conflit car :**

1. ✅ **Ports différents** : Node.js (5173) ≠ Python (8000)
2. ✅ **Processus séparés** : Deux applications indépendantes
3. ✅ **Dépendances isolées** : package.json ≠ requirements.txt
4. ✅ **Communication HTTP** : Pas d'interaction directe
5. ✅ **Un seul accède à PostgreSQL** : Python uniquement

---

## 📊 Schéma de Déploiement

```
┌─────────────────────────────────────────────────────┐
│  Machine Windows (localhost)                        │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   Vite      │  │   Python    │  │ PostgreSQL │ │
│  │ :5173       │  │ :8000       │  │ :5432      │ │
│  │             │  │             │  │            │ │
│  │  Frontend   │─▶│  Backend    │─▶│  Database  │ │
│  │  (React)    │  │  (FastAPI)  │  │            │ │
│  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                     │
│  Processus indépendants, ports différents          │
└─────────────────────────────────────────────────────┘
```

---

**Conclusion : Coexistence totale, aucun conflit ! 🎉**
