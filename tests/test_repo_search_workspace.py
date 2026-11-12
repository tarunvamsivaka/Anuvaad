"""Regression coverage for repository search request boundaries."""

import pytest
from pydantic import ValidationError

from app.routers.repo_search import IndexRepoPayload, SearchRepoPayload
from tests.sse_helpers import parse_sse_done


def test_repository_requests_require_workspace_scope():
    with pytest.raises(ValidationError):
        IndexRepoPayload(repo_name="owner/project")
    with pytest.raises(ValidationError):
        SearchRepoPayload(repo_name="owner/project", query="find auth")


@pytest.mark.parametrize("repo_name", ["../repo", "owner/..", "owner/.", "owner/repo/extra"])
def test_repository_name_rejects_path_segments(repo_name):
    with pytest.raises(ValidationError):
        IndexRepoPayload(repo_name=repo_name, workspace_id="f3a0fc9a-b915-4f1c-aaca-214d6d6c083c")


def test_search_request_bounds_query_and_top_k():
    with pytest.raises(ValidationError):
        SearchRepoPayload(
            repo_name="owner/project",
            workspace_id="f3a0fc9a-b915-4f1c-aaca-214d6d6c083c",
            query="x" * 8001,
        )
    with pytest.raises(ValidationError):
        SearchRepoPayload(
            repo_name="owner/project",
            workspace_id="f3a0fc9a-b915-4f1c-aaca-214d6d6c083c",
            query="find auth",
            top_k=101,
        )


def test_sse_parser_returns_only_terminal_blocks():
    from types import SimpleNamespace

    response = SimpleNamespace(
        text='data: {"chunk":"partial","done":false}\n\ndata: {"done":true,"blocks":[{"id":"b1"}]}\n\n'
    )
    assert parse_sse_done(response) == [{"id": "b1"}]


def test_sse_parser_surfaces_terminal_errors_as_details():
    from types import SimpleNamespace

    response = SimpleNamespace(text='data: {"done":true,"error":"temporarily unavailable"}\n\n')
    assert parse_sse_done(response) == {"detail": "temporarily unavailable"}
