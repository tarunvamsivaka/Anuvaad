"""Tests for AirgapInferenceProvider and local egress validation."""

import pytest

from app.services.ai_gateway.airgap_provider import (
    AirgapInferenceProvider,
    LocalModelConfig,
)


def test_airgap_provider_initialization_defaults():
    config = LocalModelConfig(
        base_url="http://127.0.0.1:11434/v1",
        model_name="llama3.3:70b",
    )
    provider = AirgapInferenceProvider(config)
    assert provider.config.model_name == "llama3.3:70b"
    assert "127.0.0.1" in provider.config.base_url


def test_airgap_provider_private_ip_allowed():
    # 192.168.1.100 is private subnet
    config = LocalModelConfig(base_url="http://192.168.1.100:8000/v1")
    provider = AirgapInferenceProvider(config)
    assert provider.config.base_url == "http://192.168.1.100:8000/v1"


@pytest.mark.asyncio
async def test_airgap_provider_availability_check():
    # Loopback port that is likely closed should return False gracefully, not raise
    config = LocalModelConfig(base_url="http://127.0.0.1:59999/v1")
    provider = AirgapInferenceProvider(config)
    available = await provider.is_available()
    assert available is False


def test_airgap_provider_blocks_cloud_metadata_endpoints():
    with pytest.raises(ValueError, match="cloud instance metadata"):
        AirgapInferenceProvider(LocalModelConfig(base_url="http://169.254.169.254/v1"))

