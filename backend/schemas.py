"""
Schémas Pydantic pour la validation des données
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============================================
# Requirement Schemas
# ============================================

class RequirementBase(BaseModel):
    original_id: Optional[str] = None
    requirement: str
    verification_point: Optional[str] = None
    source_file: Optional[str] = None
    source_sheet: Optional[str] = None
    analysis_status: str = 'pending'


class RequirementCreate(RequirementBase):
    pass


class RequirementResponse(RequirementBase):
    id: int
    imported_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# SCF Control Schemas
# ============================================

class SCFControlBase(BaseModel):
    control_id: str
    control_title: str
    control_description: Optional[str] = None
    domain: Optional[str] = None
    category: Optional[str] = None
    criticality: Optional[str] = None
    iso27001_mapping: Optional[str] = None
    iso27002_mapping: Optional[str] = None
    cobit5_mapping: Optional[str] = None
    nist_mapping: Optional[str] = None
    version: Optional[str] = None


class SCFControlCreate(SCFControlBase):
    pass


class SCFControlResponse(SCFControlBase):
    id: int
    imported_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Compliance Mapping Schemas
# ============================================

class MappingBase(BaseModel):
    scf_mapping: Optional[str] = None
    iso27001_mapping: Optional[str] = None
    iso27002_mapping: Optional[str] = None
    cobit5_mapping: Optional[str] = None
    analysis: Optional[str] = None
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    mapping_source: str = 'manual'
    created_by: Optional[str] = None
    is_active: bool = True
    # Champs enrichis (agentive analysis)
    threat: Optional[str] = None
    risk: Optional[str] = None
    control_implementation: Optional[str] = None


class MappingCreate(MappingBase):
    requirement_id: int


class MappingResponse(MappingBase):
    id: int
    requirement_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Analysis & Similarity Schemas
# ============================================

class SimilaritySearchRequest(BaseModel):
    requirement_text: str
    top_k: Optional[int] = Field(5, ge=1, le=20)


class SimilaritySearchResponse(BaseModel):
    control_id: str
    control_title: str
    control_description: Optional[str] = None
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    domain: Optional[str] = None
    category: Optional[str] = None


class BatchAnalysisRequest(BaseModel):
    requirement_ids: List[int]


class BatchAnalysisResponse(BaseModel):
    success: bool
    analyzed_count: int
    results: List[dict]


# ============================================
# Import Schemas
# ============================================

class BulkImportResponse(BaseModel):
    success: bool
    total_imported: int
    sheets: List[dict]
    message: str
    import_session_id: Optional[int] = None  # ID de la session d'import pour traçabilité


# ============================================
# Statistics Schemas
# ============================================

class StatsResponse(BaseModel):
    total_requirements: int
    analyzed: int
    pending: int
    manual: int
    total_mappings: int
    completion_rate: float = Field(..., ge=0.0, le=100.0)


# ============================================
# Complete Requirement with Mappings
# ============================================

class RequirementWithMappings(RequirementResponse):
    """
    Exigence complète avec ses mappings actifs
    """
    scf_mapping: Optional[str] = None
    iso27001_mapping: Optional[str] = None
    iso27002_mapping: Optional[str] = None
    cobit5_mapping: Optional[str] = None
    analysis: Optional[str] = None
    confidence_score: Optional[float] = None
    mapping_source: Optional[str] = None
    # Champs enrichis (agentive analysis)
    threat: Optional[str] = None
    risk: Optional[str] = None
    control_implementation: Optional[str] = None

    class Config:
        from_attributes = True
