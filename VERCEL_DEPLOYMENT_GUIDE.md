# Guide de Déploiement Vercel - GRC Compliance Mapping AI

## 🎯 Objectif

Déployer l'application GRC Compliance Mapping AI sur Vercel avec une architecture sécurisée et cloud-native.

## 📋 Architecture de Déploiement

```
┌─────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  React 19 + Vite Build (Static Assets)          │  │
│  │  - Bundled JavaScript/CSS                        │  │
│  │  - Aucune clé API exposée ✅                     │  │
│  │  - Security headers configurés                   │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │                                     │
└───────────────────┼─────────────────────────────────────┘
                    │ HTTPS
                    ↓
┌───────────────────────────────────────────────────────┐
│            Backend API (Recommandé: Render.com)       │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  FastAPI + ML Service                           │ │
│  │  - Clés API sécurisées (env variables)         │ │
│  │  - Endpoints proxy /api/ai/*                    │ │
│  │  - ML Sentence-Transformers                     │ │
│  └───────────────┬─────────────────────────────────┘ │
│                  │                                     │
└──────────────────┼─────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│        PostgreSQL Database (Supabase/Neon.tech)        │
│                                                         │
│  - Schema GRC Compliance                                │
│  - Import sessions tracking                             │
│  - ML embeddings cache                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Étape 1: Prérequis

### 1.1 Comptes nécessaires

- ✅ [Vercel Account](https://vercel.com) (Frontend hosting)
- ✅ [Render.com Account](https://render.com) (Backend hosting - recommandé)
- ✅ [Supabase](https://supabase.com) ou [Neon.tech](https://neon.tech) (PostgreSQL)
- ✅ Clés API:
  - Anthropic API Key (Claude)
  - Google Gemini API Key

### 1.2 Vérification locale

Avant de déployer, vérifier que tout fonctionne localement:

```bash
# Test build frontend
npm run build
# Doit réussir sans erreurs

# Test backend
cd backend
python main.py
# Doit démarrer sur port 8001

# Vérifier aucune clé API dans le bundle
grep -r "sk-ant-" dist/  # Ne doit rien trouver
grep -r "ANTHROPIC_API_KEY" dist/  # Ne doit rien trouver
```

---

## 📦 Étape 2: Déploiement Backend (Render.com)

### 2.1 Pourquoi Render.com?

- ✅ Support natif Python/FastAPI
- ✅ Variables d'environnement sécurisées
- ✅ Persistent disk (cache ML)
- ✅ Free tier disponible
- ✅ Scaling automatique

### 2.2 Créer le service Backend

1. **Se connecter à Render.com**
2. **Nouveau Web Service**
   - Repository: `https://github.com/abk1969/grc_politiques_controles_sec`
   - Root Directory: `backend`
   - Environment: `Python 3.11`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Configurer les variables d'environnement**

```bash
# API Keys (SÉCURISÉES)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxx
GEMINI_API_KEY=xxxxxxxxxxxxx

# Database
DATABASE_URL=postgresql://user:password@host:5432/grc_compliance

# Python
PYTHONUNBUFFERED=1
```

4. **Configurer le Persistent Disk**
   - Mount Path: `/app/cache`
   - Size: 1GB (pour cache ML embeddings)

5. **Déployer**
   - Cliquer "Create Web Service"
   - Attendre fin du déploiement (~5 min)
   - Noter l'URL: `https://grc-backend-xxxx.onrender.com`

### 2.3 Tester le backend déployé

```bash
# Health check
curl https://grc-backend-xxxx.onrender.com/health

# AI proxy health
curl https://grc-backend-xxxx.onrender.com/api/ai/health
```

Réponse attendue:
```json
{
  "status": "ok",
  "services": {
    "claude": {
      "available": true,
      "api_key_configured": true
    },
    "gemini": {
      "available": true,
      "api_key_configured": true
    }
  }
}
```

---

## 🗄️ Étape 3: Configuration PostgreSQL

### Option A: Supabase (Recommandé)

1. **Créer projet Supabase**
   - Aller sur [supabase.com](https://supabase.com)
   - Nouveau projet → Nom: `grc-compliance`
   - Région: Choisir la plus proche

2. **Exécuter le schema**
   - SQL Editor → Nouveau query
   - Copier le contenu de `database/schema.sql`
   - Exécuter

3. **Récupérer connection string**
   - Settings → Database
   - Connection string (URI): `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`
   - Copier cette URL

4. **Ajouter à Render.com**
   - Backend service → Environment
   - `DATABASE_URL=postgresql://postgres:...`

### Option B: Neon.tech

1. **Créer projet Neon**
   - [neon.tech](https://neon.tech) → New Project
   - Nom: `grc-compliance`
   - PostgreSQL 16

2. **Exécuter schema**
   - SQL Editor → Paste `database/schema.sql`

3. **Connection string**
   - Dashboard → Connection Details
   - Copier connection string

---

## 🌐 Étape 4: Déploiement Frontend (Vercel)

### 4.1 Importer le projet

1. **Se connecter à Vercel**
2. **New Project**
   - Import Git Repository
   - Sélectionner: `https://github.com/abk1969/grc_politiques_controles_sec`

3. **Configuration du projet**
   - Framework Preset: **Vite**
   - Root Directory: `./` (racine)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### 4.2 Variables d'environnement Vercel

**IMPORTANT**: Le frontend n'a besoin QUE de l'URL du backend!

```bash
# Variable d'environnement UNIQUE
VITE_API_URL=https://grc-backend-xxxx.onrender.com

# ⚠️ NE PAS AJOUTER LES CLÉS API ICI!
# Elles sont déjà sécurisées côté backend
```

**Comment ajouter**:
1. Project Settings → Environment Variables
2. Ajouter:
   - Key: `VITE_API_URL`
   - Value: `https://grc-backend-xxxx.onrender.com`
   - Environments: Production, Preview, Development

### 4.3 Configuration Security Headers

Le fichier `vercel.json` inclut déjà les headers de sécurité:

- ✅ `X-Content-Type-Options: nosniff` (prévention MIME sniffing)
- ✅ `X-Frame-Options: DENY` (prévention clickjacking)
- ✅ `X-XSS-Protection: 1; mode=block` (protection XSS)
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ `Content-Security-Policy` (CSP configuré)
- ✅ `Permissions-Policy` (restrictions API navigateur)

### 4.4 Déployer

1. Cliquer **Deploy**
2. Attendre fin du build (~2-3 min)
3. Vercel génère une URL: `https://grc-politiques-controles-sec.vercel.app`

---

## ✅ Étape 5: Validation Post-Déploiement

### 5.1 Tests fonctionnels

#### Test 1: Frontend accessible
```bash
curl -I https://grc-politiques-controles-sec.vercel.app
# Status: 200 OK
```

#### Test 2: Security headers présents
```bash
curl -I https://grc-politiques-controles-sec.vercel.app | grep X-Frame-Options
# X-Frame-Options: DENY
```

#### Test 3: Backend accessible depuis frontend
Ouvrir DevTools (F12) → Console:
```javascript
fetch('https://grc-backend-xxxx.onrender.com/health')
  .then(r => r.json())
  .then(console.log)
// Doit afficher: {"status": "ok"}
```

#### Test 4: Aucune clé API exposée
Ouvrir DevTools → Sources → Chercher "sk-ant" ou "ANTHROPIC_API_KEY"
**DOIT NE RIEN TROUVER** ✅

### 5.2 Test end-to-end

1. **Uploader un fichier Excel**
   - Aller sur `https://grc-politiques-controles-sec.vercel.app`
   - Bouton "Importer Fichier Excel"
   - Sélectionner fichier de test
   - Mapper les colonnes
   - Cliquer "Analyser"

2. **Vérifier analyse Claude**
   - Barre de progression doit apparaître
   - Résultats s'affichent après ~30s
   - Vérifier mappings SCF/ISO/COBIT présents

3. **Tester le Chat Claude**
   - Cliquer sur icône chat d'un requirement
   - Poser question: "Explique cette exigence"
   - Vérifier réponse streaming

4. **Vérifier ML background**
   - Après 2-3 minutes, rafraîchir page
   - Confidence scores ML doivent être ajoutés

### 5.3 Checklist sécurité finale

- [ ] Frontend déployé sur HTTPS (Vercel)
- [ ] Backend déployé sur HTTPS (Render)
- [ ] Aucune clé API dans le code frontend
- [ ] Variables d'environnement backend configurées
- [ ] Security headers actifs (vérifier avec curl)
- [ ] CORS configuré correctement
- [ ] Base de données accessible
- [ ] Cache ML persistent (Render disk)
- [ ] Tests end-to-end passent

---

## 🔧 Configuration CORS (Backend)

### Vérifier/Ajouter dans backend/main.py

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://grc-politiques-controles-sec.vercel.app",  # Production
        "http://localhost:3002",  # Dev local
        "http://localhost:3001"   # Docker
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**⚠️ Important**: Remplacer `grc-politiques-controles-sec.vercel.app` par votre URL Vercel réelle.

---

## 📊 Monitoring et Logs

### Render.com Logs

```bash
# Accéder aux logs backend
# Dashboard Render → Service → Logs

# Filtrer erreurs
# Logs → Filter: "ERROR"

# Monitoring health
# Shell → curl http://localhost:8000/health
```

### Vercel Logs

```bash
# Logs déploiement
# Dashboard Vercel → Deployments → [Cliquer deployment] → Build Logs

# Runtime logs
# Project → Logs tab

# Analytics
# Project → Analytics (requêtes, erreurs, performance)
```

---

## 🚨 Troubleshooting

### Problème: "Failed to fetch" depuis frontend

**Cause**: CORS non configuré ou URL backend incorrecte

**Solution**:
1. Vérifier `VITE_API_URL` dans Vercel env vars
2. Vérifier CORS dans `backend/main.py` inclut URL Vercel
3. Redéployer backend après modification CORS

### Problème: "Service Claude non disponible"

**Cause**: Clés API non configurées dans backend

**Solution**:
```bash
# Vérifier variables Render.com
# Dashboard Render → Environment → Vérifier ANTHROPIC_API_KEY existe

# Tester endpoint health
curl https://grc-backend-xxxx.onrender.com/api/ai/health
```

### Problème: "Database connection failed"

**Cause**: DATABASE_URL incorrecte ou DB non accessible

**Solution**:
1. Vérifier connection string Supabase/Neon
2. Vérifier IP whitelist (Supabase nécessite allowlist)
3. Tester connection depuis Render Shell:
```bash
python -c "import psycopg2; psycopg2.connect('postgresql://...')"
```

### Problème: Build Vercel échoue

**Cause**: Dépendances manquantes ou erreurs TypeScript

**Solution**:
```bash
# Tester build localement
npm run build

# Vérifier logs Vercel
# Dashboard → Deployments → Failed deployment → Logs

# Erreurs TypeScript communes
npm run typecheck  # Si configuré
```

### Problème: ML cache ne persiste pas

**Cause**: Persistent disk non configuré sur Render

**Solution**:
1. Render Dashboard → Service → Disks
2. Ajouter disk: `/app/cache` (1GB)
3. Redéployer service

### Problème: Analyse lente (>60s)

**Cause**: Cold start backend ou modèle ML non en cache

**Solution**:
1. **Cold start**: Premier appel après inactivité est lent (normal)
2. **Cache**: Vérifier `/app/cache/scf_embeddings.npz` existe
3. **Monitoring**: Render logs → Temps de réponse endpoints

---

## 🔐 Sécurité Post-Déploiement

### Actions recommandées

#### 1. Révoquer anciennes clés API exposées

Si des clés API étaient exposées avant migration:

**Anthropic**:
1. [console.anthropic.com](https://console.anthropic.com) → API Keys
2. Révoquer anciennes clés
3. Créer nouvelles clés
4. Mettre à jour Render env vars

**Google Gemini**:
1. [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Supprimer anciennes clés
3. Créer nouvelles clés
4. Mettre à jour Render env vars

#### 2. Activer rate limiting (Render)

Ajouter dans `backend/main.py`:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/ai/claude/analyze")
@limiter.limit("10/minute")  # Max 10 appels/minute
async def claude_analyze_proxy(request: Request, data: ClaudeAnalysisRequest):
    # ...
```

#### 3. Configurer authentification (optionnel mais recommandé)

Pour environnement production, implémenter JWT:

1. Suivre guide `COMPLETE_SECURITY_FIXES.md` section "Tâches Restantes P0"
2. Ajouter middleware JWT dans backend
3. Protéger endpoints sensibles
4. Ajouter login/signup UI

#### 4. Monitoring des coûts API

**Anthropic**:
- [console.anthropic.com/settings/usage](https://console.anthropic.com/settings/usage)
- Configurer alertes usage
- Définir budget mensuel

**Google Gemini**:
- [console.cloud.google.com/billing](https://console.cloud.google.com/billing)
- Activer alertes budget

---

## 📈 Optimisations Performance

### 1. Vercel Edge Caching

Configurer cache headers pour assets statiques (déjà dans `vercel.json`).

### 2. Backend Scaling (Render)

**Free Tier**: 1 instance
**Paid**: Auto-scaling selon load

Configuration scaling (Plan Starter+):
```yaml
# render.yaml (optionnel)
services:
  - type: web
    name: grc-backend
    env: python
    scaling:
      minInstances: 1
      maxInstances: 3
      targetCPUPercent: 70
```

### 3. Database Connection Pooling

Ajouter dans `backend/database.py`:

```python
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30
)
```

### 4. CDN pour Assets Statiques

Vercel utilise automatiquement CDN global pour tous les assets.

---

## 🎉 Déploiement Réussi!

Votre application GRC Compliance Mapping AI est maintenant déployée en production avec:

### ✅ Sécurité
- Clés API protégées côté serveur
- Security headers configurés
- HTTPS partout
- CORS restrictif
- Pas de code dangereux (pickle remplacé par NumPy)

### ✅ Performance
- Frontend optimisé (Vite build)
- Backend async (FastAPI)
- ML cache persistent
- Database indexée

### ✅ Observabilité
- Logs centralisés (Render + Vercel)
- Health checks actifs
- Error tracking

### ✅ Scalabilité
- Auto-scaling Render
- Vercel edge network
- Database cloud-native

---

## 📞 Support et Ressources

### Documentation
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Render**: [render.com/docs](https://render.com/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **FastAPI**: [fastapi.tiangolo.com](https://fastapi.tiangolo.com)

### Communautés
- Vercel Discord: [vercel.com/discord](https://vercel.com/discord)
- FastAPI Discord: [discord.gg/fastapi](https://discord.gg/fastapi)

### Fichiers de référence
- `COMPLETE_SECURITY_FIXES.md`: Détails sécurité
- `MIGRATION_GUIDE_API_KEYS.md`: Migration API keys
- `CODE_REVIEW_REPORT.md`: Analyse complète code
- `CLAUDE.md`: Guide développeur

---

## 🔄 Prochaines Étapes Recommandées

1. **Monitoring**: Configurer Sentry/LogRocket pour error tracking
2. **CI/CD**: Ajouter tests automatisés (GitHub Actions)
3. **JWT Auth**: Implémenter authentification (voir P0 restant)
4. **Backup DB**: Configurer backups automatiques
5. **Custom Domain**: Acheter domaine et configurer dans Vercel

**Félicitations! Votre application est maintenant production-ready! 🚀**
