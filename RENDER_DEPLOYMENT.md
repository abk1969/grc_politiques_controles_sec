# Guide de Déploiement sur Render.com

## Prérequis

- Compte GitHub avec le repository poussé
- Compte Render.com (gratuit) : https://render.com

## Étapes de Déploiement

### 1. Créer un compte Render

1. Aller sur https://render.com
2. Cliquer "Get Started"
3. S'inscrire avec GitHub (recommandé)

### 2. Créer la Base de Données PostgreSQL

1. Dans le dashboard Render, cliquer **"New +"** → **"PostgreSQL"**
2. Configuration :
   - **Name** : `grc-db`
   - **Database** : `grc_compliance`
   - **User** : `grc_user`
   - **Region** : Oregon (us-west)
   - **Plan** : Free
3. Cliquer **"Create Database"**
4. **IMPORTANT** : Copier la **Internal Database URL** (commence par `postgresql://`)
   - Format : `postgresql://grc_user:password@host/grc_compliance`
5. Attendre que la base soit créée (~2 minutes)

### 3. Exécuter les Migrations SQL

Une fois la base créée, initialiser le schéma :

```bash
# Récupérer l'Internal Database URL depuis Render
# Remplacer <DATABASE_URL> par votre URL

psql "<DATABASE_URL>" < database/schema.sql
psql "<DATABASE_URL>" < database/migration_add_import_sessions.sql
```

OU via l'interface Render :
1. Aller dans la base de données → **"Shell"**
2. Copier-coller le contenu de `database/schema.sql`
3. Puis le contenu de `database/migration_add_import_sessions.sql`

### 4. Déployer le Backend

1. Dans le dashboard Render, cliquer **"New +"** → **"Web Service"**
2. Cliquer **"Connect a repository"** → Autoriser GitHub
3. Sélectionner votre repository : `grc_politiques_controles_sec`
4. Configuration :
   - **Name** : `grc-backend`
   - **Region** : Oregon (us-west)
   - **Branch** : `main`
   - **Root Directory** : laisser vide
   - **Runtime** : Python 3
   - **Build Command** : `pip install -r backend/requirements.txt`
   - **Start Command** : `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan** : Free

5. **Variables d'environnement** (section "Environment") :
   Ajouter ces variables :
   
   ```
   PYTHON_VERSION = 3.11.0
   DATABASE_URL = <votre-internal-database-url>
   ANTHROPIC_API_KEY = <votre-clé>
   CLAUDE_API_KEY = <votre-clé>
   GEMINI_API_KEY = <votre-clé>
   ```

6. Cliquer **"Create Web Service"**

### 5. Attendre le Déploiement

- Le premier build prend ~10-15 minutes (installation des dépendances ML)
- Suivre les logs en temps réel dans l'interface
- Le service est prêt quand vous voyez : `✓ Modèle ML chargé avec succès`

### 6. Vérifier le Déploiement

URL du backend : `https://grc-backend-xxxx.onrender.com`

Tester :
```bash
curl https://grc-backend-xxxx.onrender.com/health
# Devrait retourner : {"status":"healthy","database":"connected","ml_service":"ready"}
```

Voir la documentation API :
- https://grc-backend-xxxx.onrender.com/docs

### 7. Mettre à Jour le Frontend Vercel

1. Aller sur https://vercel.com
2. Sélectionner votre projet "poli_cont_app"
3. **Settings** → **Environment Variables**
4. Modifier `VITE_API_URL` :
   ```
   VITE_API_URL = https://grc-backend-xxxx.onrender.com
   ```
5. **Deployments** → Cliquer sur les 3 points du dernier déploiement → **"Redeploy"**

### 8. Mettre à Jour CORS dans le Backend

Ajouter l'URL Vercel dans `backend/main.py` :

```python
allow_origins=[
    "https://policont-4my0v3d8d-globacom3000s-projects.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:5173"
]
```

Commiter et pusher :
```bash
git add backend/main.py
git commit -m "Add Vercel origin to CORS"
git push
```

Render redéploiera automatiquement !

## Limitations du Plan Gratuit

### Render Free Tier :
- **Backend** : 
  - 750 heures/mois de compute (suffisant)
  - Service s'endort après 15min d'inactivité
  - Redémarrage : ~30-60 secondes (rechargement du modèle ML)
- **Database** :
  - 1GB de stockage
  - Expire après 90 jours d'inactivité
  - Pas de backups automatiques

### Optimisations :

1. **Keep-alive** : Créer un cron job pour ping le backend toutes les 14 minutes
2. **Cache ML** : Le cache des embeddings est persistant dans `/app/cache`

## Troubleshooting

### Build échoue avec "Out of memory"
- Normal pour free tier avec modèles ML lourds
- Réessayer le déploiement (parfois ça passe au 2ème essai)

### Backend prend du temps à répondre
- Premier appel après idle : ~60 secondes (réveil + chargement ML)
- Appels suivants : rapides

### Erreur "Database connection failed"
- Vérifier que `DATABASE_URL` est bien défini
- Vérifier que la base de données est active
- Utiliser l'**Internal Database URL**, pas l'External

### Logs utiles

Voir les logs en temps réel :
```bash
# Via Render dashboard → Backend service → Logs
# OU via CLI :
render logs grc-backend --tail
```

## URLs Finales

Après déploiement complet :

- **Frontend** : https://policont-4my0v3d8d-globacom3000s-projects.vercel.app
- **Backend** : https://grc-backend-xxxx.onrender.com
- **API Docs** : https://grc-backend-xxxx.onrender.com/docs
- **Database** : Internal URL (dans Render dashboard)

## Coûts

- **Total** : $0/mois (100% gratuit)
- **Render Free** : Backend + Database
- **Vercel Free** : Frontend

## Prochaines Étapes

Une fois tout déployé :
1. Tester l'import d'un fichier Excel
2. Vérifier que l'historique fonctionne
3. Tester l'analyse ML

Bon déploiement ! 🚀
