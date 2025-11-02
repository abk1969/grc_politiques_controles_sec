# ⚡ Déploiement Express - 15 Minutes

**Votre frontend Vercel montre une page blanche?**  
**C'est normal! Le backend n'est pas encore déployé.**

Suivez ce guide en 3 étapes (15 minutes max).

---

## 🎯 Ce qu'on va faire

```
✅ Étape 1: Déployer Backend sur Render.com (7 min)
✅ Étape 2: Connecter Vercel au Backend (3 min)  
✅ Étape 3: Tester (5 min)
```

---

## 📋 Avant de commencer

Avoir sous la main:
- 🔑 Clé API Anthropic: https://console.anthropic.com/settings/keys
- 🔑 Clé API Gemini: https://aistudio.google.com/app/apikey

---

## 🚀 ÉTAPE 1: Backend Render (7 min)

### 1. Créer compte
- Aller: **https://render.com**
- "Get Started for Free" → Se connecter avec GitHub

### 2. Nouveau Web Service
- Dashboard → **"New +"** → **"Web Service"**
- Repo: `abk1969/grc_politiques_controles_sec`
- Cliquer **"Connect"**

### 3. Configuration

```yaml
Name:            grc-backend
Region:          Frankfurt (EU)
Branch:          main
Root Directory:  backend           ⚠️ CRITIQUE!
Build:           pip install -r requirements.txt
Start:           uvicorn main:app --host 0.0.0.0 --port $PORT
Plan:            Free
```

### 4. Variables d'environnement

Cliquer **"Advanced"** → Ajouter:

| Key | Value |
|-----|-------|
| `PYTHONUNBUFFERED` | `1` |
| `ANTHROPIC_API_KEY` | `sk-ant-xxxxx` (votre clé) |
| `CLAUDE_API_KEY` | `sk-ant-xxxxx` (même) |
| `GEMINI_API_KEY` | `AIzaxxxxx` (votre clé) |

### 5. Déployer
- **"Create Web Service"**
- ⏳ Attendre 5-7 minutes
- Status: 🟢 **Live**

### 6. Noter l'URL
```
https://grc-backend-xxxx.onrender.com
```
**⚠️ COPIER CETTE URL!**

### 7. Tester
```
Navigateur: https://grc-backend-xxxx.onrender.com/health
Doit afficher: {"status":"healthy",...}
```

✅ **Backend OK!**

---

## 🔗 ÉTAPE 2: Connecter Vercel (3 min)

### 1. Configurer variable
- **https://vercel.com/dashboard**
- Votre projet → **Settings** → **Environment Variables**
- **"Add"**:
  ```
  Key:    VITE_API_URL
  Value:  https://grc-backend-xxxx.onrender.com
  
  ☑ Production
  ☑ Preview  
  ☑ Development
  ```
- **"Save"**

### 2. Redéployer
- **Deployments** → Dernier déploiement → **"..."** → **"Redeploy"**
- ☑ Use existing Build Cache
- **"Redeploy"**
- ⏳ Attendre 1-2 minutes

✅ **Frontend connecté!**

---

## ✅ ÉTAPE 3: Tester (5 min)

### Test 1: Diagnostic
```
https://votre-app.vercel.app/config-check.html
```
Vérifier tout vert:
- ✅ VITE_API_URL
- ✅ Backend Health
- ✅ AI Proxy

### Test 2: Application
1. Ouvrir: `https://votre-app.vercel.app`
2. Créer Excel test:
   ```
   id | requirement                      | point_de_verification
   1  | Mots de passe 12 caractères min | Politique IAM
   ```
3. Upload → Mapper → Analyser
4. ✅ Voir résultats SCF/ISO27001/COBIT5

---

## 🎉 TERMINÉ!

**Architecture déployée:**
```
Vercel (Frontend) → Render (Backend) → Claude/Gemini APIs
```

---

## 🗄️ OPTIONNEL: Base de Données

Pour sauvegarder l'historique:

### PostgreSQL sur Render
```
1. Dashboard → "New +" → "PostgreSQL"
2. Name: grc-database
3. Region: Frankfurt
4. Plan: Free
5. Create
6. Copier "External Database URL"
7. Backend → Environment → DATABASE_URL = (coller)
8. Save (backend redémarre)
```

---

## 🚨 Problèmes?

| Problème | Solution |
|----------|----------|
| Page blanche | `/config-check.html` → Vérifier VITE_API_URL |
| Backend 500 | Render Logs → Vérifier clés API |
| CORS Error | backend/main.py → allow_origins |

---

## 📚 Documentation

- **Guide Complet:** `RENDER_DEPLOYMENT_GUIDE.md`
- **Sécurité:** `COMPLETE_SECURITY_FIXES.md`
- **Architecture:** `CLAUDE.md`

---

**🚀 Votre application est en production!**
