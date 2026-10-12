"""
Translation history endpoints with keyset cursor pagination.
Strictly logs only non-confidential metadata and previews to respect Zero Code Retention.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_session, TranslationHistoryModel, paginate_keyset

router = APIRouter()


class TranslationHistoryItem(BaseModel):
    id: str
    user_email: str
    input_preview: str
    source_language: Optional[str]
    target_language: Optional[str]
    mode: str
    created_at: str
    character_count: int
    model_used: Optional[str]
    input_hash: Optional[str]


class HistoryPageResponse(BaseModel):
    items: List[TranslationHistoryItem]
    next_cursor: Optional[str] = None
    has_more: bool


import logging
from app.api.deps import get_current_user, UserInfo

logger = logging.getLogger(__name__)


@router.get(
    "/history",
    response_model=HistoryPageResponse,
    summary="List Translation History via Keyset Cursor Pagination",
)
async def list_translation_history(
    cursor: Optional[str] = Query(None, description="Cursor in format ISO_DATETIME:UUID"),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    cursor_time: Optional[datetime] = None
    cursor_id: Optional[uuid.UUID] = None

    if cursor:
        try:
            time_part, id_part = cursor.split(":", 1)
            cursor_time = datetime.fromisoformat(time_part)
            cursor_id = uuid.UUID(id_part)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid cursor format. Expected ISO_DATETIME:UUID",
            )

    try:
        records, next_cursor = await paginate_keyset(
            session=db,
            model=TranslationHistoryModel,
            limit=limit,
            cursor_created_at=cursor_time,
            cursor_id=cursor_id,
            user_email=current_user.email,
        )

        items = [
            TranslationHistoryItem(
                id=str(r.id),
                user_email=r.user_email,
                input_preview=r.input_preview,
                source_language=r.source_language,
                target_language=r.target_language,
                mode=r.mode,
                created_at=r.created_at.isoformat() if r.created_at else "",
                character_count=r.character_count or 0,
                model_used=r.model_used,
                input_hash=r.input_hash,
            )
            for r in records
        ]

        return HistoryPageResponse(
            items=items,
            next_cursor=next_cursor,
            has_more=bool(next_cursor),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to query translation history from database")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal database error occurred while querying history.",
        )
