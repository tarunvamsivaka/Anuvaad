import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, Boolean, Column, DateTime, Index, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

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

    repository_imports = relationship("RepositoryImport", back_populates="workspace")

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

# Phase 1A Models
class RepositoryImport(Base):
    __tablename__ = "repository_imports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    provider = Column(Text, nullable=False)
    provider_repo_id = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    workspace = relationship("Workspace", back_populates="repository_imports")
    source_states = relationship("SourceState", back_populates="import_")
    searchable_materializations = relationship("SearchableMaterialization", back_populates="import_")
    repository_linked_history = relationship("RepositoryLinkedHistory", back_populates="import_")

    __table_args__ = (
        Index("ix_repo_imports_workspace_provider", "workspace_id", "provider", "provider_repo_id", unique=True),
    )

class SourceState(Base):
    __tablename__ = "source_states"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    import_id = Column(UUID(as_uuid=True), ForeignKey("repository_imports.id"), nullable=False, index=True)
    revision_sha = Column(Text, nullable=False)
    snapshot_hash = Column(Text, nullable=True) # Fallback hash
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    import_ = relationship("RepositoryImport", back_populates="source_states")
    repository_linked_history = relationship("RepositoryLinkedHistory", back_populates="source_state")

class IndexConfiguration(Base):
    __tablename__ = "index_configurations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    config_hash = Column(Text, nullable=False, unique=True, index=True)
    chunk_size = Column(Integer, nullable=False)
    admission_policy_version = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

# Phase 1B Models
class DesiredIndexState(Base):
    __tablename__ = "desired_index_states"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    import_id = Column(UUID(as_uuid=True), ForeignKey("repository_imports.id"), nullable=False, index=True)
    source_state_id = Column(UUID(as_uuid=True), ForeignKey("source_states.id"), nullable=False)
    index_configuration_id = Column(UUID(as_uuid=True), ForeignKey("index_configurations.id"), nullable=False)
    incarnation_id = Column(UUID(as_uuid=True), default=uuid.uuid4, nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    import_ = relationship("RepositoryImport")
    source_state = relationship("SourceState")
    index_configuration = relationship("IndexConfiguration")

class IndexRun(Base):
    __tablename__ = "index_runs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    desired_state_id = Column(UUID(as_uuid=True), ForeignKey("desired_index_states.id"), nullable=False, index=True)
    status = Column(Text, nullable=False)
    error_diagnostics = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    completed_at = Column(DateTime(timezone=True), nullable=True)

    desired_state = relationship("DesiredIndexState")


# Phase 1C Models
class SearchableMaterialization(Base):
    __tablename__ = "searchable_materializations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    import_id = Column(UUID(as_uuid=True), ForeignKey("repository_imports.id"), nullable=False, index=True)
    index_run_id = Column(UUID(as_uuid=True), ForeignKey("index_runs.id"), nullable=False, unique=True, index=True)
    is_current = Column(Boolean, nullable=False, default=True, server_default="true")
    published_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)

    import_ = relationship("RepositoryImport", back_populates="searchable_materializations")
    index_run = relationship("IndexRun")
    structural_files = relationship("StructuralFile", back_populates="materialization")

    __table_args__ = (
        Index(
            "uq_searchable_materializations_current_import",
            "import_id",
            unique=True,
            postgresql_where=(is_current.is_(True)),
        ),
    )


class StructuralFile(Base):
    __tablename__ = "structural_files"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    materialization_id = Column(UUID(as_uuid=True), ForeignKey("searchable_materializations.id"), nullable=False, index=True)
    file_path = Column(Text, nullable=False)
    language = Column(Text, nullable=False)
    module_identity = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    materialization = relationship("SearchableMaterialization", back_populates="structural_files")
    symbols = relationship("StructuralSymbol", back_populates="structural_file")
    declared_imports = relationship(
        "StructuralImport",
        back_populates="source_file",
        foreign_keys="StructuralImport.source_file_id",
    )
    resolved_imports = relationship(
        "StructuralImport",
        back_populates="resolved_target_file",
        foreign_keys="StructuralImport.resolved_target_file_id",
    )

    __table_args__ = (
        Index("uq_structural_files_materialization_path", "materialization_id", "file_path", unique=True),
    )


class StructuralSymbol(Base):
    __tablename__ = "structural_symbols"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    structural_file_id = Column(UUID(as_uuid=True), ForeignKey("structural_files.id"), nullable=False, index=True)
    symbol_name = Column(Text, nullable=False)
    symbol_kind = Column(Text, nullable=False)
    location_start = Column(Integer, nullable=False)
    location_end = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    structural_file = relationship("StructuralFile", back_populates="symbols")

    __table_args__ = (
        Index(
            "uq_structural_symbols_file_location",
            "structural_file_id",
            "symbol_name",
            "symbol_kind",
            "location_start",
            "location_end",
            unique=True,
        ),
    )


class StructuralImport(Base):
    __tablename__ = "structural_imports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_file_id = Column(UUID(as_uuid=True), ForeignKey("structural_files.id"), nullable=False, index=True)
    declared_import = Column(Text, nullable=False)
    resolved_target_file_id = Column(UUID(as_uuid=True), ForeignKey("structural_files.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    source_file = relationship(
        "StructuralFile", back_populates="declared_imports", foreign_keys=[source_file_id]
    )
    resolved_target_file = relationship(
        "StructuralFile", back_populates="resolved_imports", foreign_keys=[resolved_target_file_id]
    )

    __table_args__ = (
        Index("uq_structural_imports_source_declared", "source_file_id", "declared_import", unique=True),
    )


class RepositoryLinkedHistory(Base):
    __tablename__ = "repository_linked_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    translation_history_id = Column(UUID(as_uuid=True), ForeignKey("translation_history.id"), nullable=False, unique=True, index=True)
    import_id = Column(UUID(as_uuid=True), ForeignKey("repository_imports.id"), nullable=False, index=True)
    source_state_id = Column(UUID(as_uuid=True), ForeignKey("source_states.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    workspace = relationship("Workspace")
    translation_history = relationship("TranslationHistory")
    import_ = relationship("RepositoryImport", back_populates="repository_linked_history")
    source_state = relationship("SourceState", back_populates="repository_linked_history")

