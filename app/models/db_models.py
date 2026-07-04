import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, Boolean, Column, DateTime, Index, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.database_session import Base

UTC = timezone.utc  # datetime.UTC requires Python 3.11+; alias for 3.10 compat

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

class UserGithubToken(Base):
    __tablename__ = "user_github_tokens"
    user_email = Column(Text, primary_key=True)
    # FIX-01 (P0-01): access_token is stored Fernet-encrypted (never plaintext).
    # Encrypt/decrypt via app.core.token_encryption.{encrypt_token, decrypt_token}.
    access_token = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_email = Column(Text, unique=True, nullable=False, index=True)
    is_pro = Column(Boolean, default=False)
    credits = Column(Integer, default=0)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    onboarded = Column(Boolean, default=False)
    stripe_customer_id = Column(Text, nullable=True)
    razorpay_subscription_id = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    owner_email = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    workspace_id = Column(UUID(as_uuid=True), primary_key=True)
    user_email = Column(Text, primary_key=True)
    role = Column(Text, default="member")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=True)
    user_email = Column(Text, nullable=False)
    name = Column(Text, nullable=False)
    api_key_hash = Column(Text, nullable=False)
    key_prefix = Column(Text, nullable=False)
    # FIX-27 (P2-06): Track hash algorithm for rolling upgrade from sha256 → argon2id.
    # New keys use argon2id; existing sha256 keys are upgraded on first use.
    key_hash_algo = Column(Text, nullable=False, default="sha256", server_default="sha256")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    last_used_at = Column(DateTime(timezone=True), nullable=True)

class TranslationHistory(Base):
    __tablename__ = "translation_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=True)
    user_email = Column(Text, nullable=False)
    is_public = Column(Boolean, default=False)
    char_count = Column(Integer, default=0)
    block_count = Column(Integer, default=0)
    blocks = Column(JSONB, nullable=True)
    character_count = Column(Integer, default=0)
    target_language = Column(Text, nullable=True)
    source_language = Column(Text, nullable=True)
    mode = Column(Text, nullable=True)
    file_path = Column(Text, nullable=True)
    model_used = Column(Text, nullable=True)
    title = Column(Text, nullable=True)
    session_id = Column(Text, nullable=True)
    repository_name = Column(Text, nullable=True)
    input_preview = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    # FIX-03 (P0-05): Composite index for the primary history listing query.
    __table_args__ = (
        Index("ix_translation_history_user_created", "user_email", "created_at"),
        Index("ix_translation_history_workspace", "workspace_id"),
    )

class UserTranslationStats(Base):
    __tablename__ = "user_translation_stats"
    user_email = Column(Text, primary_key=True)
    total = Column(BigInteger, default=0)
    today_count = Column(BigInteger, default=0)
    this_week_count = Column(BigInteger, default=0)

# New table for immutable webhook logs and idempotency
class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(Text, unique=True, nullable=False, index=True)
    payload = Column(JSONB, nullable=False)
    status = Column(Text, default="pending")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

# New table for vector DB cache
class LLMSemanticCache(Base):
    __tablename__ = "llm_semantic_cache"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prompt_hash = Column(Text, unique=True, nullable=False, index=True)
    embedding = Column(Vector(1536)) # Assuming 1536 dim embeddings (e.g. text-embedding-3-small)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

# New table for GitHub repo vector embeddings (Phase 4)
class RepoEmbedding(Base):
    __tablename__ = "repo_embeddings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_name = Column(Text, nullable=False, index=True)
    file_path = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1536)) # 1536 dim for openai text-embedding-3-small (was 384)
    provider = Column(Text, default="hf", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
