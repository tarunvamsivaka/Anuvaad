"""Tests for modernize router: repository dependency analysis and impact calculation."""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_analyze_repository_endpoint():
    files = [
        {
            "file_path": "src/utils.py",
            "content": "def add(a: int, b: int) -> int:\n    return a + b\n",
            "language": "python",
        },
        {
            "file_path": "src/service.py",
            "content": "from src.utils import add\n\ndef calculate(x: int) -> int:\n    return add(x, 10)\n",
            "language": "python",
        },
    ]

    resp = client.post(
        "/api/v1/modernize/analyze-repository",
        json={
            "repository_name": "sample_repo",
            "files": files,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["repository_name"] == "sample_repo"
    assert data["total_files"] == 2
    assert "symbol_migration_order" in data
    assert "file_migration_order" in data
    assert len(data["file_migration_order"]) == 2


def test_analyze_impact_endpoint():
    files = [
        {
            "file_path": "db.py",
            "content": "def connect(): pass",
            "language": "python",
        },
        {
            "file_path": "user.py",
            "content": "from db import connect\ndef get_user(): pass",
            "language": "python",
        },
    ]

    resp = client.post(
        "/api/v1/modernize/impact",
        json={
            "changed_symbol": "db.py",
            "files": files,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["changed_symbol"] == "db.py"
    assert "impacted_symbols" in data


def test_empty_files_rejected():
    resp = client.post(
        "/api/v1/modernize/analyze-repository",
        json={
            "repository_name": "empty",
            "files": [],
        },
    )
    assert resp.status_code == 422  # pydantic validation error for min_length=1
