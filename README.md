# 🛡️ GRC Compliance Mapping AI

Application fullstack de mapping automatique de conformité GRC utilisant l'IA (Claude/Gemini) et des modèles ML open-source pour analyser les exigences et les mapper aux frameworks de conformité (SCF, ISO 27001/27002, COBIT 5).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)
![Python](https://img.shields.io/badge/python-3.11-blue.svg)
![React](https://img.shields.io/badge/react-19.2-61dafb.svg)

---

## 🚨 Vercel montre une page blanche?

**C'est normal!** Le frontend est déployé mais le backend n'est pas encore configuré.

### ⚡ Solution Express (15 minutes):
👉 **Suivre le guide:** [DEPLOY_NOW.md](./DEPLOY_NOW.md)

Ou en résumé:
1. **Backend:** Déployer sur [Render.com](https://render.com) (7 min)
2. **Vercel:** Ajouter `VITE_API_URL` dans Environment Variables (3 min)
3. **Test:** Ouvrir `/config-check.html` (5 min)

📖 Guide détaillé: [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)

---

## 🌟 Fonctionnalités

### ✨ Analyse Hybride
- **IA Générative (Claude/Gemini)** - Analyse contextuelle précise
- **ML Open-Source (Sentence-Transformers)** - Analyse rapide et gratuite
- **Comparaison des résultats** - Claude vs ML côte à côte

### 📊 Gestion d'exigences
- **Import Excel flexible** - Mapping automatique des colonnes
- **Historique complet** - Retrouvez vos analyses passées
- **Sauvegarde automatique** - Ne perdez jamais vos résultats
- **Tags et filtres** - Organisation optimale

### 🎯 Frameworks supportés
- **SCF (Secure Controls Framework)** - 1342+ contrôles
- **ISO 27001:2022 / ISO 27002:2022**
- **COBIT 5**

### 🚀 Performance
- **Analyse ML:** ~100ms par exigence
- **Cache intelligent** - Modèles pré-chargés
- **Base PostgreSQL** - Stockage persistant
- **Interface réactive** - React 19 + Vite

---

## 🚀 Démarrage Rapide

### Prérequis

- **Docker Desktop** v20.10+
- **Docker Compose** v2.0+
- **Git** v2.30+

### Installation en 3 commandes

\`\`\`bash
# 1. Cloner le repository
git clone https://github.com/votre-username/grc-compliance-mapping.git
cd grc-compliance-mapping

# 2. Configurer les variables d'environnement
cp .env.example .env

# 3. Lancer l'application
docker compose up -d --build
\`\`\`

**Accès:**
- 🌐 Frontend: http://localhost:3000
- 🔌 Backend API: http://localhost:8000
- 📊 API Docs: http://localhost:8000/docs

---

## 📖 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Guide complet de déploiement
- **[CLAUDE.md](CLAUDE.md)** - Instructions pour Claude Code

---

## 🛠️ Stack Technique

### Frontend
- React 19.2, TypeScript, Vite, Tailwind CSS, Nginx

### Backend
- Python 3.11, FastAPI, SQLAlchemy
- Sentence-Transformers (paraphrase-multilingual-mpnet-base-v2)
- Pandas, Loguru

### Base de données
- PostgreSQL 16

### DevOps
- Docker, Docker Compose

---

## 🐳 Commandes Docker utiles

\`\`\`bash
# Démarrer les services
docker compose up -d

# Voir les logs
docker compose logs -f

# Arrêter les services
docker compose down

# Rebuild complet
docker compose build --no-cache
\`\`\`

---

## 📁 Structure du projet

\`\`\`
grc-compliance-mapping/
├── backend/                    # Backend Python FastAPI
├── components/                # Composants React
├── services/                  # Services frontend
├── database/                  # Scripts SQL
├── docker-compose.yml        # Orchestration Docker
├── Dockerfile                # Image Docker frontend
├── .env.example              # Template variables d'environnement
├── DEPLOYMENT.md             # Guide de déploiement
└── README.md                 # Ce fichier
\`\`\`

---

## 📜 Licence

Ce projet est sous licence MIT.

---

**Fait avec ❤️ pour simplifier la compliance GRC**
