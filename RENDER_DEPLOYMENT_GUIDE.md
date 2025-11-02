# 🚀 Guide de Déploiement Backend sur Render.com

## 📋 Étape 1: Préparation (2 minutes)

### Vérifier que le code est à jour sur GitHub

```bash
# Déjà fait! Votre dernier commit:
git log -1 --oneline
# da4dbef HOTFIX v2: Remove old claudeService.ts file
```

### Préparer vos clés API

Avoir sous la main:
- ✅ Clé API Anthropic (Claude): `sk-ant-...`
- ✅ Clé API Google Gemini: `AIza...`

---

## 🌐 Étape 2: Créer le Service Backend (5 minutes)

### 2.1 Se connecter à Render.com

1. Aller sur: **https://render.com**
2. Cliquer **"Get Started for Free"**
3. Se connecter avec **GitHub**
4. Autoriser Render à accéder à vos repositories

### 2.2 Créer un nouveau Web Service

1. Dans le Dashboard Render, cliquer **"New +"** → **"Web Service"**

2. **Connecter le repository:**
   - Chercher: `abk1969/grc_politiques_controles_sec`
   - Cliquer **"Connect"**

   Si le repo n'apparaît pas:
   - Cliquer "Configure account" → Autoriser l'accès au repo

### 2.3 Configuration du Service

Remplir le formulaire avec ces valeurs **EXACTES**:

```
┌─────────────────────────────────────────────────────────┐
│ Name:              grc-backend                          │
│ Region:            Frankfurt (EU Central)               │
│ Branch:            main                                 │
│ Root Directory:    backend                              │
│ Runtime:           Python 3                             │
│ Build Command:     pip install -r requirements.txt     │
│ Start Command:     uvicorn main:app --host 0.0.0.0     │
│                    --port $PORT                         │
│ Instance Type:     Free                                 │
└─────────────────────────────────────────────────────────┘
```

**IMPORTANT**:
- ✅ **Root Directory** = `backend` (pas vide!)
- ✅ **Start Command** = `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 2.4 Configurer les Variables d'Environnement

Cliquer sur **"Advanced"** puis ajouter ces variables:

| Key | Value | Note |
|-----|-------|------|
| `PYTHONUNBUFFERED` | `1` | Logs en temps réel |
| `ANTHROPIC_API_KEY` | `sk-ant-xxxxx` | Votre clé Claude |
| `CLAUDE_API_KEY` | `sk-ant-xxxxx` | (même que ci-dessus) |
| `GEMINI_API_KEY` | `AIzaxxxxxx` | Votre clé Gemini |
| `DATABASE_URL` | *Laisser vide pour l'instant* | On configurera après |

**Comment ajouter:**
1. Cliquer **"Add Environment Variable"**
2. Entrer le **Key** (nom de la variable)
3. Entrer le **Value** (valeur secrète)
4. Répéter pour chaque variable

### 2.5 Lancer le Déploiement

1. Cliquer **"Create Web Service"** en bas
2. Render va commencer à déployer (≈5-7 minutes)

**Logs à surveiller:**
```bash
==> Cloning from https://github.com/abk1969/grc_politiques_controles_sec...
==> Checking out commit da4dbef in branch main
==> Running build command 'pip install -r requirements.txt'...
    Installing dependencies...
    ✓ Successfully installed fastapi, uvicorn, anthropic...
==> Starting service with 'uvicorn main:app --host 0.0.0.0 --port $PORT'
    INFO: Uvicorn running on http://0.0.0.0:10000
    ✓ Service is live!
```

### 2.6 Vérifier le Déploiement

Une fois le déploiement terminé (statut: **"Live" 🟢**):

1. **Noter l'URL de votre backend:**
   ```
   https://grc-backend-xxxx.onrender.com
   ```
   (Remplacer `xxxx` par votre ID unique)

2. **Tester l'endpoint health:**
   - Cliquer sur l'URL dans Render
   - Ajouter `/health` à la fin
   - Exemple: `https://grc-backend-xxxx.onrender.com/health`

3. **Réponse attendue:**
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-11-02T...",
     "version": "1.0.0"
   }
   ```

✅ Si vous voyez ce JSON → **Backend déployé avec succès!**

---

## 🗄️ Étape 3: Configurer la Base de Données PostgreSQL (5 minutes)

### Option A: PostgreSQL sur Render.com (Recommandé pour simplicité)

1. **Créer la base de données:**
   - Dans Render Dashboard, cliquer **"New +"** → **"PostgreSQL"**
   - Name: `grc-database`
   - Database Name: `grc_compliance`
   - User: `grc_user`
   - Region: **Même que le backend** (Frankfurt)
   - Plan: **Free**
   - Cliquer **"Create Database"**

2. **Attendre la création** (≈2 minutes)

3. **Récupérer la Connection String:**
   - Aller dans la database → **"Connect"** → **"External"**
   - Copier le **"External Database URL"**
   - Format: `postgresql://grc_user:password@dpg-xxx.frankfurt-postgres.render.com/grc_compliance`

4. **Ajouter à l'application backend:**
   - Retourner au **Web Service** (grc-backend)
   - **Environment** → Trouver `DATABASE_URL`
   - Coller la connection string
   - Cliquer **"Save Changes"**
   - ⚠️ Le backend va **redémarrer automatiquement** (1-2 min)

5. **Initialiser le schéma:**
   - Dans Render, aller dans la **Database** → **"Connect"** → **"PSQL Command"**
   - Copier la commande PSQL
   - Dans votre terminal local:
   ```bash
   # Installer psql si nécessaire
   # Windows: https://www.postgresql.org/download/windows/

   # Coller la commande PSQL de Render
   psql postgresql://grc_user:password@dpg-xxx.frankfurt-postgres.render.com/grc_compliance

   # Une fois connecté, copier le contenu de database/schema.sql
   # Ou upload via l'UI Render
   ```

### Option B: Supabase (Plus d'outils, gratuit aussi)

1. **Créer compte:** https://supabase.com
2. **New Project:**
   - Name: `grc-compliance`
   - Database Password: *générer un mot de passe fort*
   - Region: **Europe** (Frankfurt)
3. **SQL Editor:** Copier-coller `database/schema.sql`
4. **Connection String:** Settings → Database → Connection string
5. **Ajouter à Render:** Variable `DATABASE_URL`

---

## 💾 Étape 4: Configurer le Cache ML (Optionnel mais Recommandé)

Le cache ML stocke les embeddings (400MB) pour éviter de les recalculer.

1. **Dans le Web Service (grc-backend):**
   - Onglet **"Disks"**
   - Cliquer **"Add Disk"**

2. **Configuration:**
   ```
   Name:        ml-cache
   Mount Path:  /app/cache
   Size:        1 GB
   ```

3. Cliquer **"Create"**

✅ Le backend va redémarrer et monter le disk persistant

---

## 🔗 Étape 5: Connecter Vercel au Backend (3 minutes)

Maintenant que le backend est déployé, connectons le frontend Vercel:

### 5.1 Configurer VITE_API_URL dans Vercel

1. **Aller sur Vercel Dashboard:** https://vercel.com/dashboard
2. **Sélectionner votre projet** (grc_politiques_controles_sec)
3. **Settings** → **Environment Variables**
4. **Ajouter une nouvelle variable:**

   ```
   ┌─────────────────────────────────────────────────┐
   │ Key:    VITE_API_URL                            │
   │ Value:  https://grc-backend-xxxx.onrender.com   │
   │ (Remplacer xxxx par votre URL Render)          │
   │                                                 │
   │ Environments:                                   │
   │ ☑ Production                                    │
   │ ☑ Preview                                       │
   │ ☑ Development                                   │
   └─────────────────────────────────────────────────┘
   ```

5. Cliquer **"Save"**

### 5.2 Redéployer le Frontend

1. **Deployments** → Dernier déploiement → **"..."** → **"Redeploy"**
2. Cocher **"Use existing Build Cache"** (plus rapide)
3. Cliquer **"Redeploy"**
4. Attendre 1-2 minutes

---

## ✅ Étape 6: Validation Complète (5 minutes)

### 6.1 Test Backend Direct

```bash
# Test 1: Health check
curl https://grc-backend-xxxx.onrender.com/health

# Réponse attendue:
# {"status":"healthy","timestamp":"...","version":"1.0.0"}

# Test 2: AI Proxy Health
curl https://grc-backend-xxxx.onrender.com/api/ai/health

# Réponse attendue:
# {
#   "status": "ok",
#   "services": {
#     "claude": {"available": true, "api_key_configured": true},
#     "gemini": {"available": true, "api_key_configured": true}
#   }
# }
```

### 6.2 Test Frontend via Diagnostic Tool

1. **Ouvrir:** `https://votre-app.vercel.app/config-check.html`

2. **Vérifier que tout est VERT:**
   - ✅ VITE_API_URL configuré
   - ✅ Backend Health UP
   - ✅ AI Proxy disponible

### 6.3 Test End-to-End Complet

1. **Ouvrir l'application:** `https://votre-app.vercel.app`

2. **Upload un fichier Excel de test:**
   - Créer un fichier Excel simple:
   ```
   | id | requirement | point_de_verification |
   |----|-------------|----------------------|
   | 1  | Les mots de passe doivent contenir 12 caractères minimum | Vérifier politique IAM |
   ```

3. **Lancer l'analyse Claude:**
   - Mapper les colonnes
   - Cliquer "Analyser avec Claude"
   - ⏳ Attendre 20-30 secondes

4. **Vérifier les résultats:**
   - ✅ Mappings SCF affichés
   - ✅ Mappings ISO27001/27002 affichés
   - ✅ Analyse de conformité présente

5. **Tester le Chat:**
   - Cliquer sur l'icône chat d'un requirement
   - Poser question: "Explique cette exigence en détail"
   - ✅ Réponse streaming de Claude

---

## 🎉 Déploiement Réussi!

Si tous les tests passent, votre application est maintenant **100% opérationnelle en production**!

### 📊 Architecture Finale

```
┌──────────────────────────────────────────────────────┐
│ VERCEL (Frontend)                                    │
│ https://your-app.vercel.app                          │
│ - React + Vite optimisé                              │
│ - Aucune clé API exposée                             │
│ - Security headers actifs                            │
└────────────────┬─────────────────────────────────────┘
                 │ HTTPS
                 ↓
┌──────────────────────────────────────────────────────┐
│ RENDER.COM (Backend)                                 │
│ https://grc-backend-xxxx.onrender.com                │
│ - FastAPI + ML Service                               │
│ - Clés API sécurisées                                │
│ - Endpoints proxy /api/ai/*                          │
│ - Cache ML persistent (1GB)                          │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│ RENDER POSTGRESQL (Database)                         │
│ postgresql://grc_user:pass@dpg-xxx.render.com/...    │
│ - Schema GRC Compliance                              │
│ - Import sessions tracking                           │
│ - Compliance mappings storage                        │
└──────────────────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Problème: "Application Error" dans Render

**Cause:** Erreur dans les dépendances ou le code

**Solution:**
1. Render Dashboard → Service → **Logs**
2. Chercher l'erreur en rouge
3. Communes:
   - `ModuleNotFoundError` → Vérifier `requirements.txt`
   - `Port already in use` → Utiliser `$PORT` dans start command
   - `Database connection failed` → Vérifier `DATABASE_URL`

### Problème: Backend lent à démarrer (Cold Start)

**Cause:** Plan gratuit Render hiberne après 15 min d'inactivité

**Solutions:**
- Première requête = 30-60s (normal)
- Render **Starter Plan** ($7/mois) = Pas d'hibernation
- Ou garder le backend actif avec cron job ping

### Problème: CORS Error dans le frontend

**Cause:** Backend n'autorise pas l'origine Vercel

**Solution:**
```python
# Dans backend/main.py, vérifier:
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",  # Ajouter votre URL Vercel!
        "http://localhost:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Puis redéployer le backend.

### Problème: "Service Claude non disponible"

**Cause:** Clés API non configurées ou invalides

**Solution:**
1. Render → Service → **Environment**
2. Vérifier `ANTHROPIC_API_KEY` et `GEMINI_API_KEY`
3. Tester les clés:
   ```bash
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01"
   ```

---

## 📞 Support

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Notre Guide Complet:** `VERCEL_DEPLOYMENT_GUIDE.md`

**Votre application est maintenant en production! 🚀🎉**
