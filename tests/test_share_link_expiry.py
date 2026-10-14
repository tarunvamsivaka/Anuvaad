import pytest
from pydantic import ValidationError

from app.models.schemas import SharePayload


@pytest.mark.parametrize("days", [1, 7, 30])
def test_share_payload_accepts_supported_expiration_days(days: int) -> None:
    payload = SharePayload(is_public=True, expires_in_days=days)

    assert payload.expires_in_days == days


def test_share_payload_accepts_no_expiration() -> None:
    payload = SharePayload(is_public=True, expires_in_days=None)

    assert payload.expires_in_days is None


@pytest.mark.parametrize("days", [0, 2, 14, 365, "7"])
def test_share_payload_rejects_unsupported_expiration_days(days: object) -> None:
    with pytest.raises(ValidationError):
        SharePayload(is_public=True, expires_in_days=days)
