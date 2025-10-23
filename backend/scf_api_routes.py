"""
Routes API pour la recherche dans la base de connaissances SCF
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from loguru import logger

from scf_knowledge_service import SCFKnowledgeBase

router = APIRouter(prefix="/api/scf", tags=["SCF Knowledge Base"])

# Import de la fonction lazy loader depuis main.py (sera disponible au runtime)
def get_scf_kb():
    """Wrapper pour récupérer la base SCF avec lazy loading"""
    from main import get_or_init_scf_kb
    return get_or_init_scf_kb()

# ============================================================================
# Modèles Pydantic
# ============================================================================

class SCFSearchRequest(BaseModel):
    """Requête de recherche dans la base SCF"""
    requirement_text: str
    top_k: int = 5
    min_similarity: float = 0.5

class SCFControlResponse(BaseModel):
    """Réponse avec un contrôle SCF"""
    scf_id: str
    scf_control: str
    scf_domain: str
    description: str
    cobit_2019: str
    control_question: str
    possible_solutions: str
    similarity_score: Optional[float] = None

class SCFValidationRequest(BaseModel):
    """Requête de validation d'une référence SCF"""
    scf_reference: str

class SCFValidationResponse(BaseModel):
    """Réponse de validation"""
    is_valid: bool
    scf_id: Optional[str] = None
    scf_control: Optional[str] = None
    message: str

class ThreatRiskRequest(BaseModel):
    """Requête pour trouver menaces et risques"""
    requirement_text: str

class ThreatRiskResponse(BaseModel):
    """Réponse avec menace et risque"""
    threat: Optional[str] = None
    risk: Optional[str] = None


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/search", response_model=List[SCFControlResponse])
async def search_scf_controls(request: SCFSearchRequest):
    """
    Recherche sémantique dans la base SCF
    Retourne les contrôles les plus pertinents pour une exigence donnée
    """
    try:
        scf_kb_instance = get_scf_kb()
        if not scf_kb_instance:
            raise HTTPException(status_code=503, detail="Base SCF non initialisée")

        # Recherche sémantique
        results = scf_kb_instance.find_best_scf_control(
            requirement_text=request.requirement_text,
            top_k=request.top_k,
            min_similarity=request.min_similarity
        )

        logger.info(f"🔍 Recherche SCF: trouvé {len(results)} résultats pour '{request.requirement_text[:60]}...'")

        return [SCFControlResponse(**r) for r in results]

    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Erreur recherche SCF: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la recherche: {str(e)}")


@router.get("/control/{scf_id}", response_model=SCFControlResponse)
async def get_scf_control_by_id(scf_id: str):
    """
    Récupère un contrôle SCF par son ID exact
    Exemple: GOV-01, IAC-02, etc.
    """
    try:
        scf_kb_instance = get_scf_kb()
        if not scf_kb_instance:
            raise HTTPException(status_code=503, detail="Base SCF non initialisée")

        control = scf_kb_instance.get_control_by_id(scf_id)

        if not control:
            raise HTTPException(
                status_code=404,
                detail=f"Contrôle SCF '{scf_id}' introuvable dans la base de connaissances"
            )

        return SCFControlResponse(**control)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur récupération contrôle {scf_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate", response_model=SCFValidationResponse)
async def validate_scf_reference(request: SCFValidationRequest):
    """
    Valide qu'une référence SCF existe réellement dans la base
    Exemple: "SCF-IAC-02 - Privileged Access Management"
    """
    try:
        scf_kb_instance = get_scf_kb()
        if not scf_kb_instance:
            raise HTTPException(status_code=503, detail="Base SCF non initialisée")

        is_valid, control_data = scf_kb_instance.validate_scf_reference(request.scf_reference)

        if is_valid and control_data:
            return SCFValidationResponse(
                is_valid=True,
                scf_id=control_data['scf_id'],
                scf_control=control_data['scf_control'],
                message=f"✅ Référence valide: {control_data['scf_id']} - {control_data['scf_control']}"
            )
        else:
            return SCFValidationResponse(
                is_valid=False,
                message=f"❌ Référence '{request.scf_reference}' introuvable dans la base SCF"
            )

    except Exception as e:
        logger.error(f"❌ Erreur validation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/threat-risk", response_model=ThreatRiskResponse)
async def find_threat_and_risk(request: ThreatRiskRequest):
    """
    Trouve la menace et le risque les plus pertinents depuis les catalogues SCF
    """
    try:
        scf_kb_instance = get_scf_kb()
        if not scf_kb_instance:
            raise HTTPException(status_code=503, detail="Base SCF non initialisée")

        threat = scf_kb_instance.find_relevant_threat(request.requirement_text)
        risk = scf_kb_instance.find_relevant_risk(request.requirement_text)

        return ThreatRiskResponse(
            threat=threat,
            risk=risk
        )

    except Exception as e:
        logger.error(f"❌ Erreur recherche menace/risque: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_scf_stats():
    """Statistiques sur la base de connaissances SCF"""
    try:
        scf_kb_instance = get_scf_kb()
        if not scf_kb_instance:
            return {
                "total_controls": 0,
                "total_threats": 0,
                "total_risks": 0,
                "model_initialized": False,
                "embeddings_ready": False,
                "status": "not_initialized"
            }

        return {
            "total_controls": len(scf_kb_instance.controls),
            "total_threats": len(scf_kb_instance.threats),
            "total_risks": len(scf_kb_instance.risks),
            "model_initialized": scf_kb_instance.model is not None,
            "embeddings_ready": scf_kb_instance.control_embeddings is not None,
            "status": "ready"
        }

    except Exception as e:
        logger.error(f"❌ Erreur stats SCF: {e}")
        raise HTTPException(status_code=500, detail=str(e))
