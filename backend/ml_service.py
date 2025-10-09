"""
Service ML pour l'analyse sémantique et le matching de conformité
Utilise Sentence-Transformers pour la similarité sémantique
"""

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Tuple
import numpy as np
from loguru import logger
import os
import pickle
from pathlib import Path

from models import SCFControl
from schemas import SimilaritySearchResponse


class MLMappingService:
    """
    Service ML pour le mapping automatique des exigences aux contrôles
    """

    def __init__(self):
        """
        Initialise le modèle Sentence-Transformers
        """
        # Modèle multilingue performant (français + anglais)
        self.model_name = 'paraphrase-multilingual-mpnet-base-v2'

        logger.info(f"🤖 Chargement du modèle ML: {self.model_name}")

        try:
            self.model = SentenceTransformer(self.model_name)
            logger.info("✅ Modèle ML chargé avec succès")
        except Exception as e:
            logger.error(f"❌ Erreur lors du chargement du modèle: {e}")
            raise

        # Cache pour les embeddings des contrôles SCF
        self.cache_dir = Path(__file__).parent / "cache"
        self.cache_dir.mkdir(exist_ok=True, parents=True)
        self.embeddings_cache_file = self.cache_dir / "scf_embeddings.pkl"

        # Cache en mémoire
        self._scf_embeddings_cache: Dict[str, np.ndarray] = {}
        self._scf_controls_cache: List[SCFControl] = []


    def encode_text(self, text: str) -> np.ndarray:
        """
        Encode un texte en embedding vectoriel

        Args:
            text: Texte à encoder

        Returns:
            Vecteur numpy de dimension 768
        """
        try:
            embedding = self.model.encode(text, convert_to_numpy=True)
            return embedding
        except Exception as e:
            logger.error(f"Erreur lors de l'encodage: {e}")
            raise


    def encode_batch(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """
        Encode un lot de textes en embeddings

        Args:
            texts: Liste de textes à encoder
            batch_size: Taille des batchs pour l'encodage

        Returns:
            Matrice numpy (n_texts, 768)
        """
        try:
            embeddings = self.model.encode(
                texts,
                convert_to_numpy=True,
                batch_size=batch_size,
                show_progress_bar=True
            )
            return embeddings
        except Exception as e:
            logger.error(f"Erreur lors de l'encodage batch: {e}")
            raise


    def compute_similarity(
        self,
        requirement_embedding: np.ndarray,
        control_embeddings: np.ndarray
    ) -> np.ndarray:
        """
        Calcule la similarité cosinus entre une exigence et des contrôles

        Args:
            requirement_embedding: Embedding de l'exigence (1, 768)
            control_embeddings: Embeddings des contrôles (n, 768)

        Returns:
            Scores de similarité (n,)
        """
        try:
            # Reshape si nécessaire
            if requirement_embedding.ndim == 1:
                requirement_embedding = requirement_embedding.reshape(1, -1)

            # Calcul de la similarité cosinus
            similarities = cosine_similarity(requirement_embedding, control_embeddings)[0]

            return similarities
        except Exception as e:
            logger.error(f"Erreur lors du calcul de similarité: {e}")
            raise


    def cache_scf_embeddings(self, controls: List[SCFControl]) -> None:
        """
        Pré-calcule et met en cache les embeddings des contrôles SCF

        Args:
            controls: Liste des contrôles SCF
        """
        logger.info(f"📦 Mise en cache des embeddings pour {len(controls)} contrôles SCF...")

        try:
            # Préparer les textes à encoder
            texts = []
            for control in controls:
                # Combiner titre + description pour plus de contexte
                text = f"{control.control_title}"
                if control.control_description:
                    text += f" {control.control_description}"
                texts.append(text)

            # Encoder tous les textes
            embeddings = self.encode_batch(texts)

            # Sauvegarder dans le cache
            cache_data = {
                'embeddings': embeddings,
                'control_ids': [c.control_id for c in controls],
                'model_name': self.model_name
            }

            with open(self.embeddings_cache_file, 'wb') as f:
                pickle.dump(cache_data, f)

            # Mettre en cache en mémoire
            self._scf_embeddings_cache = {
                control.control_id: embeddings[i]
                for i, control in enumerate(controls)
            }
            self._scf_controls_cache = controls

            logger.info(f"✅ Embeddings mis en cache: {self.embeddings_cache_file}")

        except Exception as e:
            logger.error(f"❌ Erreur lors de la mise en cache: {e}")
            raise


    def load_scf_embeddings_cache(self) -> bool:
        """
        Charge les embeddings depuis le cache

        Returns:
            True si le cache a été chargé avec succès
        """
        if not self.embeddings_cache_file.exists():
            logger.warning("⚠️ Pas de cache d'embeddings trouvé")
            return False

        try:
            with open(self.embeddings_cache_file, 'rb') as f:
                cache_data = pickle.load(f)

            # Vérifier que c'est le bon modèle
            if cache_data.get('model_name') != self.model_name:
                logger.warning("⚠️ Cache créé avec un modèle différent, réinitialisation nécessaire")
                return False

            logger.info(f"✅ Cache d'embeddings chargé: {len(cache_data['control_ids'])} contrôles")
            return True

        except Exception as e:
            logger.error(f"❌ Erreur lors du chargement du cache: {e}")
            return False


    def find_similar_controls(
        self,
        requirement_text: str,
        controls: List[SCFControl],
        top_k: int = 5,
        min_similarity: float = 0.3
    ) -> List[SimilaritySearchResponse]:
        """
        Trouve les contrôles SCF les plus similaires à une exigence

        Args:
            requirement_text: Texte de l'exigence
            controls: Liste des contrôles SCF disponibles
            top_k: Nombre de résultats à retourner
            min_similarity: Seuil minimal de similarité

        Returns:
            Liste des contrôles similaires avec scores
        """
        try:
            logger.info(f"🔍 Recherche de similarité pour: {requirement_text[:100]}...")

            # Encoder l'exigence
            requirement_embedding = self.encode_text(requirement_text)

            # Si pas de cache, créer les embeddings
            if not self._scf_embeddings_cache:
                logger.info("📦 Création du cache d'embeddings...")
                self.cache_scf_embeddings(controls)

            # Créer la matrice des embeddings
            control_embeddings = np.array([
                self._scf_embeddings_cache[control.control_id]
                for control in controls
            ])

            # Calculer les similarités
            similarities = self.compute_similarity(requirement_embedding, control_embeddings)

            # Trouver les top K
            top_k_indices = np.argsort(similarities)[-top_k:][::-1]

            # Créer les résultats
            results = []
            for idx in top_k_indices:
                score = float(similarities[idx])

                # Filtrer par seuil minimal
                if score < min_similarity:
                    continue

                control = controls[idx]

                results.append(SimilaritySearchResponse(
                    control_id=control.control_id,
                    control_title=control.control_title,
                    control_description=control.control_description,
                    similarity_score=score,
                    domain=control.domain,
                    category=control.category
                ))

            logger.info(f"✅ Trouvé {len(results)} contrôles similaires (score > {min_similarity})")

            return results

        except Exception as e:
            logger.error(f"❌ Erreur lors de la recherche de similarité: {e}")
            raise


    def batch_analyze(
        self,
        requirements: List[Tuple[int, str]],
        controls: List[SCFControl],
        top_k: int = 3,
        confidence_threshold: float = 0.60
    ) -> List[Dict]:
        """
        Analyse un lot d'exigences et propose des mappings

        Args:
            requirements: Liste de tuples (id, texte)
            controls: Liste des contrôles SCF
            top_k: Nombre de suggestions par exigence
            confidence_threshold: Seuil pour mapping automatique

        Returns:
            Liste des résultats d'analyse
        """
        logger.info(f"📊 Analyse batch de {len(requirements)} exigences...")

        results = []

        for req_id, req_text in requirements:
            try:
                # Trouver les contrôles similaires
                similar_controls = self.find_similar_controls(
                    requirement_text=req_text,
                    controls=controls,
                    top_k=top_k
                )

                if not similar_controls:
                    results.append({
                        'requirement_id': req_id,
                        'status': 'no_match',
                        'message': 'Aucun contrôle similaire trouvé'
                    })
                    continue

                best_match = similar_controls[0]

                # Déterminer si on peut mapper automatiquement
                auto_map = best_match.similarity_score >= confidence_threshold

                results.append({
                    'requirement_id': req_id,
                    'status': 'success',
                    'best_match': {
                        'control_id': best_match.control_id,
                        'control_title': best_match.control_title,
                        'similarity_score': best_match.similarity_score,
                        'auto_mapped': auto_map
                    },
                    'alternatives': [
                        {
                            'control_id': ctrl.control_id,
                            'control_title': ctrl.control_title,
                            'similarity_score': ctrl.similarity_score
                        }
                        for ctrl in similar_controls[1:]
                    ]
                })

            except Exception as e:
                logger.error(f"Erreur pour requirement {req_id}: {e}")
                results.append({
                    'requirement_id': req_id,
                    'status': 'error',
                    'message': str(e)
                })

        logger.info(f"✅ Analyse batch terminée: {len(results)} résultats")

        return results


    def get_model_info(self) -> Dict:
        """
        Retourne les informations sur le modèle ML

        Returns:
            Dictionnaire avec les infos du modèle
        """
        return {
            'model_name': self.model_name,
            'embedding_dimension': self.model.get_sentence_embedding_dimension(),
            'max_sequence_length': self.model.max_seq_length,
            'cache_exists': self.embeddings_cache_file.exists(),
            'cached_controls': len(self._scf_embeddings_cache)
        }
