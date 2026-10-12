"""
SQLAlchemy 2.0 Asynchronous Database Setup with asyncpg and Keyset Pagination.
Directly maps to the Anuvaad Supabase PostgreSQL tables.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Any, Tuple
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Boolean,
    DateTime,
    select,
    desc,
    and_,
    or_,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.orm import declarative_base
from app.core.config import settings

Base = declarative_base()


class TranslationHistoryModel(Base):
    __tablename__ = "translation_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_email = Column(Text, nullable=False, default="ephemeral@anuvaad.internal")
    input_preview = Column(Text, nullable=False)
    source_language = Column(Text, nullable=True)
    target_language = Column(Text, nullable=True)
    mode = Column(Text, nullable=False, default="single_file")
    workspace_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    is_public = Column(Boolean, default=False)
    session_id = Column(Text, nullable=True)
    repository_name = Column(Text, nullable=True)
    file_path = Column(Text, nullable=True)
    block_count = Column(Integer, default=1)
    model_used = Column(Text, nullable=True)
    blocks = Column(JSONB, nullable=True)
    title = Column(Text, nullable=True)
    character_count = Column(Integer, default=0)
    input_hash = Column(String, nullable=True)


class WorkspaceModel(Base):
    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    owner_email = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class RepositoryImportModel(Base):
    __tablename__ = "repository_imports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=True)
    provider = Column(Text, default="github")
    provider_repo_id = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class StructuralFileModel(Base):
    __tablename__ = "structural_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    materialization_id = Column(UUID(as_uuid=True), nullable=True)
    file_path = Column(Text, nullable=False)
    language = Column(Text, nullable=False)
    module_identity = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class StructuralImportModel(Base):
    __tablename__ = "structural_imports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_file_id = Column(UUID(as_uuid=True), nullable=False)
    declared_import = Column(Text, nullable=False)
    resolved_target_file_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class RepoEmbeddingModel(Base):
    __tablename__ = "repo_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_name = Column(Text, nullable=False)
    file_path = Column(Text, nullable=False)
    chunk_index = Column(Integer, default=0)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    indexed_by = Column(Text, default="anuvaad-engine")


class StructuralSymbolModel(Base):
    __tablename__ = "structural_symbols"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    structural_file_id = Column(UUID(as_uuid=True), nullable=False)
    symbol_name = Column(Text, nullable=False)
    symbol_kind = Column(Text, nullable=False)
    location_start = Column(Integer, nullable=False)
    location_end = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


from fastapi import HTTPException, status

# Engine and Session initialization
engine = (
    create_async_engine(
        settings.SUPABASE_DB_URL,
        echo=False,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )
    if settings.SUPABASE_DB_URL
    else None
)

async_session_factory = (
    async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    if engine is not None
    else None
)


async def get_db_session() -> AsyncSession:
    """Dependency for yielding async SQLAlchemy sessions."""
    if async_session_factory is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection not configured. Please set SUPABASE_DB_URL in your environment.",
        )
    async with async_session_factory() as session:
        yield session


async def paginate_keyset(
    session: AsyncSession,
    model: Any,
    limit: int = 20,
    cursor_created_at: Optional[datetime] = None,
    cursor_id: Optional[uuid.UUID] = None,
    user_email: Optional[str] = None,
) -> Tuple[List[Any], Optional[str]]:
    """
    Keyset pagination: (created_at, id) < (cursor_created_at, cursor_id).
    Avoids OFFSET performance degradation on large tables.
    Returns: (items, next_cursor_string)
    """
    query = select(model)

    if user_email and hasattr(model, "user_email"):
        query = query.where(model.user_email == user_email)

    if cursor_created_at and cursor_id:
        query = query.where(
            or_(
                model.created_at < cursor_created_at,
                and_(
                    model.created_at == cursor_created_at,
                    model.id < cursor_id,
                ),
            )
        )

    query = query.order_by(desc(model.created_at), desc(model.id)).limit(limit + 1)
    result = await session.execute(query)
    records = result.scalars().all()

    has_more = len(records) > limit
    items = list(records[:limit])

    next_cursor = None
    if has_more and items:
        last_item = items[-1]
        next_cursor = f"{last_item.created_at.isoformat()}:{str(last_item.id)}"

    return items, next_cursor
