# 🚀 Guide Déploiement Complet - 20 Minutes

## ✅ PARTIE 1: BACKEND SUR RENDER.COM (10 min)

### Étape 1.1: Préparer vos clés API

**AVANT de commencer, avoir ces 2 clés:**

**Clé Anthropic (Claude):**
1. Aller: https://console.anthropic.com/settings/keys
2. Cliquer "Create Key"
3. Copier la clé (commence par `sk-ant-`)
4. **SAUVEGARDER** dans un fichier texte

**Clé Gemini (optionnel mais recommandé):**
1. Aller: https://aistudio.google.com/app/apikey
2. Cliquer "Create API Key"
3. Copier la clé (commence par `AIza`)
4. **SAUVEGARDER** dans un fichier texte

---

### Étape 1.2: Créer le service Backend

**1. Aller sur:** https://dashboard.render.com

**2. Cliquer:** Bouton bleu "New +" → "Web Service"

**3. Connecter le repo:**
- Chercher: `grc_politiques_controles_sec`
- Cliquer "Connect"

**4. FORMULAIRE - Copier-coller exactement:**

```
Name:
grc-backend

Language:
⚠️ IMPORTANT: Sélectionner "Python 3" (PAS Docker!)

Region:
Frankfurt (EU Central)

Branch:
main

Root Directory:
backend

Build Command:
pip install -r requirements.txt

Start Command:
uvicorn main:app --host 0.0.0.0 --port $PORT

Instance Type:
Free
```

---

### Étape 1.3: Variables d'environnement

**⚠️ NE PAS cliquer "Create Web Service" encore!**

**Scroller vers le bas → Section "Environment Variables"**

**Cliquer "Add Environment Variable" 4 fois:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Variable 1:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Key:   PYTHONUNBUFFERED
Value: 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Variable 2:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Key:   ANTHROPIC_API_KEY
Value: [COLLER votre clé sk-ant-xxxxx]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Variable 3:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Key:   CLAUDE_API_KEY
Value: [MÊME clé que ANTHROPIC_API_KEY]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Variable 4:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Key:   GEMINI_API_KEY
Value: [COLLER votre clé AIzaxxxxx]
```

---

### Étape 1.4: Déployer

**MAINTENANT cliquer "Create Web Service"**

**Attendre 5-7 minutes:**
- Vous verrez des logs défiler
- "Cloning from GitHub..."
- "Installing dependencies..."
- "Starting service..."
- Status devient: 🟢 **Live**

**⚠️ TRÈS IMPORTANT:**
**COPIER l'URL qui apparaît en haut:**
```
https://grc-backend-XXXXXX.onrender.com
```

**Garder cette URL dans un fichier texte!**

---

### Étape 1.5: Tester le backend

**Ouvrir dans votre navigateur:**
```
https://grc-backend-XXXXXX.onrender.com/health
```

**DOIT afficher:**
```json
{"status":"healthy","timestamp":"...","version":"1.0.0"}
```

**✅ Si vous voyez ça → Backend OK! Passer à la Partie 2**

**❌ Si erreur 502/500:**
1. Render Dashboard → Service → Logs
2. Chercher ligne rouge avec "ERROR"
3. Me l'envoyer

---

## ✅ PARTIE 2: FRONTEND SUR VERCEL (5 min)

### Étape 2.1: Nouveau projet

**1. Aller sur:** https://vercel.com/new

**2. Import Git Repository:**
- Chercher: `grc_politiques_controles_sec`
- Cliquer "Import"

---

### Étape 2.2: Configuration

**Formulaire "Configure Project":**

```
Project Name:
grc-politiques-controles-sec

Framework Preset:
Vite
(devrait être auto-détecté)

Root Directory:
./
(laisser par défaut)

Build Command:
npm run build

Output Directory:
dist

Install Command:
npm install
```

---

### Étape 2.3: Variable d'environnement

**⚠️ AVANT de cliquer "Deploy"!**

**Scroller vers "Environment Variables"**

**Cliquer "Add Environment Variable":**

```
Key:
VITE_API_URL

Value:
[COLLER l'URL Render copiée à l'étape 1.4]
Exemple: https://grc-backend-abc123.onrender.com

Environments:
☑ Production
☑ Preview
☑ Development
```

---

### Étape 2.4: Déployer

**Cliquer "Deploy"**

**Attendre 2-3 minutes:**
- "Building..."
- "Deploying..."
- "Success!"

**Vercel va afficher une URL:**
```
https://grc-politiques-controles-sec-xxxxx.vercel.app
```

---

## ✅ PARTIE 3: TESTS (5 min)

### Test 1: Diagnostic automatique

**Ouvrir:**
```
https://VOTRE-URL-VERCEL.vercel.app/config-check.html
```

**Vérifier tout vert:**
- ✅ VITE_API_URL configuré
- ✅ Backend Health OK
- ✅ AI Proxy OK

---

### Test 2: Application réelle

**1. Ouvrir:**
```
https://VOTRE-URL-VERCEL.vercel.app
```

**2. Créer un fichier Excel test:**
```
| id | requirement                    | point_de_verification |
|----|--------------------------------|----------------------|
| 1  | Mots de passe 12 caractères    | Politique IAM        |
| 2  | Chiffrement des données        | Audit sécurité       |
```

**3. Upload → Mapper les colonnes → Analyser**

**4. Attendre 20-30 secondes**

**5. ✅ Vérifier résultats:**
- Mappings SCF affichés
- Mappings ISO27001/27002
- Mappings COBIT5

---

## 🎉 SUCCÈS!

Si les 2 tests passent → **Application 100% opérationnelle!**

---

## 🚨 En cas de problème

### Backend Render erreur 502
```
→ Dashboard Render → Service → Logs
→ Copier l'erreur en rouge
→ Vérifier que Language = Python 3 (PAS Docker)
→ Vérifier que Root Directory = backend
```

### Frontend Vercel page blanche
```
→ F12 (DevTools) → Console
→ Copier l'erreur
→ Vérifier que VITE_API_URL est configuré
→ Vérifier que l'URL pointe vers Render
```

### Backend fonctionne mais frontend ne communique pas
```
→ Vérifier VITE_API_URL dans Vercel
→ Doit être exactement: https://grc-backend-xxxxx.onrender.com
→ SANS slash "/" à la fin
→ Redéployer Vercel après modification
```

---

## 📋 Checklist Complète

**Backend Render:**
- [ ] Language = Python 3
- [ ] Root Directory = backend
- [ ] 4 variables d'environnement ajoutées
- [ ] Status = Live (vert)
- [ ] /health retourne {"status":"healthy"}
- [ ] URL copiée

**Frontend Vercel:**
- [ ] Framework = Vite
- [ ] VITE_API_URL configuré avec URL Render
- [ ] Deployment = Success
- [ ] /config-check.html tout vert
- [ ] Upload Excel fonctionne

---

## 📝 URLs à noter

**Remplir après déploiement:**

```
Backend Render:
https://grc-backend-________________.onrender.com

Frontend Vercel:
https://__________________________.vercel.app

Clés API utilisées:
ANTHROPIC_API_KEY: sk-ant-___________________________
GEMINI_API_KEY:    AIza_____________________________
```

---

**Temps total estimé: 20 minutes**
**Difficulté: Facile (copier-coller)**
