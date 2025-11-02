"""
Module de validation sécurisée des fichiers uploadés
Protège contre: uploads malveillants, DoS, exploits de format de fichier
"""

import io
from typing import Tuple
from fastapi import UploadFile, HTTPException
from loguru import logger
import magic  # python-magic pour détection du type MIME réel


# Configuration de sécurité
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
CHUNK_SIZE = 1024 * 1024  # 1 MB chunks pour lecture progressive

# Types MIME autorisés pour Excel
ALLOWED_MIME_TYPES = {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
    'application/vnd.ms-excel',  # .xls
    'application/zip',  # .xlsx est un fichier ZIP
}

# Extensions autorisées
ALLOWED_EXTENSIONS = {'.xlsx', '.xls'}


class FileValidationError(Exception):
    """Exception levée lors de la validation de fichier"""
    pass


async def validate_excel_file(file: UploadFile) -> Tuple[bytes, str]:
    """
    Valide un fichier Excel uploadé de manière sécurisée

    Validations effectuées:
    1. Extension de fichier
    2. Taille du fichier (protection DoS)
    3. Type MIME réel (magic number)
    4. Intégrité du format

    Args:
        file: Fichier uploadé via FastAPI

    Returns:
        Tuple (contenu_fichier, nom_fichier)

    Raises:
        HTTPException: Si la validation échoue
    """

    # 1. Valider le nom de fichier
    if not file.filename:
        logger.error("Fichier sans nom")
        raise HTTPException(status_code=400, detail="Nom de fichier manquant")

    # 2. Valider l'extension
    file_ext = '.' + file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if file_ext not in ALLOWED_EXTENSIONS:
        logger.warning(f"Extension rejetée: {file_ext}")
        raise HTTPException(
            status_code=400,
            detail=f"Extension de fichier non autorisée. Formats acceptés: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    logger.info(f"📄 Validation du fichier: {file.filename} ({file_ext})")

    # 3. Lire le fichier avec limite de taille
    contents = bytearray()
    total_size = 0

    try:
        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break

            total_size += len(chunk)

            # Protection DoS: limite de taille
            if total_size > MAX_FILE_SIZE:
                logger.error(f"Fichier trop volumineux: {total_size} bytes")
                raise HTTPException(
                    status_code=413,
                    detail=f"Fichier trop volumineux. Taille maximum: {MAX_FILE_SIZE // (1024*1024)} MB"
                )

            contents.extend(chunk)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lecture fichier: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la lecture du fichier")

    finally:
        # Toujours fermer le fichier
        await file.close()

    logger.info(f"📊 Taille du fichier: {total_size:,} bytes ({total_size / (1024*1024):.2f} MB)")

    # 4. Valider le type MIME réel (magic number)
    try:
        mime_type = magic.from_buffer(bytes(contents), mime=True)
        logger.info(f"🔍 Type MIME détecté: {mime_type}")

        if mime_type not in ALLOWED_MIME_TYPES:
            logger.warning(f"Type MIME rejeté: {mime_type}")
            raise HTTPException(
                status_code=400,
                detail=f"Format de fichier invalide. Type détecté: {mime_type}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur détection MIME: {e}")
        # Ne pas bloquer si python-magic n'est pas disponible (fallback)
        logger.warning("⚠️ Validation MIME non disponible, continuation avec extension uniquement")

    # 5. Valider que c'est un Excel valide
    try:
        import pandas as pd
        excel_file = pd.ExcelFile(io.BytesIO(contents))
        num_sheets = len(excel_file.sheet_names)
        logger.info(f"✅ Fichier Excel valide: {num_sheets} feuille(s)")

    except Exception as e:
        logger.error(f"Fichier Excel corrompu: {e}")
        raise HTTPException(
            status_code=400,
            detail="Fichier Excel corrompu ou invalide"
        )

    logger.info(f"✅ Validation réussie: {file.filename}")
    return bytes(contents), file.filename


def get_file_size_limit() -> int:
    """Retourne la limite de taille de fichier en bytes"""
    return MAX_FILE_SIZE


def get_allowed_extensions() -> set:
    """Retourne les extensions autorisées"""
    return ALLOWED_EXTENSIONS
