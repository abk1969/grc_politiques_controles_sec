#!/usr/bin/env python3
"""
Crée un cache minimal fonctionnel pour tester le système
Utilise seulement les 100 premiers contrôles pour un calcul rapide
"""

import sys
import pickle
import numpy as np
from loguru import logger
from sentence_transformers import SentenceTransformer
from scf_knowledge_service import SCFKnowledgeBase
import time

logger.remove()
logger.add(sys.stdout, format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

def main():
    logger.info("🚀 Création d'un cache minimal pour test rapide")
    logger.info("=" * 70)

    start = time.time()

    # Charger modèle
    logger.info("📥 Chargement du modèle...")
    model = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')
    logger.success(f"✅ Modèle chargé ({time.time()-start:.1f}s)")

    # Charger base SCF
    logger.info("📚 Chargement base SCF...")
    scf_kb = SCFKnowledgeBase()
    logger.success(f"✅ {len(scf_kb.controls)} contrôles chargés")

    # CALCULER EMBEDDINGS POUR TOUS LES CONTRÔLES
    logger.info(f"🧮 Calcul embeddings pour TOUS les {len(scf_kb.controls)} contrôles...")
    logger.info("   Ceci va prendre du temps, patience...")

    control_texts = []
    for ctrl in scf_kb.controls:
        combined = f"{ctrl['scf_id']} {ctrl['scf_control']} {ctrl['description']} {ctrl['control_question']}"
        control_texts.append(combined)

    # Calculer avec barre de progression
    embeddings = model.encode(control_texts, show_progress_bar=True, batch_size=16)

    logger.success(f"✅ Embeddings calculés ({time.time()-start:.1f}s total)")

    # Sauvegarder
    logger.info("💾 Sauvegarde du cache...")
    model_name = 'paraphrase-multilingual-mpnet-base-v2'
    import hashlib
    controls_hash = hashlib.md5(
        ''.join([ctrl['scf_id'] for ctrl in scf_kb.controls]).encode()
    ).hexdigest()

    cache_key = f"scf_embeddings_{model_name.replace('/', '_')}_{controls_hash}"
    cache_path = f"/app/cache/{cache_key}.pkl"

    cache_data = {
        'embeddings': embeddings,
        'model_name': model_name,
        'num_controls': len(scf_kb.controls),
        'created_at': str(np.datetime64('now'))
    }

    with open(cache_path, 'wb') as f:
        pickle.dump(cache_data, f)

    import os
    size_mb = os.path.getsize(cache_path) / (1024 * 1024)

    logger.success(f"✅ Cache sauvegardé: {cache_key}.pkl ({size_mb:.1f} MB)")
    logger.success(f"🎉 TERMINÉ en {time.time()-start:.1f}s!")
    logger.info("=" * 70)

if __name__ == "__main__":
    main()
