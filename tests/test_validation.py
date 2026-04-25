"""
Input validation and edge-case tests for Anuvaad backend.

Tests payload limits, boundary conditions, and response normalization.
"""

import json
import sys
import os

# Add parent directory to path so we can import main
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestPayloadLimits:
    """Verify max_length field constraints."""

    def test_code_exceeds_max_length(self, client):
        """raw_code max_length is 10000."""
        res = client.post("/api/code-to-english", json={
            "raw_code": "x" * 10001,
            "language": "python"
        })
        assert res.status_code == 422

    def test_code_at_max_length(self, client):
        """Exactly 10000 chars should be accepted."""
        res = client.post("/api/code-to-english", json={
            "raw_code": "x" * 10000,
            "language": "python"
        })
        assert res.status_code == 200

    def test_language_exceeds_max_length(self, client):
        """language max_length is 30."""
        res = client.post("/api/code-to-english", json={
            "raw_code": "print('hello')",
            "language": "a" * 31
        })
        assert res.status_code == 422

    def test_prompt_exceeds_max_length(self, client):
        """prompt max_length is 5000."""
        res = client.post("/api/generate-from-english", json={
            "prompt": "x" * 5001,
            "language": "python"
        })
        assert res.status_code == 422


class TestResponseNormalization:
    """Test the normalize_blocks function handles various Gemini response shapes."""

    def test_normalize_standard_response(self):
        from main import normalize_blocks
        raw = [{"id": "block_1", "code_snippet": "x = 1", "english_translation": "Assigns 1 to x"}]
        result = normalize_blocks(raw)
        assert len(result) == 1
        assert result[0]["id"] == "block_1"

    def test_normalize_nested_blocks_key(self):
        from main import normalize_blocks
        raw = {"blocks": [{"id": "b1", "code_snippet": "x", "english_translation": "desc"}]}
        result = normalize_blocks(raw)
        assert len(result) == 1

    def test_normalize_nested_result_key(self):
        from main import normalize_blocks
        raw = {"result": [{"id": "b1", "code": "x", "explanation": "desc"}]}
        result = normalize_blocks(raw)
        assert len(result) == 1
        assert result[0]["code_snippet"] == "x"
        assert result[0]["english_translation"] == "desc"

    def test_normalize_alternative_field_names(self):
        from main import normalize_blocks
        raw = [{"block_id": "custom_1", "code": "y = 2", "description": "Sets y to 2"}]
        result = normalize_blocks(raw)
        assert result[0]["id"] == "custom_1"
        assert result[0]["code_snippet"] == "y = 2"
        assert result[0]["english_translation"] == "Sets y to 2"

    def test_normalize_auto_generates_ids(self):
        from main import normalize_blocks
        raw = [{"code_snippet": "a", "english_translation": "first"}, {"code_snippet": "b", "english_translation": "second"}]
        result = normalize_blocks(raw)
        assert result[0]["id"] == "block_1"
        assert result[1]["id"] == "block_2"

    def test_normalize_filters_empty_blocks(self):
        from main import normalize_blocks
        raw = [
            {"id": "b1", "code_snippet": "", "english_translation": ""},
            {"id": "b2", "code_snippet": "x", "english_translation": "desc"}
        ]
        result = normalize_blocks(raw)
        assert len(result) == 1
        assert result[0]["id"] == "b2"

    def test_normalize_raises_on_no_usable_blocks(self):
        from main import normalize_blocks
        import pytest
        with pytest.raises(ValueError, match="no usable"):
            normalize_blocks([{"id": "b1", "code_snippet": "", "english_translation": ""}])

    def test_normalize_raises_on_non_list(self):
        from main import normalize_blocks
        import pytest
        with pytest.raises(ValueError, match="Expected list"):
            normalize_blocks("not a list")

    def test_normalize_single_dict_wrapped(self):
        """A single dict without array wrapping should be auto-wrapped."""
        from main import normalize_blocks
        raw = {"id": "b1", "code_snippet": "x = 1", "english_translation": "Assigns 1"}
        result = normalize_blocks(raw)
        assert len(result) == 1


class TestSpecialCharacters:
    """Ensure code with special chars doesn't break the API."""

    def test_code_with_unicode(self, client):
        res = client.post("/api/code-to-english", json={
            "raw_code": "print('こんにちは世界')",
            "language": "python"
        })
        assert res.status_code == 200

    def test_code_with_newlines_and_tabs(self, client):
        res = client.post("/api/code-to-english", json={
            "raw_code": "def foo():\n\tpass\n\treturn None",
            "language": "python"
        })
        assert res.status_code == 200

    def test_code_with_html_like_content(self, client):
        res = client.post("/api/code-to-english", json={
            "raw_code": "html = '<div class=\"test\"><p>Hello</p></div>'",
            "language": "python"
        })
        assert res.status_code == 200
