"""Air-gapped and local AI inference provider gateway."""

from app.services.ai_gateway.airgap_provider import (
    AirgapInferenceProvider,
    LocalModelConfig,
)

__all__ = ["AirgapInferenceProvider", "LocalModelConfig"]
