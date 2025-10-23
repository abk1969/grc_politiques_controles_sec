# Guide de démarrage - GRC Compliance Mapping AI

Ce guide explique comment démarrer et arrêter l'application facilement.

## Prérequis

- **Docker Desktop** (Windows/Mac) ou **Docker** (Linux)
- **Node.js** v20+ et **npm**
- **Git Bash** (pour Windows, si vous utilisez les scripts `.sh`)

## Scripts disponibles

### Windows (PowerShell)

**Démarrer l'application :**
```powershell
.\start-app.ps1
```

**Arrêter l'application :**
```powershell
.\stop-app.ps1
```

### Linux / macOS / Git Bash

**Démarrer l'application :**
```bash
./start-app.sh
```

**Arrêter l'application :**
```bash
./stop-app.sh
```

## Ce que font les scripts

### Script de démarrage (`start-app`)

1. **Vérifie Docker** : S'assure que Docker est installé et en cours d'exécution
2. **Démarre les services Docker** : Lance PostgreSQL et le backend API (FastAPI)
3. **Attend le backend** : Patiente jusqu'à ce que le modèle ML soit chargé (~30-60 secondes)
4. **Démarre le frontend** : Lance le serveur de développement Vite

### Script d'arrêt (`stop-app`)

1. **Arrête le frontend** : Termine le processus du serveur Vite
2. **Arrête Docker** : Arrête tous les conteneurs (backend, frontend Docker, PostgreSQL)

## URLs de l'application

Après le démarrage, l'application est accessible sur :

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend (dev)** | http://localhost:3002 | Serveur de développement Vite avec HMR |
| **Frontend (alt)** | http://localhost:3003 | Si le port 3002 est occupé |
| **Frontend (Docker)** | http://localhost:3001 | Version Docker du frontend |
| **Backend API** | http://localhost:8001 | API FastAPI |
| **API Docs** | http://localhost:8001/docs | Documentation Swagger |
| **PostgreSQL** | localhost:5433 | Base de données |

## Commandes Docker utiles

### Voir les logs en temps réel

```bash
# Tous les services
docker compose logs -f

# Backend uniquement
docker compose logs backend -f

# Frontend Docker uniquement
docker compose logs frontend -f

# PostgreSQL uniquement
docker compose logs postgres -f
```

### Vérifier l'état des services

```bash
docker compose ps
```

### Redémarrer un service spécifique

```bash
# Redémarrer le backend
docker compose restart backend

# Redémarrer le frontend Docker
docker compose restart frontend

# Redémarrer PostgreSQL
docker compose restart postgres
```

### Reconstruire les images

```bash
# Reconstruire et redémarrer
docker compose up -d --build

# Reconstruire sans cache
docker compose build --no-cache
```

## Démarrage manuel (sans scripts)

Si vous préférez démarrer manuellement :

### 1. Démarrer Docker

```bash
docker compose up -d
```

### 2. Attendre que le backend soit prêt

```bash
# Vérifier le health check
curl http://localhost:8001/health

# Ou voir les logs
docker compose logs backend -f
```

### 3. Démarrer le frontend

```bash
npm run dev
```

## Dépannage

### Le backend ne démarre pas

```bash
# Voir les logs détaillés
docker compose logs backend

# Vérifier que PostgreSQL est prêt
docker compose ps postgres

# Redémarrer le backend
docker compose restart backend
```

### Le frontend ne démarre pas

```bash
# Réinstaller les dépendances
npm install

# Vérifier les processus en cours
# Windows PowerShell :
Get-Process -Name node

# Linux/macOS/Git Bash :
ps aux | grep node
```

### Port déjà utilisé

Si un port est déjà utilisé, vous pouvez :
1. Arrêter le processus qui utilise ce port
2. Modifier le port dans `docker-compose.yml` ou `vite.config.ts`

### Docker compose : erreur "port is already allocated"

```bash
# Arrêter tous les conteneurs
docker compose down

# Vérifier qu'aucun conteneur n'utilise les ports
docker ps -a

# Redémarrer
docker compose up -d
```

## Variables d'environnement

Les variables d'environnement sont définies dans :
- `.env` (backend)
- `.env.local` (frontend)

Pour des raisons de sécurité, ces fichiers ne sont pas versionnés. Créez-les en vous basant sur les exemples fournis.

## Premier démarrage

Le premier démarrage peut prendre 3-5 minutes car :
1. Docker télécharge les images de base
2. Le backend installe les dépendances Python
3. Le modèle ML (~400 MB) est téléchargé et chargé en mémoire

Les démarrages suivants sont beaucoup plus rapides (~30 secondes).

## Support

Pour plus d'informations, consultez :
- `README.md` : Documentation principale du projet
- `CLAUDE.md` : Guide technique pour Claude Code
- `docker-compose.yml` : Configuration des services Docker
