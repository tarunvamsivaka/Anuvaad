"""
tests/test_enterprise_sso.py

Unit and integration tests for Phase 3B (Week 6):
Open-Source Enterprise SSO & SAML Identity Federation.
"""

import base64

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_get_tenant_sso_status():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Enrolled tenant
        resp = await client.get("/api/v1/sso/tenants/acme.corp")
        assert resp.status_code == 200
        data = resp.json()
        assert data["sso_enabled"] is True
        assert data["tenant_id"] == "tenant_acme_corp"
        assert "idp_entity_id" in data

        # Unenrolled domain
        resp_unenrolled = await client.get("/api/v1/sso/tenants/randomstartup.io")
        assert resp_unenrolled.status_code == 200
        assert resp_unenrolled.json()["sso_enabled"] is False


@pytest.mark.asyncio
async def test_saml_authorize():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Valid enrolled corporate email
        resp = await client.post(
            "/api/v1/sso/saml/authorize",
            json={"email": "alice@acme.corp", "redirect_url": "http://test/dashboard"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "sso_url" in data
        assert "idp.acme.corp" in data["sso_url"]
        assert data["tenant"] == "acme.corp"
        assert "request_id" in data

        # Non-enrolled domain -> 400
        resp_invalid = await client.post(
            "/api/v1/sso/saml/authorize",
            json={"email": "bob@unknown.com"},
        )
        assert resp_invalid.status_code == 400
        assert "not have Enterprise SSO" in resp_invalid.json()["detail"]


@pytest.mark.asyncio
async def test_saml_callback():
    transport = ASGITransport(app=app)
    # Valid mock assertion XML
    mock_saml_xml = (
        "<samlp:Response xmlns:samlp='urn:oasis:names:tc:SAML:2.0:protocol'>"
        "<saml:Assertion xmlns:saml='urn:oasis:names:tc:SAML:2.0:assertion'>"
        "<saml:Subject><saml:NameID>lead.architect@acme.corp</saml:NameID></saml:Subject>"
        "</saml:Assertion>"
        "</samlp:Response>"
    )
    b64_xml = base64.b64encode(mock_saml_xml.encode()).decode()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Valid callback
        resp = await client.post(
            "/api/v1/sso/saml/callback",
            json={"SAMLResponse": b64_xml, "RelayState": "/dashboard"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user_email"] == "lead.architect@acme.corp"

        # Malformed assertion
        resp_malformed = await client.post(
            "/api/v1/sso/saml/callback",
            json={"SAMLResponse": base64.b64encode(b"<BadResponse/>").decode()},
        )
        assert resp_malformed.status_code == 400


@pytest.mark.asyncio
async def test_sso_token_authenticated_by_auth_dependency():
    """Verify that the token returned by SSO callback can authenticate to protected endpoints."""
    mock_saml_xml = (
        "<samlp:Response xmlns:samlp='urn:oasis:names:tc:SAML:2.0:protocol'>"
        "<saml:Assertion xmlns:saml='urn:oasis:names:tc:SAML:2.0:assertion'>"
        "<saml:Subject><saml:NameID>lead.architect@acme.corp</saml:NameID></saml:Subject>"
        "</saml:Assertion>"
        "</samlp:Response>"
    )
    b64_xml = base64.b64encode(mock_saml_xml.encode()).decode()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/sso/saml/callback",
            json={"SAMLResponse": b64_xml, "RelayState": "/dashboard"},
        )
        assert resp.status_code == 200
        token = resp.json()["access_token"]

        # Call a protected endpoint using the issued SSO Bearer token
        protected_resp = await client.get(
            "/api/v1/history",
            headers={"Authorization": f"Bearer {token}"},
        )
        # Auth must succeed: status should not be 401
        assert protected_resp.status_code != 401
