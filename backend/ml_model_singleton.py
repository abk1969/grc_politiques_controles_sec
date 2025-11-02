"""
Singleton pour le modèle ML partagé
Évite de charger le modèle plusieurs fois en mémoire (400 MB)
Thread-safe avec lock
"""

from sentence_transformers import SentenceTransformer
from loguru import logger
import threading
from typing import Optional


class MLModelSingleton:
    """
    Singleton thread-safe pour le modèle Sentence-Transformers
    """
    _instance: Optional['MLModelSingleton'] = None
    _lock = threading.Lock()
    _model: Optional[SentenceTransformer] = None
    _model_name = 'paraphrase-multilingual-mpnet-base-v2'

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                # Double-check locking pattern
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def get_model(self) -> SentenceTransformer:
        """
        Récupère le modèle ML (chargement lazy avec lock)

        Returns:
            Instance du modèle Sentence-Transformers
        """
        if self._model is None:
            with self._lock:
                # Double-check locking
                if self._model is None:
                    logger.info(f"🤖 Chargement du modèle ML partagé: {self._model_name}")
                    logger.info("   (Ce chargement ne se produira qu'une seule fois)")
                    try:
                        self._model = SentenceTransformer(self._model_name)
                        logger.info(f"✅ Modèle ML chargé avec succès ({self._model_name})")
                        logger.info(f"   Dimensions: {self._model.get_sentence_embedding_dimension()}")
                    except Exception as e:
                        logger.error(f"❌ Erreur lors du chargement du modèle: {e}")
                        raise
        return self._model

    @property
    def model_name(self) -> str:
        """Retourne le nom du modèle"""
        return self._model_name

    @property
    def is_loaded(self) -> bool:
        """Vérifie si le modèle est déjà chargé"""
        return self._model is not None


# Instance globale du singleton
_ml_model_singleton = MLModelSingleton()


def get_shared_ml_model() -> SentenceTransformer:
    """
    Fonction helper pour obtenir le modèle ML partagé

    Returns:
        Instance du modèle Sentence-Transformers (singleton)
    """
    return _ml_model_singleton.get_model()


def get_model_name() -> str:
    """Retourne le nom du modèle utilisé"""
    return _ml_model_singleton.model_name


def is_model_loaded() -> bool:
    """Vérifie si le modèle est déjà chargé en mémoire"""
    return _ml_model_singleton.is_loaded
