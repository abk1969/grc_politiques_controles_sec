# Guide de Déploiement

## Architecture de Déploiement

Cette application fullstack nécessite 3 services :
- **Frontend** (React/Vite)
- **Backend** (FastAPI Python + ML)
- **Database** (PostgreSQL)

## Option 1 : Déploiement Séparé (Recommandé)

### 1. Base de Données - Neon.tech (Gratuit)

1. Créer un compte sur [neon.tech](https://neon.tech)
2. Créer un nouveau projet PostgreSQL
3. Copier la connection string : `postgresql://user:password@host/dbname`
4. Exécuter les migrations :
   ```bash
   psql <connection-string> < database/schema.sql
   psql <connection-string> < database/migration_add_import_sessions.sql
   ```

### 2. Backend - Render.com (Gratuit)

1. Créer un compte sur [render.com](https://render.com)
2. Créer un nouveau **Web Service**
3. Connecter votre repo GitHub
4. Configuration :
   - **Build Command** : `pip install -r backend/requirements.txt`
   - **Start Command** : `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment** : Python 3.11

5. Ajouter les variables d'environnement :
   ```
   DATABASE_URL=<neon-connection-string>
   ANTHROPIC_API_KEY=<your-key>
   CLAUDE_API_KEY=<your-key>
   GEMINI_API_KEY=<your-key>
   ```

6. Noter l'URL du backend : `https://your-app.onrender.com`

### 3. Frontend - Vercel (Gratuit)

#### Via CLI :

1. Installer Vercel CLI :
   ```bash
   npm install -g vercel
   ```

2. Se connecter :
   ```bash
   vercel login
   ```

3. Déployer :
   ```bash
   vercel --prod
   ```

4. Ajouter les variables d'environnement dans le dashboard Vercel

## CORS Important

Le backend doit autoriser l'origine Vercel. Mettre à jour `backend/main.py` après déploiement avec l'URL Vercel.

## Coûts

- **Neon** : Gratuit jusqu'à 0.5GB
- **Render** : Gratuit (backend s'endort après 15min d'inactivité)
- **Vercel** : Gratuit (100GB bandwidth/mois)
