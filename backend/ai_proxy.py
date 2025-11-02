"""
Endpoints proxy pour les APIs AI (Claude, Gemini)
Sécurise les clés API côté serveur au lieu du client
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from loguru import logger
import os
import json

# Import des clients AI
try:
    from anthropic import Anthropic
except ImportError:
    logger.warning("Anthropic SDK non installé")
    Anthropic = None

try:
    import google.generativeai as genai
except ImportError:
    logger.warning("Google Generative AI SDK non installé")
    genai = None


router = APIRouter(prefix="/api/ai", tags=["AI Proxy"])

# Charger les clés API depuis l'environnement (SÉCURISÉ)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialiser les clients AI
anthropic_client = None
if ANTHROPIC_API_KEY and Anthropic:
    try:
        anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)
        logger.info("✅ Client Anthropic initialisé")
    except Exception as e:
        logger.error(f"❌ Erreur initialisation Anthropic: {e}")

if GEMINI_API_KEY and genai:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("✅ Client Gemini initialisé")
    except Exception as e:
        logger.error(f"❌ Erreur initialisation Gemini: {e}")


# ============================================
# Schémas Pydantic
# ============================================

class ClaudeMessage(BaseModel):
    role: str
    content: str


class ClaudeAnalysisRequest(BaseModel):
    messages: List[ClaudeMessage]
    model: str = "claude-3-5-sonnet-20241022"
    max_tokens: int = 8192
    temperature: float = 0.0
    system: Optional[str] = None


class ClaudeChatRequest(BaseModel):
    messages: List[ClaudeMessage]
    requirement_context: Optional[str] = None
    model: str = "claude-3-5-sonnet-20241022"
    max_tokens: int = 4096
    temperature: float = 0.7


class GeminiAnalysisRequest(BaseModel):
    prompt: str
    model: str = "gemini-2.0-flash-exp"
    temperature: float = 0.0


# ============================================
# Endpoints Proxy Claude
# ============================================

@router.post("/claude/analyze")
async def claude_analyze_proxy(request: ClaudeAnalysisRequest):
    """
    Proxy pour analyse Claude (remplace appel direct depuis frontend)

    Sécurité:
    - Clé API stockée côté serveur uniquement
    - Rate limiting appliqué (TODO)
    - Logging des requêtes pour audit
    """
    if not anthropic_client:
        raise HTTPException(
            status_code=503,
            detail="Service Claude non disponible (clé API manquante ou SDK non installé)"
        )

    try:
        logger.info(f"📤 Appel Claude API: {request.model}, {len(request.messages)} messages")

        # Préparer les messages
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]

        # Appel API côté serveur (SÉCURISÉ)
        response = anthropic_client.messages.create(
            model=request.model,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            system=request.system if request.system else None,
            messages=messages
        )

        logger.info(f"✅ Réponse Claude reçue: {response.usage.input_tokens} input, {response.usage.output_tokens} output tokens")

        # Retourner la réponse formatée
        return {
            "id": response.id,
            "model": response.model,
            "role": response.role,
            "content": response.content,
            "stop_reason": response.stop_reason,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            }
        }

    except Exception as e:
        logger.error(f"❌ Erreur appel Claude API: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur Claude API: {str(e)}")


@router.post("/claude/chat/stream")
async def claude_chat_stream_proxy(request: ClaudeChatRequest):
    """
    Proxy pour chat Claude avec streaming

    Utilisé pour les conversations contextuelles par requirement
    """
    if not anthropic_client:
        raise HTTPException(
            status_code=503,
            detail="Service Claude non disponible"
        )

    try:
        logger.info(f"💬 Chat Claude streaming: {len(request.messages)} messages")

        # Préparer le contexte système si fourni
        system_message = None
        if request.requirement_context:
            system_message = f"""Tu es un assistant expert en conformité GRC (Gouvernance, Risque et Conformité).

Contexte de l'exigence:
{request.requirement_context}

Réponds de manière concise et précise aux questions sur cette exigence."""

        # Préparer les messages
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]

        async def generate_stream():
            """Générateur pour streaming SSE"""
            try:
                with anthropic_client.messages.stream(
                    model=request.model,
                    max_tokens=request.max_tokens,
                    temperature=request.temperature,
                    system=system_message,
                    messages=messages
                ) as stream:
                    for text in stream.text_stream:
                        # Format SSE (Server-Sent Events)
                        yield f"data: {json.dumps({'type': 'text', 'text': text})}\n\n"

                # Message de fin
                yield f"data: {json.dumps({'type': 'done'})}\n\n"

            except Exception as e:
                logger.error(f"❌ Erreur streaming: {e}")
                yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )

    except Exception as e:
        logger.error(f"❌ Erreur chat Claude: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur Claude chat: {str(e)}")


# ============================================
# Endpoints Proxy Gemini
# ============================================

@router.post("/gemini/analyze")
async def gemini_analyze_proxy(request: GeminiAnalysisRequest):
    """
    Proxy pour analyse Gemini

    Sécurité:
    - Clé API stockée côté serveur uniquement
    """
    if not genai:
        raise HTTPException(
            status_code=503,
            detail="Service Gemini non disponible (clé API manquante ou SDK non installé)"
        )

    try:
        logger.info(f"📤 Appel Gemini API: {request.model}")

        # Initialiser le modèle
        model = genai.GenerativeModel(request.model)

        # Appel API côté serveur (SÉCURISÉ)
        response = model.generate_content(
            request.prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=request.temperature,
            )
        )

        logger.info(f"✅ Réponse Gemini reçue")

        return {
            "text": response.text,
            "model": request.model
        }

    except Exception as e:
        logger.error(f"❌ Erreur appel Gemini API: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur Gemini API: {str(e)}")


# ============================================
# Endpoint de santé
# ============================================

@router.get("/health")
async def ai_proxy_health():
    """Vérifier l'état des services AI"""
    return {
        "status": "ok",
        "services": {
            "claude": {
                "available": anthropic_client is not None,
                "api_key_configured": ANTHROPIC_API_KEY is not None
            },
            "gemini": {
                "available": genai is not None,
                "api_key_configured": GEMINI_API_KEY is not None
            }
        }
    }
