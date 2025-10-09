# 🚀 GRC Compliance Mapping - Guide de Déploiement Docker

Ce guide explique comment containeriser, tester localement, pousser sur GitHub, et déployer l'application fullstack.

---

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Configuration initiale](#configuration-initiale)
3. [Build et test local avec Docker](#build-et-test-local-avec-docker)
4. [Push sur GitHub](#push-sur-github)
5. [Options de déploiement](#options-de-déploiement)
6. [Dépannage](#dépannage)

---

## 🔧 Prérequis

### Logiciels nécessaires

- **Docker Desktop** (v20.10+) - [Télécharger](https://www.docker.com/products/docker-desktop/)
- **Docker Compose** (v2.0+) - Inclus avec Docker Desktop
- **Git** (v2.30+)
- **Node.js 20+** (optionnel, pour dev local)

### Vérification

```bash
docker --version
docker-compose --version
git --version
```

---

## ⚙️ Configuration initiale

### 1. Copier le fichier d'environnement

```bash
cp .env.example .env
```

### 2. Éditer `.env` avec vos valeurs

```env
# PostgreSQL
POSTGRES_PASSWORD=votre_mot_de_passe_securise

# Ports (changez si nécessaire)
FRONTEND_PORT=3000
BACKEND_PORT=8000
POSTGRES_PORT=5432

# Backend URL pour le frontend
VITE_API_URL=http://localhost:8000
```

⚠️ **Important:** Ne jamais commit le fichier `.env` (déjà dans `.gitignore`)

---

## 🐳 Build et test local avec Docker

### Option 1: Tout lancer en une commande (Recommandé)

```bash
# Build et démarrage de tous les services
docker-compose up --build

# Ou en arrière-plan (detached mode)
docker-compose up -d --build
```

**Services lancés:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

### Option 2: Build séparé puis lancement

```bash
# 1. Build toutes les images
docker-compose build

# 2. Démarrer les services
docker-compose up
```

### Vérification de santé

```bash
# Health check backend
curl http://localhost:8000/health

# Health check frontend
curl http://localhost:3000/health

# Vérifier les logs
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f backend
```

### Arrêter les services

```bash
# Arrêter les containers
docker-compose down

# Arrêter ET supprimer les volumes (⚠️ Données perdues)
docker-compose down -v
```

---

## 📤 Push sur GitHub

### 1. Initialiser Git (si pas déjà fait)

```bash
git init
git add .
git commit -m "Initial commit: GRC Compliance Mapping with Docker"
```

### 2. Créer un repository GitHub

1. Allez sur [GitHub](https://github.com/new)
2. Créez un nouveau repository (ex: `grc-compliance-mapping`)
3. **Ne pas** initialiser avec README, .gitignore ou license

### 3. Pousser le code

```bash
# Ajouter le remote
git remote add origin https://github.com/votre-username/grc-compliance-mapping.git

# Pousser le code
git branch -M main
git push -u origin main
```

### 4. Vérifier le push

✅ Les fichiers suivants **doivent** être sur GitHub:
- `Dockerfile`
- `docker-compose.yml`
- `backend/Dockerfile`
- `.env.example`
- `DEPLOYMENT.md`

❌ Les fichiers suivants **ne doivent PAS** être sur GitHub:
- `.env` (secrets)
- `backend/.venv/` (dépendances Python)
- `node_modules/` (dépendances Node)
- `backend/cache/` (modèles ML)

---

## 🌐 Options de déploiement

### Option A: Railway (Recommandé pour backend+DB)

**Avantages:**
- PostgreSQL intégré
- Build automatique depuis GitHub
- SSL gratuit
- $5/mois (500h gratuit pour commencer)

**Étapes:**

1. **Créer un compte:** [railway.app](https://railway.app)

2. **Nouveau projet:**
   ```
   New Project → Deploy from GitHub → Sélectionner votre repo
   ```

3. **Ajouter PostgreSQL:**
   ```
   Add Service → Database → PostgreSQL
   ```

4. **Variables d'environnement (Backend):**
   ```
   DATABASE_URL: ${{Postgres.DATABASE_URL}}  (auto-généré)
   PYTHONUNBUFFERED: 1
   ```

5. **Variables d'environnement (Frontend):**
   ```
   VITE_API_URL: https://votre-backend.railway.app
   ```

6. **Déployer:**
   - Railway détecte automatiquement le `Dockerfile`
   - Build et déploiement automatique à chaque push

**URLs générées:**
- Backend: `https://grc-backend-production.up.railway.app`
- Frontend: `https://grc-frontend-production.up.railway.app`

---

### Option B: Vercel (Frontend seulement) + Railway (Backend)

**Avantages:**
- Vercel gratuit pour frontend
- CDN global ultra-rapide
- Railway pour backend lourd

**Frontend sur Vercel:**

1. **Installer Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Déployer:**
   ```bash
   vercel
   ```

3. **Variables d'environnement Vercel:**
   ```
   VITE_API_URL: https://votre-backend.railway.app
   ```

**Backend sur Railway:** Voir Option A

---

### Option C: Render

**Avantages:**
- Alternative à Railway
- PostgreSQL gratuit (750h/mois)
- Build depuis Docker

**Étapes:**

1. **Créer compte:** [render.com](https://render.com)

2. **Backend (Web Service):**
   ```
   New → Web Service → Connect GitHub → Sélectionner repo
   Runtime: Docker
   Dockerfile Path: backend/Dockerfile
   ```

3. **PostgreSQL:**
   ```
   New → PostgreSQL
   ```

4. **Frontend (Static Site):**
   ```
   New → Static Site
   Build Command: npm run build
   Publish Directory: dist
   ```

---

### Option D: Fly.io

**Avantages:**
- Très performant
- Support Docker natif
- PostgreSQL via Fly Postgres

**Étapes:**

1. **Installer Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Déployer backend:**
   ```bash
   cd backend
   fly launch
   ```

4. **Ajouter PostgreSQL:**
   ```bash
   fly postgres create
   fly postgres attach <postgres-app-name>
   ```

---

## 🧪 Tests avant déploiement

### 1. Test de build

```bash
# Vérifier que les images se construisent sans erreur
docker-compose build --no-cache
```

### 2. Test de démarrage

```bash
# Lancer et attendre 60 secondes
docker-compose up -d
sleep 60

# Vérifier les health checks
docker-compose ps

# Tous les services doivent être "healthy" ou "running"
```

### 3. Test fonctionnel

```bash
# Backend health
curl http://localhost:8000/health
# Attendu: {"status":"healthy","database":"connected","ml_service":"ready"}

# Frontend health
curl http://localhost:3000/health
# Attendu: healthy

# Test API
curl http://localhost:8000/api/import-sessions
# Attendu: {"success":true,"total":0,"sessions":[]}
```

### 4. Test dans un navigateur

1. Ouvrir http://localhost:3000
2. Importer un fichier Excel
3. Vérifier le mapping
4. Lancer l'analyse
5. Vérifier les résultats

---

## 🐛 Dépannage

### Problème: Port déjà utilisé

```bash
# Trouver le processus
netstat -ano | findstr :3000   # Windows
lsof -i :3000                  # Mac/Linux

# Changer le port dans .env
FRONTEND_PORT=3001
```

### Problème: Modèle ML ne se charge pas

```bash
# Vérifier l'espace disque
docker system df

# Augmenter la mémoire Docker (Docker Desktop → Settings → Resources)
# Minimum: 4GB RAM, 20GB Disk
```

### Problème: PostgreSQL ne démarre pas

```bash
# Supprimer les volumes et recréer
docker-compose down -v
docker-compose up -d postgres
docker-compose logs postgres
```

### Problème: Frontend ne se connecte pas au backend

```bash
# Vérifier les variables d'environnement
docker-compose exec frontend env | grep VITE_API_URL

# Vérifier CORS backend
curl -v http://localhost:8000/health
```

### Logs détaillés

```bash
# Tous les services
docker-compose logs -f --tail=100

# Service spécifique
docker-compose logs -f backend

# Entrer dans un container
docker-compose exec backend sh
docker-compose exec frontend sh
```

---

## 📊 Métriques et monitoring

### Utilisation ressources

```bash
# Stats temps réel
docker stats

# Espace disque
docker system df -v
```

### Nettoyage

```bash
# Nettoyer les images non utilisées
docker image prune -a

# Nettoyer tout (⚠️ Attention)
docker system prune -a --volumes
```

---

## 🔒 Sécurité - Checklist production

- [ ] Changer `POSTGRES_PASSWORD` dans `.env`
- [ ] Désactiver le mode debug Python
- [ ] Configurer CORS correctement (domaines autorisés)
- [ ] Utiliser HTTPS (certificat SSL)
- [ ] Limiter les origines API
- [ ] Activer les logs de sécurité
- [ ] Mettre à jour régulièrement les images de base
- [ ] Scanner les vulnérabilités: `docker scan <image>`

---

## 📚 Ressources utiles

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)

---

## 🆘 Support

En cas de problème:
1. Vérifier les logs: `docker-compose logs -f`
2. Vérifier le fichier `.env`
3. Reconstruire les images: `docker-compose build --no-cache`
4. Ouvrir une issue sur GitHub

---

**Fait avec ❤️ pour la compliance GRC**
