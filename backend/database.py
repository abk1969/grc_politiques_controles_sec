"""
Configuration de la base de données PostgreSQL avec SQLAlchemy
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# Charger les variables d'environnement
load_dotenv()

# Récupérer l'URL de la base de données
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/grc_compliance"
)

# Créer le moteur SQLAlchemy
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Vérifier la connexion avant utilisation
    echo=False  # Mettre à True pour debug SQL
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base pour les modèles
Base = declarative_base()

# Dependency pour FastAPI
def get_db():
    """
    Dependency pour obtenir une session de base de données
    Utilisation: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialiser la base de données (créer les tables)
    """
    import models  # Import local pour éviter la circularité
    Base.metadata.create_all(bind=engine)
    print("✅ Base de données initialisée")


def reset_db():
    """
    ATTENTION: Supprime et recrée toutes les tables
    """
    import models  # Import local pour éviter la circularité
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("⚠️ Base de données réinitialisée")


if __name__ == "__main__":
    # Test de connexion
    print(f"Testing connection to: {DATABASE_URL}")
    try:
        with engine.connect() as conn:
            print("✅ Connexion réussie à PostgreSQL")
            init_db()
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
