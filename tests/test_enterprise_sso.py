import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_unverified_sso_endpoints_are_not_mounted():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tenant = await client.get("/api/v1/sso/tenants/acme.corp")
        authorize = await client.post("/api/v1/sso/saml/authorize", json={"email": "alice@acme.corp"})
        callback = await client.post(
            "/api/v1/sso/saml/callback",
            json={"SAMLResponse": "PHNhbWw6QXNzZXJ0aW9uLz4="},
        )

    assert tenant.status_code == 404
    assert authorize.status_code == 404
    assert callback.status_code == 404
