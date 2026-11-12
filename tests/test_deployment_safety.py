"""Release-gate regression tests for privacy and disabled enterprise surfaces."""

import pytest

from app.main import app
from app.services.ai_gateway.airgap_provider import AirgapInferenceProvider, LocalModelConfig


def test_unverified_sso_routes_are_absent_from_the_deployed_application():
    assert not any(getattr(route, "path", "").startswith("/api/v1/sso/") for route in app.routes)


@pytest.mark.parametrize(
    "url",
    [
        "https://api.example.com/v1",
        "http://8.8.8.8/v1",
        "http://169.254.169.254/latest/meta-data",
        "http://metadata.google.internal/computeMetadata/v1",
    ],
)
def test_airgap_rejects_public_and_metadata_destinations(url: str):
    with pytest.raises(ValueError):
        AirgapInferenceProvider(LocalModelConfig(base_url=url))


def test_airgap_accepts_private_endpoint():
    provider = AirgapInferenceProvider(LocalModelConfig(base_url="http://10.10.0.8:8080/v1"))
    assert provider.config.base_url.startswith("http://10.")


def test_history_encryption_round_trip(monkeypatch):
    monkeypatch.setenv("HISTORY_ENCRYPTION_KEYS", "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
    from app.core.history_encryption import decrypt_blocks, encrypt_blocks

    blocks = [{"id": "one", "code_snippet": "print('safe')", "english_translation": "Prints safe."}]
    ciphertext = encrypt_blocks(blocks)
    assert "print('safe')" not in ciphertext
    assert decrypt_blocks(ciphertext) == blocks
