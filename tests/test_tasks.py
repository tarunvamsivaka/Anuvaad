import asyncio

import pytest

from app.queue.tasks import run_async


async def sample_coroutine(x):
    await asyncio.sleep(0.01)
    return x * 2

async def failing_coroutine():
    await asyncio.sleep(0.01)
    raise ValueError("Test error")


def test_run_async_no_running_loop():
    """Test run_async when there is no running event loop in the current thread."""
    # Ensure there is no running loop in this synchronous test
    with pytest.raises(RuntimeError):
        asyncio.get_running_loop()

    result = run_async(sample_coroutine(5))
    assert result == 10

def test_run_async_no_running_loop_exception():
    """Test run_async propagates exceptions correctly when there is no running loop."""
    with pytest.raises(ValueError, match="Test error"):
        run_async(failing_coroutine())

@pytest.mark.asyncio
async def test_run_async_with_running_loop():
    """Test run_async when there IS a running event loop (like inside a pytest-asyncio test)."""
    # Verify we actually have a running loop in this context
    loop = asyncio.get_running_loop()
    assert loop.is_running()

    result = run_async(sample_coroutine(10))
    assert result == 20

@pytest.mark.asyncio
async def test_run_async_with_running_loop_exception():
    """Test run_async propagates exceptions when there IS a running event loop."""
    with pytest.raises(ValueError, match="Test error"):
        run_async(failing_coroutine())

def test_run_async_loop_closed():
    """Test run_async handles a loop that exists but is not running."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        # Loop is created but not running
        assert not loop.is_running()

        # In python <3.12 get_running_loop() might raise RuntimeError if no loop is running,
        # or it might return the current loop if set but not running (actually get_event_loop does that, get_running_loop always raises if not running)
        result = run_async(sample_coroutine(15))
        assert result == 30
    finally:
        loop.close()
        asyncio.set_event_loop(None)
