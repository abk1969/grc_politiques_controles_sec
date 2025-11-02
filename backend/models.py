"""
Modèles SQLAlchemy pour la base de données
"""

from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, Numeric, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from database import Base


class Requirement(Base):
    """
    Table des exigences extraites des fichiers Excel
    """
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)

    # Identifiant original du fichier Excel
    original_id = Column(String(255))

    # Texte de l'exigence
    requirement = Column(Text, nullable=False)

    # Point de vérification associé
    verification_point = Column(Text)

    # Métadonnées
    source_file = Column(String(500))
    source_sheet = Column(String(255))
    imported_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Statut de l'analyse
    analysis_status = Column(String(50), default='pending')  # pending, analyzed, manual

    # Référence à la session d'import
    import_session_id = Column(Integer, ForeignKey('import_sessions.id', ondelete='SET NULL'), index=True)

    # Relations
    mappings = relationship("ComplianceMapping", back_populates="requirement", cascade="all, delete-orphan")
    import_session = relationship("ImportSession", back_populates="requirements")


class SCFControl(Base):
    """
    Table des contrôles du Secure Controls Framework (SCF)
    """
    __tablename__ = "scf_controls"

    id = Column(Integer, primary_key=True, index=True)

    # Identifiant du contrôle SCF
    control_id = Column(String(100), unique=True, nullable=False, index=True)

    # Titre du contrôle
    control_title = Column(Text, nullable=False)

    # Description complète
    control_description = Column(Text)

    # Domaine/Catégorie
    domain = Column(String(255), index=True)

    # Sous-catégorie
    category = Column(String(255), index=True)

    # Niveau de criticité
    criticality = Column(String(50))

    # Mappings vers d'autres frameworks
    iso27001_mapping = Column(Text)
    iso27002_mapping = Column(Text)
    cobit5_mapping = Column(Text)
    nist_mapping = Column(Text)

    # Métadonnées
    version = Column(String(50))
    imported_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class ComplianceMapping(Base):
    """
    Table des mappings entre exigences et frameworks de conformité
    """
    __tablename__ = "compliance_mappings"

    id = Column(Integer, primary_key=True, index=True)

    # Référence à l'exigence
    requirement_id = Column(Integer, ForeignKey('requirements.id', ondelete='CASCADE'), nullable=False, index=True)

    # Mappings vers les frameworks
    scf_mapping = Column(String(500))
    iso27001_mapping = Column(String(500))
    iso27002_mapping = Column(String(500))
    cobit5_mapping = Column(String(500))

    # Analyse et justification
    analysis = Column(Text)
    confidence_score = Column(Numeric(3, 2))  # 0.00 à 1.00

    # Champs enrichis (agentive analysis)
    threat = Column(Text)  # Menace associée
    risk = Column(Text)  # Risque associé
    control_implementation = Column(Text)  # Guide d'implémentation

    # Source du mapping
    mapping_source = Column(String(50), default='manual', index=True)  # manual, ml, ai, imported

    # Métadonnées
    created_by = Column(String(255))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Un seul mapping actif par exigence
    is_active = Column(Boolean, default=True, index=True)

    # Référence à la session d'import
    import_session_id = Column(Integer, ForeignKey('import_sessions.id', ondelete='SET NULL'), index=True)

    # Relations
    requirement = relationship("Requirement", back_populates="mappings")
    import_session = relationship("ImportSession", back_populates="mappings")


class AnalysisHistory(Base):
    """
    Historique des analyses IA/ML
    """
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, index=True)

    # Référence au mapping
    mapping_id = Column(Integer, ForeignKey('compliance_mappings.id', ondelete='SET NULL'), index=True)

    # Détails de l'analyse
    model_used = Column(String(100))  # sentence-transformers, claude-3, etc.
    prompt_tokens = Column(Integer)
    completion_tokens = Column(Integer)
    total_cost = Column(Numeric(10, 4))

    # Résultat de l'analyse (JSON)
    analysis_result = Column(JSON)

    # Métadonnées
    analyzed_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    duration_ms = Column(Integer)


class ImportSession(Base):
    """
    Table de suivi des imports de fichiers Excel
    Permet de retrouver et recharger les analyses précédentes
    """
    __tablename__ = "import_sessions"

    id = Column(Integer, primary_key=True, index=True)

    # Informations sur le fichier source
    filename = Column(String(500), nullable=False, index=True)
    source_sheet = Column(String(255))

    # Statistiques de l'import
    total_requirements = Column(Integer, default=0)

    # Source de l'analyse
    analysis_source = Column(String(50), default='pending')  # pending, claude, ml, gemini, hybrid

    # Statut de l'import
    status = Column(String(50), default='processing')  # processing, completed, failed

    # Tags pour retrouver facilement
    tags = Column(Text)  # Tags séparés par virgules

    # Métadonnées supplémentaires (JSON)
    session_metadata = Column(JSONB)  # {user, description, version, etc.}

    # Horodatage
    import_date = Column(TIMESTAMP, server_default=func.now(), index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relations
    requirements = relationship("Requirement", back_populates="import_session")
    mappings = relationship("ComplianceMapping", back_populates="import_session")
