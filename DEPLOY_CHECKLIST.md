# ✅ Checklist de Déploiement - Copiez-Collez Seulement

## 🎯 Partie 1: Render.com (5 minutes)

### Étape 1: Nouveau Service
```
1. Aller: https://dashboard.render.com
2. Clic: Bouton bleu "New +" (en haut droite)
3. Clic: "Web Service"
4. Clic: "Connect" à côté de "grc_politiques_controles_sec"
```

### Étape 2: Formulaire (Copier-Coller)
```
Name:              grc-backend
Region:            Frankfurt (EU Central)
Branch:            main
Root Directory:    backend
Build Command:     pip install -r requirements.txt
Start Command:     uvicorn main:app --host 0.0.0.0 --port $PORT
Plan:              Free
```

### Étape 3: Variables (Cliquer "Advanced" d'abord)

**Cliquer "Add Environment Variable" 4 fois et remplir:**

```
Variable 1:
Key:    PYTHONUNBUFFERED
Value:  1

Variable 2:
Key:    ANTHROPIC_API_KEY
Value:  [VOTRE CLÉ - voir ci-dessous où la trouver]

Variable 3:
Key:    CLAUDE_API_KEY
Value:  [MÊME CLÉ que ANTHROPIC_API_KEY]

Variable 4:
Key:    GEMINI_API_KEY
Value:  [VOTRE CLÉ - voir ci-dessous où la trouver]
```

#### 🔑 Où trouver vos clés API:

**Anthropic (Claude):**
1. Aller: https://console.anthropic.com/settings/keys
2. Cliquer "Create Key"
3. Copier la clé (commence par `sk-ant-`)

**Google Gemini:**
1. Aller: https://aistudio.google.com/app/apikey
2. Cliquer "Create API Key"
3. Copier la clé (commence par `AIza`)

### Étape 4: Déployer
```
1. Clic: "Create Web Service" (en bas du formulaire)
2. ⏳ Attendre 5-7 minutes (barre de progression)
3. ✅ Statut devient "Live" avec point vert
4. 📋 COPIER l'URL qui apparaît (format: https://grc-backend-xxxx.onrender.com)
```

**⚠️ NOTER CETTE URL - VOUS EN AUREZ BESOIN!**

### Étape 5: Tester
```
1. Ouvrir dans navigateur: [VOTRE URL]/health
   Exemple: https://grc-backend-abc123.onrender.com/health

2. Doit afficher:
   {"status":"healthy","timestamp":"...","version":"1.0.0"}

3. Si erreur 404 ou 500 → M'envoyer les logs
```

---

## 🎯 Partie 2: Vercel (2 minutes)

### Étape 1: Ajouter Variable
```
1. Aller: https://vercel.com/dashboard
2. Clic: Votre projet (grc_politiques_controles_sec)
3. Clic: Onglet "Settings"
4. Clic: "Environment Variables" (menu gauche)
5. Clic: Bouton "Add" (ou "Add New")
```

### Étape 2: Remplir
```
Key:    VITE_API_URL
Value:  [COLLER L'URL de Render copiée plus haut]
        Exemple: https://grc-backend-abc123.onrender.com

Cocher:
☑ Production
☑ Preview
☑ Development

Clic: "Save"
```

### Étape 3: Redéployer
```
1. Clic: Onglet "Deployments"
2. Clic: Premier déploiement de la liste
3. Clic: Bouton "..." (3 points)
4. Clic: "Redeploy"
5. Clic: "Redeploy" (confirmation)
6. ⏳ Attendre 1-2 minutes
```

---

## 🎯 Partie 3: Tester (2 minutes)

### Test 1: Diagnostic
```
1. Ouvrir: https://[VOTRE-APP].vercel.app/config-check.html
2. Vérifier:
   ✅ VITE_API_URL configuré
   ✅ Backend Health OK
   ✅ AI Proxy OK

Si TOUT est vert → Succès! Passer au Test 2
Si rouge → Me dire lequel est rouge
```

### Test 2: Application Réelle
```
1. Ouvrir: https://[VOTRE-APP].vercel.app
2. Clic: "Importer Fichier Excel"
3. Upload un fichier Excel de test
4. Mapper les colonnes
5. Clic: "Analyser avec Claude"
6. ⏳ Attendre 20-30 secondes
7. ✅ Vérifier résultats affichés (SCF, ISO27001, etc.)
```

---

## 🎉 C'EST TERMINÉ!

Si les 2 tests passent → **Votre application est 100% fonctionnelle en production!**

---

## 🆘 En Cas de Problème

### Render: "Application Error"
```
→ Render Dashboard → Service → "Logs"
→ Copier la dernière erreur en rouge
→ Me l'envoyer
```

### Vercel: Page blanche
```
→ F12 (DevTools) → Console
→ Copier l'erreur
→ Me l'envoyer
```

### Backend ne répond pas
```
→ Vérifier: https://[URL-BACKEND]/health
→ Si timeout → Backend en cold start (attendre 30s)
→ Si 500 → Voir logs Render
```

---

## 📋 URLs à Noter

**Remplir après déploiement:**

```
Backend Render:  https://grc-backend-_________.onrender.com
Frontend Vercel: https://________________________.vercel.app

Clés API:
ANTHROPIC_API_KEY: sk-ant-_________________________________
GEMINI_API_KEY:    AIza____________________________________
```

---

## ⏱️ Timeline

```
☐ Render Web Service créé     (2 min)
☐ Variables configurées        (2 min)
☐ Déploiement terminé         (5-7 min)
☐ Vercel VITE_API_URL ajouté  (1 min)
☐ Frontend redéployé          (2 min)
☐ Tests passés                (2 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: ~15 minutes
```

---

**Suivez cette checklist ligne par ligne et cochez au fur et à mesure! ✅**
