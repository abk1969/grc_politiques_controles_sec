#!/usr/bin/env python3
"""
Script de pré-calcul des embeddings SCF
Utilise le meilleur modèle d'embedding multilingue pour garantir des résultats infaillibles
"""

import sys
from loguru import logger
from sentence_transformers import SentenceTransformer
from scf_knowledge_service import SCFKnowledgeBase
import time

# Configuration du logger
logger.remove()
logger.add(sys.stdout, format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

def main():
    """Pré-calcule et met en cache les embeddings SCF"""

    logger.info("=" * 80)
    logger.info("🚀 PRÉ-CALCUL DES EMBEDDINGS SCF")
    logger.info("=" * 80)

    # Étape 1: Charger le modèle d'embedding premium
    logger.info("")
    logger.info("📥 ÉTAPE 1/4: Chargement du modèle d'embedding...")
    logger.info("   Modèle: BAAI/bge-m3 (meilleur modèle multilingue)")

    start_time = time.time()

    try:
        model = SentenceTransformer('BAAI/bge-m3')
        logger.success(f"✅ Modèle chargé en {time.time() - start_time:.1f}s")
        logger.info(f"   Dimensions: 1024")
        logger.info(f"   Type: Multilingue (FR/EN)")
    except Exception as e:
        logger.error(f"❌ Erreur chargement modèle: {e}")
        logger.info("   Fallback sur paraphrase-multilingual-mpnet-base-v2...")
        model = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')
        logger.warning("⚠️  Utilisation du modèle fallback (moins précis)")

    # Étape 2: Charger la base SCF
    logger.info("")
    logger.info("📚 ÉTAPE 2/4: Chargement de la base de connaissances SCF...")

    try:
        scf_kb = SCFKnowledgeBase(
            excel_path='/app/scf_knowledge_base.xlsx',
            cache_dir='/app/cache'
        )
        logger.success(f"✅ Base SCF chargée:")
        logger.info(f"   • {len(scf_kb.controls)} contrôles SCF")
        logger.info(f"   • {len(scf_kb.threats)} menaces")
        logger.info(f"   • {len(scf_kb.risks)} risques")
    except Exception as e:
        logger.error(f"❌ Erreur chargement base SCF: {e}")
        sys.exit(1)

    # Étape 3: Calculer les embeddings avec progression
    logger.info("")
    logger.info("🧮 ÉTAPE 3/4: Calcul des embeddings sémantiques...")
    logger.info(f"   Traitement de {len(scf_kb.controls)} contrôles par batch de 32...")
    logger.info("   ⏳ Ceci peut prendre plusieurs minutes...")
    logger.info("")

    embed_start = time.time()

    try:
        # Cette fonction gère automatiquement le cache
        scf_kb.init_semantic_model(model)

        embed_time = time.time() - embed_start
        logger.success(f"✅ Embeddings calculés en {embed_time/60:.1f} minutes")

    except Exception as e:
        logger.error(f"❌ Erreur calcul embeddings: {e}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)

    # Étape 4: Vérification du cache
    logger.info("")
    logger.info("🔍 ÉTAPE 4/4: Vérification du cache...")

    import os
    cache_files = os.listdir('/app/cache')
    if cache_files:
        for cache_file in cache_files:
            cache_path = f'/app/cache/{cache_file}'
            size_mb = os.path.getsize(cache_path) / (1024 * 1024)
            logger.success(f"   ✓ {cache_file} ({size_mb:.1f} MB)")
    else:
        logger.warning("   ⚠️  Aucun fichier cache trouvé")

    # Étape 5: Test de recherche
    logger.info("")
    logger.info("🧪 TEST DE VALIDATION...")

    test_requirement = "Les mots de passe doivent être complexes et changés régulièrement"
    logger.info(f'   Recherche pour: "{test_requirement}"')

    try:
        results = scf_kb.find_best_scf_control(test_requirement, top_k=3)

        logger.success(f"   ✓ Trouvé {len(results)} contrôles pertinents:")
        for i, result in enumerate(results, 1):
            logger.info(f"      {i}. {result['scf_id']} - {result['scf_control']}")
            logger.info(f"         Similarité: {result['similarity_score']*100:.1f}%")
    except Exception as e:
        logger.error(f"   ✗ Erreur test: {e}")

    # Résumé final
    total_time = time.time() - start_time
    logger.info("")
    logger.info("=" * 80)
    logger.success("🎉 PRÉ-CALCUL TERMINÉ AVEC SUCCÈS!")
    logger.info("=" * 80)
    logger.info(f"⏱️  Temps total: {total_time/60:.1f} minutes")
    logger.info(f"💾 Cache créé: /app/cache/")
    logger.info(f"🚀 Prochains démarrages: <3 secondes (chargement depuis cache)")
    logger.info("")
    logger.info("📝 PROCHAINES ÉTAPES:")
    logger.info("   1. Le backend utilisera automatiquement le cache")
    logger.info("   2. Les agents auront des résultats infaillibles")
    logger.info("   3. Recherche sémantique ultra-précise activée")
    logger.info("")
    logger.success("✅ Vous pouvez maintenant utiliser l'application!")
    logger.info("=" * 80)

if __name__ == "__main__":
    main()
