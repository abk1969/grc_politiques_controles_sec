"""
Script de migration: Convertir les caches pickle vers NumPy sécurisé
Exécuter une seule fois après le déploiement de la nouvelle version
"""

import os
import pickle
import numpy as np
from pathlib import Path
from loguru import logger


def migrate_cache_files(cache_dir: Path):
    """
    Migre tous les fichiers .pkl vers le format NumPy .npz sécurisé

    Args:
        cache_dir: Répertoire contenant les caches
    """
    logger.info(f"🔄 Début de la migration des caches dans {cache_dir}")

    pkl_files = list(cache_dir.glob("*.pkl"))

    if not pkl_files:
        logger.info("✅ Aucun fichier pickle trouvé, migration non nécessaire")
        return

    logger.info(f"📦 {len(pkl_files)} fichier(s) pickle trouvé(s)")

    migrated = 0
    failed = 0

    for pkl_file in pkl_files:
        try:
            logger.info(f"⏳ Migration de {pkl_file.name}...")

            # Charger le fichier pickle
            with open(pkl_file, 'rb') as f:
                cache_data = pickle.load(f)

            # Créer le chemin NPZ
            npz_file = pkl_file.with_suffix('.npz')

            # Convertir selon le format
            if 'embeddings' in cache_data:
                # Format cache embeddings
                np.savez_compressed(
                    npz_file,
                    embeddings=cache_data['embeddings'],
                    model_name=np.array([cache_data.get('model_name', 'unknown')], dtype=object),
                    num_controls=np.array([cache_data.get('num_controls', 0)], dtype=np.int32),
                    created_at=np.array([cache_data.get('created_at', 'unknown')], dtype=object)
                )

                # Si control_ids existe aussi
                if 'control_ids' in cache_data:
                    np.savez_compressed(
                        npz_file,
                        embeddings=cache_data['embeddings'],
                        control_ids=np.array(cache_data['control_ids'], dtype=object),
                        model_name=np.array([cache_data.get('model_name', 'unknown')], dtype=object)
                    )

                logger.info(f"✅ {pkl_file.name} → {npz_file.name}")

                # Supprimer l'ancien fichier pickle
                os.remove(pkl_file)
                logger.info(f"🗑️  Ancien fichier supprimé: {pkl_file.name}")

                migrated += 1
            else:
                logger.warning(f"⚠️  Format inconnu pour {pkl_file.name}, ignoré")

        except Exception as e:
            logger.error(f"❌ Échec migration {pkl_file.name}: {e}")
            failed += 1

    logger.info(f"\n📊 Résumé de la migration:")
    logger.info(f"  ✅ Migrés: {migrated}")
    logger.info(f"  ❌ Échecs: {failed}")
    logger.info(f"  📦 Total: {len(pkl_files)}")


if __name__ == "__main__":
    # Déterminer le répertoire de cache
    if os.path.exists('/app/cache'):
        # Environnement Docker
        cache_dir = Path('/app/cache')
    else:
        # Environnement local
        cache_dir = Path(__file__).parent / 'cache'

    logger.info("🚀 Migration des caches Pickle → NumPy")
    logger.info(f"📁 Répertoire: {cache_dir}")

    if not cache_dir.exists():
        logger.info("✅ Pas de répertoire cache, migration non nécessaire")
    else:
        migrate_cache_files(cache_dir)

    logger.info("🎉 Migration terminée!")
