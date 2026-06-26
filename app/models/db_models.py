import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Boolean, Integer, BigInteger, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector
from app.core.database_session import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class UserGithubToken(Base):
    __tablename__ = "user_github_tokens"
    user_email = Column(Text, primary_key=True)
    access_token = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    owner_email = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    workspace_id = Column(UUID(as_uuid=True), primary_key=True)
    user_email = Column(Text, primary_key=True)
    role = Column(Text, default="member")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=True)
    user_email = Column(Text, nullable=False)
    name = Column(Text, nullable=False)
    api_key_hash = Column(Text, nullable=False)
    key_prefix = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

# New table for vector DB cache
class LLMSemanticCache(Base):
    __tablename__ = "llm_semantic_cache"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prompt_hash = Column(Text, unique=True, nullable=False, index=True)
    embedding = Column(Vector(1536)) # Assuming 1536 dim embeddings (e.g. text-embedding-3-small)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

# New table for GitHub repo vector embeddings (Phase 4)
class RepoEmbedding(Base):
    __tablename__ = "repo_embeddings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_name = Column(Text, nullable=False, index=True)
    file_path = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(384)) # 384 dim for sentence-transformers all-MiniLM-L6-v2
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
