"""
GRC Compliance Mapping - Backend API avec ML/NLP
FastAPI + PostgreSQL + Sentence-Transformers
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
from loguru import logger
import os

from database import get_db, engine, Base
from models import Requirement, SCFControl, ComplianceMapping, ImportSession
from ml_service import MLMappingService
from schemas import (
    RequirementCreate,
    RequirementResponse,
    MappingCreate,
    MappingResponse,
    BulkImportResponse,
    SimilaritySearchRequest,
    SimilaritySearchResponse
)

# Créer les tables
Base.metadata.create_all(bind=engine)

# Initialiser FastAPI
app = FastAPI(
    title="GRC Compliance Mapping API",
    description="API pour le mapping intelligent de conformité avec ML/NLP",
    version="1.0.0"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",  # Frontend Docker
        "http://localhost:3002",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialiser le service ML
ml_service = MLMappingService()

# ============================================
# Health Check
# ============================================

@app.get("/")
async def root():
    """Point d'entrée de l'API"""
    return {
        "message": "GRC Compliance Mapping API",
        "version": "1.0.0",
        "status": "running",
        "ml_model": "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
    }

@app.get("/health")
async def health_check():
    """Vérification de santé de l'API"""
    return {
        "status": "healthy",
        "database": "connected",
        "ml_service": "ready"
    }

# ============================================
# Import Excel
# ============================================

@app.post("/api/import/excel", response_model=BulkImportResponse)
async def import_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Importer un fichier Excel (sans analyse IA)
    Les données sont directement insérées dans PostgreSQL
    Crée automatiquement une ImportSession pour tracer l'import
    """
    try:
        logger.info(f"Début de l'import du fichier: {file.filename}")

        # Lire le fichier Excel
        contents = await file.read()

        # Détecter toutes les feuilles
        excel_file = pd.ExcelFile(contents)
        logger.info(f"Feuilles détectées: {excel_file.sheet_names}")

        # Créer une session d'import
        import_session = ImportSession(
            filename=file.filename,
            source_sheet=", ".join(excel_file.sheet_names),
            status='processing',
            analysis_source='pending',
            total_requirements=0
        )
        db.add(import_session)
        db.flush()  # Pour obtenir l'ID

        logger.info(f"Session d'import créée: ID={import_session.id}")

        total_imported = 0
        imported_sheets = []
        
        # Importer chaque feuille
        for sheet_name in excel_file.sheet_names:
            df = pd.read_excel(contents, sheet_name=sheet_name)
            
            logger.info(f"Traitement de la feuille '{sheet_name}': {len(df)} lignes")
            
            # Détecter les colonnes importantes
            columns = df.columns.tolist()
            
            # Mapper les colonnes (flexible)
            id_col = next((col for col in columns if any(x in col.lower() for x in ['id', 'n°', 'numero'])), None)
            req_col = next((col for col in columns if any(x in col.lower() for x in ['exigence', 'requirement', 'control', 'titre'])), None)
            verif_col = next((col for col in columns if any(x in col.lower() for x in ['verification', 'point', 'description'])), None)
            
            if not req_col:
                logger.warning(f"Aucune colonne d'exigence trouvée dans '{sheet_name}', skip")
                continue
            
            # Insérer les données
            for idx, row in df.iterrows():
                try:
                    requirement = Requirement(
                        original_id=str(row[id_col]) if id_col and pd.notna(row[id_col]) else f"{sheet_name}_{idx}",
                        requirement=str(row[req_col]) if pd.notna(row[req_col]) else "",
                        verification_point=str(row[verif_col]) if verif_col and pd.notna(row[verif_col]) else None,
                        source_file=file.filename,
                        source_sheet=sheet_name,
                        analysis_status='pending',
                        import_session_id=import_session.id  # Lier à la session d'import
                    )

                    db.add(requirement)
                    total_imported += 1
                    
                except Exception as e:
                    logger.error(f"Erreur ligne {idx}: {e}")
                    continue
            
            db.commit()
            imported_sheets.append({
                "sheet_name": sheet_name,
                "rows_imported": len(df)
            })

        # Mettre à jour la session d'import
        import_session.total_requirements = total_imported
        import_session.status = 'completed' if total_imported > 0 else 'failed'
        db.commit()

        logger.info(f"Import terminé: {total_imported} lignes importées (Session ID: {import_session.id})")

        return BulkImportResponse(
            success=True,
            total_imported=total_imported,
            sheets=imported_sheets,
            message=f"Import réussi: {total_imported} exigences importées",
            import_session_id=import_session.id  # Retourner l'ID de la session
        )
        
    except Exception as e:
        logger.error(f"Erreur lors de l'import: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# CRUD Requirements
# ============================================

@app.get("/api/requirements", response_model=List[RequirementResponse])
async def get_requirements(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Récupérer la liste des exigences"""
    query = db.query(Requirement)
    
    if status:
        query = query.filter(Requirement.analysis_status == status)
    
    requirements = query.offset(skip).limit(limit).all()
    return requirements

@app.get("/api/requirements/{requirement_id}", response_model=RequirementResponse)
async def get_requirement(requirement_id: int, db: Session = Depends(get_db)):
    """Récupérer une exigence spécifique"""
    requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    
    if not requirement:
        raise HTTPException(status_code=404, detail="Exigence non trouvée")
    
    return requirement

@app.post("/api/requirements", response_model=RequirementResponse)
async def create_requirement(
    requirement: RequirementCreate,
    db: Session = Depends(get_db)
):
    """Créer une nouvelle exigence manuellement"""
    db_requirement = Requirement(**requirement.dict())
    db.add(db_requirement)
    db.commit()
    db.refresh(db_requirement)
    return db_requirement

@app.put("/api/requirements/{requirement_id}", response_model=RequirementResponse)
async def update_requirement(
    requirement_id: int,
    requirement: RequirementCreate,
    db: Session = Depends(get_db)
):
    """Mettre à jour une exigence"""
    db_requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    
    if not db_requirement:
        raise HTTPException(status_code=404, detail="Exigence non trouvée")
    
    for key, value in requirement.dict().items():
        setattr(db_requirement, key, value)
    
    db.commit()
    db.refresh(db_requirement)
    return db_requirement

@app.delete("/api/requirements/{requirement_id}")
async def delete_requirement(requirement_id: int, db: Session = Depends(get_db)):
    """Supprimer une exigence"""
    db_requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    
    if not db_requirement:
        raise HTTPException(status_code=404, detail="Exigence non trouvée")
    
    db.delete(db_requirement)
    db.commit()
    return {"message": "Exigence supprimée"}

# ============================================
# ML-Powered Mapping
# ============================================

@app.post("/api/analyze/similarity", response_model=List[SimilaritySearchResponse])
async def find_similar_controls(
    request: SimilaritySearchRequest,
    db: Session = Depends(get_db)
):
    """
    Trouver les contrôles SCF les plus similaires à une exigence
    Utilise Sentence-Transformers pour la similarité sémantique
    """
    try:
        # Récupérer tous les contrôles SCF
        scf_controls = db.query(SCFControl).all()
        
        if not scf_controls:
            raise HTTPException(status_code=404, detail="Aucun contrôle SCF trouvé dans la base")
        
        # Utiliser le service ML pour trouver les similarités
        results = ml_service.find_similar_controls(
            requirement_text=request.requirement_text,
            controls=scf_controls,
            top_k=request.top_k or 5
        )
        
        return results
        
    except Exception as e:
        logger.error(f"Erreur lors de la recherche de similarité: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze/batch")
async def analyze_batch(
    requirement_ids: List[int],
    db: Session = Depends(get_db)
):
    """
    Analyser un lot d'exigences avec ML
    Génère automatiquement les mappings suggérés
    """
    try:
        results = []
        
        for req_id in requirement_ids:
            requirement = db.query(Requirement).filter(Requirement.id == req_id).first()
            
            if not requirement:
                continue
            
            # Trouver les contrôles similaires
            scf_controls = db.query(SCFControl).all()
            similar = ml_service.find_similar_controls(
                requirement_text=requirement.requirement,
                controls=scf_controls,
                top_k=3
            )
            
            if similar:
                # Créer un mapping avec le meilleur match
                best_match = similar[0]
                
                mapping = ComplianceMapping(
                    requirement_id=req_id,
                    scf_mapping=f"{best_match.control_id} - {best_match.control_title}",
                    confidence_score=best_match.similarity_score,
                    mapping_source='ml',
                    analysis=f"Mapping automatique ML (similarité: {best_match.similarity_score:.2%})"
                )
                
                db.add(mapping)
                requirement.analysis_status = 'analyzed'
                
                results.append({
                    "requirement_id": req_id,
                    "best_match": best_match.dict(),
                    "status": "success"
                })
        
        db.commit()
        
        return {
            "success": True,
            "analyzed_count": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de l'analyse batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# Save Claude Results
# ============================================

@app.post("/api/save-claude-results")
async def save_claude_results(
    data: dict,
    db: Session = Depends(get_db)
):
    """
    Sauvegarder les résultats Claude depuis le navigateur
    Crée ou utilise une session d'import existante
    """
    try:
        results = data.get('results', [])
        import_session_id = data.get('import_session_id')
        filename = data.get('filename', 'claude_import')

        # Créer ou récupérer la session d'import
        if import_session_id:
            import_session = db.query(ImportSession).filter(ImportSession.id == import_session_id).first()
            if not import_session:
                raise HTTPException(status_code=404, detail=f"Session {import_session_id} introuvable")
        else:
            # Créer une nouvelle session
            import_session = ImportSession(
                filename=filename,
                source_sheet='Claude Results',
                status='processing',
                analysis_source='claude',
                total_requirements=len(results)
            )
            db.add(import_session)
            db.flush()

        saved_count = 0

        for result in results:
            # Créer l'exigence
            requirement = Requirement(
                original_id=result.get('id', ''),
                requirement=result.get('requirement', ''),
                verification_point=result.get('verificationPoint'),
                source_file=filename,
                source_sheet='Claude Results',
                analysis_status='analyzed',
                import_session_id=import_session.id
            )

            db.add(requirement)
            db.flush()  # Pour obtenir l'ID

            # Créer le mapping
            mapping = ComplianceMapping(
                requirement_id=requirement.id,
                scf_mapping=result.get('scfMapping'),
                iso27001_mapping=result.get('iso27001Mapping'),
                iso27002_mapping=result.get('iso27002Mapping'),
                cobit5_mapping=result.get('cobit5Mapping'),
                confidence_score=0.95,  # Claude = haute confiance
                mapping_source='claude',
                analysis=result.get('analysis', ''),
                import_session_id=import_session.id
            )

            db.add(mapping)
            saved_count += 1

        # Mettre à jour la session
        import_session.status = 'completed'
        import_session.total_requirements = saved_count
        db.commit()

        logger.info(f"OK - {saved_count} resultats Claude sauvegardes (Session ID: {import_session.id})")

        return {
            "success": True,
            "saved_count": saved_count,
            "import_session_id": import_session.id,
            "message": f"{saved_count} résultats sauvegardés dans PostgreSQL"
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la sauvegarde: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# Import Sessions Management
# ============================================

@app.get("/api/import-sessions")
async def get_import_sessions(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    analysis_source: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Récupérer la liste des imports passés avec filtres
    """
    try:
        query = db.query(ImportSession)

        # Filtres
        if status:
            query = query.filter(ImportSession.status == status)
        if analysis_source:
            query = query.filter(ImportSession.analysis_source == analysis_source)

        # Tri par date décroissante (plus récent en premier)
        query = query.order_by(ImportSession.import_date.desc())

        # Pagination
        total = query.count()
        sessions = query.offset(offset).limit(limit).all()

        return {
            "success": True,
            "total": total,
            "sessions": [
                {
                    "id": s.id,
                    "filename": s.filename,
                    "source_sheet": s.source_sheet,
                    "import_date": s.import_date.isoformat() if s.import_date else None,
                    "total_requirements": s.total_requirements,
                    "analysis_source": s.analysis_source,
                    "status": s.status,
                    "tags": s.tags,
                    "metadata": s.session_metadata
                }
                for s in sessions
            ]
        }

    except Exception as e:
        logger.error(f"Erreur lors de la récupération des sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/import-sessions/{session_id}/results")
async def get_import_session_results(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Charger les résultats d'un import spécifique
    """
    try:
        # Vérifier que la session existe
        session = db.query(ImportSession).filter(ImportSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} introuvable")

        # Récupérer toutes les exigences de cette session avec leurs mappings
        requirements = db.query(Requirement).filter(
            Requirement.import_session_id == session_id
        ).all()

        # Formater les résultats
        results = []
        for req in requirements:
            # Récupérer le mapping actif
            mapping = db.query(ComplianceMapping).filter(
                ComplianceMapping.requirement_id == req.id,
                ComplianceMapping.is_active == True,
                ComplianceMapping.import_session_id == session_id
            ).first()

            result = {
                "id": req.original_id or str(req.id),
                "requirement": req.requirement,
                "verificationPoint": req.verification_point,
                "scfMapping": mapping.scf_mapping if mapping else None,
                "iso27001Mapping": mapping.iso27001_mapping if mapping else None,
                "iso27002Mapping": mapping.iso27002_mapping if mapping else None,
                "cobit5Mapping": mapping.cobit5_mapping if mapping else None,
                "analysis": mapping.analysis if mapping else None,
                "confidenceScore": float(mapping.confidence_score) if mapping and mapping.confidence_score else None,
                "mappingSource": mapping.mapping_source if mapping else None
            }
            results.append(result)

        return {
            "success": True,
            "session": {
                "id": session.id,
                "filename": session.filename,
                "source_sheet": session.source_sheet,
                "import_date": session.import_date.isoformat() if session.import_date else None,
                "total_requirements": session.total_requirements,
                "analysis_source": session.analysis_source,
                "status": session.status,
                "tags": session.tags
            },
            "results": results
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors du chargement des résultats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Statistics
# ============================================

@app.get("/api/stats")
async def get_statistics(db: Session = Depends(get_db)):
    """Récupérer les statistiques globales"""
    total_requirements = db.query(Requirement).count()
    analyzed = db.query(Requirement).filter(Requirement.analysis_status == 'analyzed').count()
    pending = db.query(Requirement).filter(Requirement.analysis_status == 'pending').count()
    manual = db.query(Requirement).filter(Requirement.analysis_status == 'manual').count()
    
    total_mappings = db.query(ComplianceMapping).filter(ComplianceMapping.is_active == True).count()
    
    return {
        "total_requirements": total_requirements,
        "analyzed": analyzed,
        "pending": pending,
        "manual": manual,
        "total_mappings": total_mappings,
        "completion_rate": (analyzed + manual) / total_requirements * 100 if total_requirements > 0 else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

