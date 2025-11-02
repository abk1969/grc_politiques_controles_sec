"""
Configuration centralisée des caches
Garantit que tous les services utilisent les mêmes répertoires et conventions de nommage
"""

import os
from pathlib import Path


class CacheConfig:
    """
    Configuration centralisée pour tous les caches de l'application
    """

    # Détecter si on est dans Docker ou en local
    IS_DOCKER = os.path.exists('/app')

    # Répertoire de cache principal
    if IS_DOCKER:
        CACHE_DIR = Path('/app/cache')
    else:
        CACHE_DIR = Path(__file__).parent / 'cache'

    # S'assurer que le répertoire existe
    CACHE_DIR.mkdir(exist_ok=True, parents=True)

    # Fichiers de cache spécifiques (format NumPy sécurisé .npz)
    SCF_EMBEDDINGS_CACHE = CACHE_DIR / 'scf_embeddings.npz'

    @classmethod
    def get_cache_dir(cls) -> Path:
        """Retourne le répertoire de cache principal"""
        return cls.CACHE_DIR

    @classmethod
    def get_scf_embeddings_cache(cls) -> Path:
        """Retourne le chemin du cache des embeddings SCF"""
        return cls.SCF_EMBEDDINGS_CACHE

    @classmethod
    def is_docker_environment(cls) -> bool:
        """Vérifie si on est dans un environnement Docker"""
        return cls.IS_DOCKER


# Créer le répertoire au chargement du module
CacheConfig.CACHE_DIR.mkdir(exist_ok=True, parents=True)
