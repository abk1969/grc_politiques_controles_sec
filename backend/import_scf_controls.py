"""
Script pour importer les contrôles SCF depuis le fichier Excel vers PostgreSQL
"""

import pandas as pd
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import SCFControl
from loguru import logger
import sys
from pathlib import Path

# Configuration du logger
logger.add(sys.stdout, colorize=True, format="<green>{time}</green> <level>{message}</level>")


def import_scf_from_excel(excel_file_path: str, sheet_name: str = None):
    """
    Importe les contrôles SCF depuis un fichier Excel

    Args:
        excel_file_path: Chemin vers le fichier Excel SCF
        sheet_name: Nom de la feuille à importer (None = première feuille)
    """
    logger.info(f"📂 Lecture du fichier Excel: {excel_file_path}")

    try:
        # Lire le fichier Excel
        excel_file = pd.ExcelFile(excel_file_path)

        # Afficher les feuilles disponibles
        logger.info(f"📋 Feuilles disponibles: {excel_file.sheet_names}")

        # Déterminer la feuille à lire
        if sheet_name and sheet_name in excel_file.sheet_names:
            target_sheet = sheet_name
        else:
            # Essayer de trouver une feuille pertinente
            possible_sheets = [s for s in excel_file.sheet_names if 'control' in s.lower() or 'scf' in s.lower()]
            target_sheet = possible_sheets[0] if possible_sheets else excel_file.sheet_names[0]

        logger.info(f"📖 Lecture de la feuille: {target_sheet}")

        # Lire les données
        df = pd.read_excel(excel_file_path, sheet_name=target_sheet)

        logger.info(f"📊 Lignes lues: {len(df)}")
        logger.info(f"📊 Colonnes: {list(df.columns)}")

        # Créer la session de base de données
        db: Session = SessionLocal()

        try:
            # Compter les contrôles existants
            existing_count = db.query(SCFControl).count()
            logger.info(f"📦 Contrôles SCF existants dans la DB: {existing_count}")

            if existing_count > 0:
                response = input("⚠️ Des contrôles existent déjà. Voulez-vous les remplacer ? (y/N): ")
                if response.lower() != 'y':
                    logger.info("❌ Import annulé")
                    return

                # Supprimer les contrôles existants
                db.query(SCFControl).delete()
                db.commit()
                logger.info("🗑️ Contrôles existants supprimés")

            # Mapper les colonnes (adapter selon la structure réelle)
            # Cette logique doit être ajustée selon le format exact du fichier SCF
            column_mapping = detect_columns(df.columns)

            if not column_mapping:
                logger.error("❌ Impossible de détecter les colonnes nécessaires")
                logger.info("Colonnes disponibles:")
                for col in df.columns:
                    logger.info(f"  - {col}")
                return

            logger.info(f"✅ Mapping des colonnes détecté: {column_mapping}")

            # Importer les contrôles
            imported = 0
            skipped = 0

            for idx, row in df.iterrows():
                try:
                    control_id = str(row.get(column_mapping.get('control_id', ''), '')).strip()
                    control_title = str(row.get(column_mapping.get('control_title', ''), '')).strip()

                    # Vérifier que les champs obligatoires sont présents
                    if not control_id or control_id == 'nan' or not control_title or control_title == 'nan':
                        skipped += 1
                        continue

                    # Créer l'objet SCFControl
                    scf_control = SCFControl(
                        control_id=control_id,
                        control_title=control_title,
                        control_description=str(row.get(column_mapping.get('control_description', ''), '')) if pd.notna(row.get(column_mapping.get('control_description', ''))) else None,
                        domain=str(row.get(column_mapping.get('domain', ''), '')) if pd.notna(row.get(column_mapping.get('domain', ''))) else None,
                        category=str(row.get(column_mapping.get('category', ''), '')) if pd.notna(row.get(column_mapping.get('category', ''))) else None,
                        criticality=str(row.get(column_mapping.get('criticality', ''), '')) if pd.notna(row.get(column_mapping.get('criticality', ''))) else None,
                        iso27001_mapping=str(row.get(column_mapping.get('iso27001_mapping', ''), '')) if pd.notna(row.get(column_mapping.get('iso27001_mapping', ''))) else None,
                        iso27002_mapping=str(row.get(column_mapping.get('iso27002_mapping', ''), '')) if pd.notna(row.get(column_mapping.get('iso27002_mapping', ''))) else None,
                        cobit5_mapping=str(row.get(column_mapping.get('cobit5_mapping', ''), '')) if pd.notna(row.get(column_mapping.get('cobit5_mapping', ''))) else None,
                        nist_mapping=str(row.get(column_mapping.get('nist_mapping', ''), '')) if pd.notna(row.get(column_mapping.get('nist_mapping', ''))) else None,
                        version="2025.2"
                    )

                    db.add(scf_control)
                    imported += 1

                    # Commit par batch de 100
                    if imported % 100 == 0:
                        db.commit()
                        logger.info(f"💾 {imported} contrôles importés...")

                except Exception as e:
                    logger.error(f"❌ Erreur ligne {idx}: {e}")
                    skipped += 1
                    continue

            # Commit final
            db.commit()

            logger.info("=" * 60)
            logger.info(f"✅ Import terminé!")
            logger.info(f"   ✅ Importés: {imported}")
            logger.info(f"   ⏭️ Ignorés: {skipped}")
            logger.info(f"   📊 Total dans la DB: {db.query(SCFControl).count()}")
            logger.info("=" * 60)

        finally:
            db.close()

    except Exception as e:
        logger.error(f"❌ Erreur lors de l'import: {e}")
        import traceback
        traceback.print_exc()


def detect_columns(columns) -> dict:
    """
    Détecte automatiquement les colonnes pertinentes

    Args:
        columns: Liste des noms de colonnes

    Returns:
        Dictionnaire de mapping des colonnes
    """
    mapping = {}

    # Patterns pour détecter les colonnes
    patterns = {
        'control_id': ['control id', 'scf', 'id', 'control_id', 'contrôle'],
        'control_title': ['title', 'control title', 'name', 'control name', 'titre', 'nom'],
        'control_description': ['description', 'control description', 'desc', 'objective'],
        'domain': ['domain', 'domaine', 'category', 'catégorie'],
        'category': ['subcategory', 'sous-catégorie', 'type'],
        'criticality': ['criticality', 'criticité', 'level', 'niveau', 'priority'],
        'iso27001_mapping': ['iso27001', 'iso 27001', 'iso27001 mapping'],
        'iso27002_mapping': ['iso27002', 'iso 27002', 'iso27002 mapping'],
        'cobit5_mapping': ['cobit', 'cobit5', 'cobit 5', 'cobit mapping'],
        'nist_mapping': ['nist', 'nist mapping', 'nist csf']
    }

    for field, keywords in patterns.items():
        for col in columns:
            col_lower = str(col).lower()
            if any(keyword in col_lower for keyword in keywords):
                mapping[field] = col
                break

    return mapping


if __name__ == "__main__":
    # Créer les tables si elles n'existent pas
    logger.info("🔧 Création des tables...")
    Base.metadata.create_all(bind=engine)

    # Chemin vers le fichier SCF
    # Chercher le fichier dans le répertoire parent
    project_root = Path(__file__).parent.parent
    scf_files = list(project_root.glob("*scf*.xlsx"))

    if not scf_files:
        logger.error("❌ Aucun fichier SCF trouvé dans le répertoire du projet")
        logger.info(f"Recherche dans: {project_root}")
        sys.exit(1)

    scf_file = scf_files[0]
    logger.info(f"📂 Fichier SCF trouvé: {scf_file}")

    # Importer les contrôles
    import_scf_from_excel(str(scf_file))
