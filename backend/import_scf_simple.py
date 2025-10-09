"""
Script simplifié d'import des contrôles SCF (sans emojis)
"""

import pandas as pd
from sqlalchemy.orm import Session
from database import SessionLocal
from models import SCFControl
import sys
from pathlib import Path

def import_scf():
    # Chemin vers le fichier
    project_root = Path(__file__).parent.parent
    scf_file = project_root / "20250910_secure-controls-framework-scf-2025-2_vf.xlsx"

    if not scf_file.exists():
        print(f"Erreur: Fichier non trouve: {scf_file}")
        return

    print(f"Lecture du fichier: {scf_file}")

    # Lire le fichier Excel
    df = pd.read_excel(scf_file, sheet_name="SCF 2025.2")

    print(f"Lignes lues: {len(df)}")
    print(f"Colonnes disponibles: {list(df.columns[:10])}")  # Afficher les 10 premières colonnes

    # Mapping manuel des colonnes
    mapping = {
        'control_id': 'SCF #',
        'control_title': 'SCF Control',
        'control_description': 'Secure Controls Framework (SCF)\nControl Description',
        'domain': 'SCF Domain',
        'cobit5_mapping': 'COBIT\n2019',
        'iso27001_mapping': 'ISO\n27001\nv2022',
        'iso27002_mapping': 'ISO\n27002\nv2022',
    }

    # Vérifier que les colonnes existent
    missing = [k for k, v in mapping.items() if v not in df.columns]
    if missing:
        print(f"Erreur: Colonnes manquantes: {missing}")
        return

    print(f"Mapping: OK")

    # Connexion DB
    db: Session = SessionLocal()

    try:
        # Supprimer les contrôles existants
        db.query(SCFControl).delete()
        db.commit()
        print("Controles existants supprimes")

        imported = 0
        skipped = 0

        for idx, row in df.iterrows():
            try:
                control_id = str(row.get(mapping['control_id'], '')).strip()
                control_title = str(row.get(mapping['control_title'], '')).strip()

                # Ignorer les lignes vides
                if not control_id or control_id == 'nan' or not control_title or control_title == 'nan':
                    skipped += 1
                    continue

                # Créer le contrôle
                scf_control = SCFControl(
                    control_id=control_id,
                    control_title=control_title,
                    control_description=str(row.get(mapping['control_description'], '')) if pd.notna(row.get(mapping['control_description'])) else None,
                    domain=str(row.get(mapping['domain'], '')) if pd.notna(row.get(mapping['domain'])) else None,
                    cobit5_mapping=str(row.get(mapping['cobit5_mapping'], '')) if pd.notna(row.get(mapping['cobit5_mapping'])) else None,
                    iso27001_mapping=str(row.get(mapping['iso27001_mapping'], '')) if pd.notna(row.get(mapping['iso27001_mapping'])) else None,
                    iso27002_mapping=str(row.get(mapping['iso27002_mapping'], '')) if pd.notna(row.get(mapping['iso27002_mapping'])) else None,
                    version="2025.2"
                )

                db.add(scf_control)
                imported += 1

                # Commit par batch de 100
                if imported % 100 == 0:
                    db.commit()
                    print(f"Progress: {imported} controles importes...")

            except Exception as e:
                print(f"Erreur ligne {idx}: {e}")
                skipped += 1
                continue

        # Commit final
        db.commit()

        total = db.query(SCFControl).count()

        print("=" * 60)
        print(f"Import termine!")
        print(f"  Importes: {imported}")
        print(f"  Ignores: {skipped}")
        print(f"  Total dans la DB: {total}")
        print("=" * 60)

    finally:
        db.close()

if __name__ == "__main__":
    import_scf()
