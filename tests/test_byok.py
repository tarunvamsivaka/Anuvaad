from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.schemas import CodePayload
from app.services.ai import stream_code_to_english


@pytest.mark.asyncio
async def test_byok_key_redaction_and_injection():
    raw_code = "def hello(): pass"
    payload = CodePayload(raw_code=raw_code, language="python")
    test_key = "testmockbyokkey123456789"

    # Verify that stream_code_to_english accepts user_llm_key without crashing
    # We mock _build_streaming_providers and AsyncOpenAI to avoid real network calls
    with (
        patch("app.services.ai.logger") as mock_logger,
        patch("app.services.ai.AsyncOpenAI") as mock_openai,
        patch("app.services.ai._inject_symbol_contract", new_callable=AsyncMock) as mock_sym,
    ):
        mock_sym.return_value = "System Instruction"
        mock_client = MagicMock()
        mock_openai.return_value = mock_client

        # Fake streaming completion
        mock_stream = AsyncMock()

        async def mock_chunks():
            yield '{"chunk": "test", "done": false}'

        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream)

        # Run stream generator
        gen = stream_code_to_english(
            payload=payload,
            email=None,
            is_pro=False,
            use_r1=False,
            tier="free",
            deduct_credit_flag=True,
            ephemeral=True,
            user_llm_key=test_key,
        )

        # Iterate once to trigger provider initialization and logging
        try:
            async for _ in gen:
                break
        except Exception:
            pass

        # Verify logger.info was called with redacted key (never the full raw key)
        found_redacted = False
        for call_args in mock_logger.info.call_args_list:
            msg = str(call_args)
            if "test...6789" in msg or "testmock" in msg:
                found_redacted = True
                assert test_key not in msg, "Full raw API key was leaked in log message!"

        assert found_redacted, "Expected logger.info to log redacted BYOK key!"
