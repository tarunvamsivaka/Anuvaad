from pydantic import BaseModel, Field, field_validator

class CodePayload(BaseModel):
    raw_code: str = Field(..., min_length=1, max_length=50000)
    language: str = Field(..., min_length=1, max_length=30)
    workspace_id: str | None = None
    # access_token removed — auth is via Authorization header (BACK-06)
    session_id: str | None = None
    repository_name: str | None = None
    file_path: str | None = None

    @field_validator("raw_code")
    @classmethod
    def raw_code_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Code cannot be empty or whitespace only")
        return v


class EnglishUpdatePayload(BaseModel):
    block_id: str = Field(..., min_length=1, max_length=50)
    modified_english: str = Field(..., min_length=1, max_length=5000)
    full_context: str = Field(..., min_length=1, max_length=10000)


class GeneratePayload(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=5000)
    language: str = Field(..., min_length=1, max_length=30)
    workspace_id: str | None = None
    # access_token removed — auth is via Authorization header (BACK-06)
    session_id: str | None = None
    repository_name: str | None = None
    file_path: str | None = None

    @field_validator("prompt")
    @classmethod
    def prompt_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Prompt cannot be empty or whitespace only")
        return v


class CodeToCodePayload(BaseModel):
    raw_code: str = Field(..., min_length=1, max_length=50000)
    source_language: str = Field(..., min_length=1, max_length=30)
    target_language: str = Field(..., min_length=1, max_length=30)
    workspace_id: str | None = None
    # access_token removed — auth is via Authorization header (BACK-06)
    session_id: str | None = None
    repository_name: str | None = None
    file_path: str | None = None

    @field_validator("raw_code")
    @classmethod
    def raw_code_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Code cannot be empty or whitespace only")
        return v


class SaveTranslationPayload(BaseModel):
    mode: str = Field(..., min_length=1)
    source_language: str = Field(..., min_length=1)
    target_language: str = Field(..., min_length=1)
    input_text: str = Field(..., min_length=1)
    block_count: int
    model_used: str = Field(..., min_length=1)

    @field_validator("input_text")
    @classmethod
    def input_text_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Input cannot be empty or whitespace only")
        return v


class BlockItem(BaseModel):
    id: str
    code_snippet: str
    english_translation: str


class SyncEnglishToCodePayload(BaseModel):
    blocks: list[BlockItem]
    language: str
    custom_instructions: str | None = None
    workspace_id: str | None = None
    session_id: str | None = None
    repository_name: str | None = None
    file_path: str | None = None


class CheckoutPayload(BaseModel):
    """BACK-06: access_token removed — auth via Authorization header (Depends)."""
    user_email: str = Field(..., min_length=5, max_length=254)


class SubscriptionCheckPayload(BaseModel):
    """No fields — subscription checks use GET with Authorization header only.
    Retained as an empty schema for any clients that POST a body.
    """


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Workspace name cannot be empty")
        return v


class WorkspaceInvite(BaseModel):
    email: str = Field(..., min_length=3, max_length=100)
    role: str = Field("member", min_length=1, max_length=20)

    @field_validator("email")
    @classmethod
    def email_not_blank(cls, v: str) -> str:
        if not v.strip() or "@" not in v:
            raise ValueError("Valid email required")
        return v


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    workspace_id: str | None = None


class CreditCheckoutPayload(BaseModel):
    """BACK-06: access_token removed — auth via Authorization header (Depends)."""
    pass  # No fields needed; auth is header-only


class VerifyPaymentPayload(BaseModel):
    razorpay_payment_id: str = Field(..., min_length=5)
    razorpay_order_id: str | None = None
    razorpay_subscription_id: str | None = None
    razorpay_signature: str = Field(..., min_length=5)
    # BACK-06: access_token removed — auth via Authorization header (Depends)
    payment_type: str = Field(..., pattern="^(subscription|credits)$")


class SharePayload(BaseModel):
    """Payload for toggling public/private sharing of a translation history item."""
    is_public: bool
