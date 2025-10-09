# 🚀 Quick Start Docker - GRC Compliance Mapping

## Démarrage Rapide (avec Docker)

### Prérequis
- Docker Desktop installé
- Git installé
- Clé API Claude ou Gemini (optionnel mais recommandé)

### 1. Configuration des Variables d'Environnement

Copiez `.env.example` vers `.env` et configurez:

```bash
cp .env.example .env
```

**Variables importantes à configurer:**

```env
# PostgreSQL
POSTGRES_PASSWORD=VotreMotDePasseSécurisé

# Ports (changez si déjà occupés)
POSTGRES_PORT=5433
BACKEND_PORT=8001
FRONTEND_PORT=3001

# API Backend URL
VITE_API_URL=http://localhost:8001

# Clés API LLM (au moins une recommandée)
ANTHROPIC_API_KEY=sk-ant-api03-VOTRE_CLE_ICI
# ou
GEMINI_API_KEY=VOTRE_CLE_GEMINI_ICI
```

### 2. Construction et Démarrage

```bash
# Construire et démarrer tous les services
docker compose up -d --build

# Vérifier le statut
docker compose ps

# Voir les logs
docker compose logs -f
```

### 3. Accès à l'Application

Une fois tous les services en statut "healthy" (attendre 1-2 minutes pour le backend):

- **Application Web**: http://localhost:3001
- **API Backend**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs
- **PostgreSQL**: localhost:5433

### 4. Première Utilisation

1. Ouvrez http://localhost:3001 dans votre navigateur
2. Cliquez sur "Choisir un fichier" et sélectionnez un fichier Excel
3. Mappez les colonnes (ID, Exigence, Point de Vérification)
4. Lancez l'analyse hybride:
   - Claude/Gemini pour l'analyse LLM
   - Backend ML pour le matching SCF
5. Consultez les résultats et l'historique des imports

## Gestion des Services

### Commandes Utiles

```bash
# Démarrer les services
docker compose up -d

# Arrêter les services
docker compose down

# Arrêter et SUPPRIMER les volumes (⚠️ perte de données)
docker compose down -v

# Reconstruire un service spécifique
docker compose up -d --build frontend
docker compose up -d --build backend

# Voir les logs en temps réel
docker compose logs -f backend
docker compose logs -f frontend

# Redémarrer un service
docker compose restart backend
```

### Vérification de la Santé

```bash
# Backend health check
curl http://localhost:8001/health
# Réponse attendue: {"status":"healthy","database":"connected","ml_service":"ready"}

# Frontend health check
curl http://localhost:3001/health
# Réponse attendue: healthy

# PostgreSQL
docker exec grc_postgres pg_isready -U postgres
# Réponse attendue: /var/run/postgresql:5432 - accepting connections
```

## Troubleshooting

### Erreur "Port already in use"

Si un port est déjà occupé, changez-le dans `.env`:

```env
FRONTEND_PORT=3002  # Au lieu de 3001
BACKEND_PORT=8002   # Au lieu de 8001
POSTGRES_PORT=5434  # Au lieu de 5433
```

Puis recréez les services:
```bash
docker compose down
docker compose up -d
```

### Erreur "Password authentication failed"

PostgreSQL a été initialisé avec un ancien mot de passe. Supprimez le volume et recréez:

```bash
docker compose down -v
docker compose up -d
```

### Erreur "ClaudeConfigError" dans le navigateur

Votre clé API n'a pas été intégrée au build. Ajoutez-la dans `.env` puis reconstruisez le frontend:

```bash
docker compose up -d --build frontend
```

### Backend prend beaucoup de temps à démarrer

C'est normal! Le backend charge des modèles ML (Sentence-Transformers) qui pèsent plusieurs GB. Attendez 1-2 minutes.

```bash
# Surveillez les logs
docker compose logs -f backend
```

### Frontend montre "unhealthy" mais fonctionne

C'est un faux positif. Le health check Docker peut échouer pendant que le service fonctionne. Testez manuellement:

```bash
curl http://localhost:3001/health
```

## Architecture Docker

### Services

1. **grc_postgres** (PostgreSQL 16)
   - Port: 5433:5432
   - Volume: `postgres_data` (persistant)
   - Contient: exigences, mappings, historique des imports

2. **grc_backend** (Python FastAPI + ML)
   - Port: 8001:8000
   - Volume: `ml_cache` (modèles ML téléchargés)
   - Contient: API REST, modèles Sentence-Transformers, logique ML

3. **grc_frontend** (React + Nginx)
   - Port: 3001:80
   - Contient: Interface web, appels Claude/Gemini

### Volumes

```bash
# Lister les volumes
docker volume ls | grep poli_cont_app

# Inspecter un volume
docker volume inspect poli_cont_app_postgres_data
docker volume inspect poli_cont_app_ml_cache

# Sauvegarder la base de données
docker exec grc_postgres pg_dump -U postgres grc_compliance > backup.sql

# Restaurer la base de données
docker exec -i grc_postgres psql -U postgres grc_compliance < backup.sql
```

## Déploiement en Production

### Option 1: Railway (Recommandé)

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) section Railway.

### Option 2: VPS avec Docker Compose

1. Clonez le repo sur votre VPS
2. Configurez `.env` avec des mots de passe sécurisés
3. Ajoutez un reverse proxy (Nginx/Traefik) avec HTTPS
4. Démarrez avec `docker compose up -d`

### Sécurité Production

⚠️ **Important pour la production:**

1. **Changez TOUS les mots de passe** dans `.env`
2. **Utilisez HTTPS** (Let's Encrypt avec Certbot)
3. **Activez le firewall** (n'exposez que 80/443)
4. **Limitez les CORS** dans le backend
5. **Activez les backups automatiques** PostgreSQL
6. **Surveillez les logs** et configurez des alertes

## Support

- **Documentation**: [README.md](./README.md)
- **Déploiement**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Issues GitHub**: https://github.com/abk1969/grc_politiques_controles_sec/issues
- **Architecture**: [ARCHITECTURE_COEXISTENCE.md](./ARCHITECTURE_COEXISTENCE.md)

---

🤖 Généré avec Claude Code
