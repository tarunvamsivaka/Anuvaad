import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.queue.tasks import HybridTask

client = TestClient(app)


class TestHybridTaskExecution:
    @pytest.mark.asyncio
    async def test_hybrid_task_in_process_execution(self):
        """Verify HybridTask runs in-process when USE_CELERY is False."""
        called_args = []

        async def dummy_async_fn(*args, **kwargs):
            called_args.append((args, kwargs))
            return "done"

        def dummy_sync_fn(*args, **kwargs):
            return "sync_done"

        task = HybridTask(dummy_sync_fn, async_fn=dummy_async_fn)

        with patch("app.core.config.USE_CELERY", False):
            # Direct call executes sync task
            assert task("direct_arg") == "sync_done"

            # .delay() schedules async_fn when event loop is running
            task_future = task.delay("delay_arg", key="value")
            if asyncio.iscoroutine(task_future) or isinstance(task_future, asyncio.Task):
                await task_future
            assert len(called_args) == 1
            assert called_args[0][0] == ("delay_arg",)
            assert called_args[0][1] == {"key": "value"}

    def test_hybrid_task_attributes_preserved(self):
        """Verify task attributes are preserved for Celery / inspect compatibility."""

        def sample_task():
            """Sample docstring."""
            pass

        hybrid = HybridTask(sample_task)
        assert hybrid.__name__ == "sample_task"
        assert hybrid.__doc__ == "Sample docstring."
        assert hasattr(hybrid, "delay")
        assert hasattr(hybrid, "apply_async")


class TestCronPruneEndpoint:
    def test_cron_prune_unauthorized_when_secret_set(self):
        """Verify /api/v1/cron/prune requires valid CRON_SECRET when configured."""
        with patch("app.core.config.CRON_SECRET", "super-secret-cron-token"):
            # No token provided
            res = client.post("/api/v1/cron/prune")
            assert res.status_code == 401
            assert res.json()["detail"] == "Invalid or missing cron secret"

            # Invalid token provided
            res = client.post("/api/v1/cron/prune", headers={"Authorization": "Bearer wrong-token"})
            assert res.status_code == 401
            assert res.json()["detail"] == "Invalid or missing cron secret"

    @patch("app.queue.tasks.prune_database_footprint_async", new_callable=AsyncMock)
    def test_cron_prune_success_with_bearer_token(self, mock_prune):
        """Verify /api/v1/cron/prune executes prune_database_footprint_async when token matches."""
        mock_prune.return_value = {"deleted_history": 12, "deleted_vectors": 5}

        with patch("app.core.config.CRON_SECRET", "valid-secret-123"):
            res = client.post("/api/v1/cron/prune", headers={"Authorization": "Bearer valid-secret-123"})
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert data["details"]["deleted_history"] == 12
            assert data["details"]["deleted_vectors"] == 5
            mock_prune.assert_awaited_once()

    @patch("app.queue.tasks.prune_database_footprint_async", new_callable=AsyncMock)
    def test_cron_prune_success_with_header(self, mock_prune):
        """Verify /api/v1/cron/prune works with X-Cron-Secret header."""
        mock_prune.return_value = {"deleted_history": 0, "deleted_vectors": 0}

        with patch("app.core.config.CRON_SECRET", "valid-secret-123"):
            res = client.post("/api/v1/cron/prune", headers={"X-Cron-Secret": "valid-secret-123"})
            assert res.status_code == 200
            assert res.json()["success"] is True
            mock_prune.assert_awaited_once()


class TestBackgroundTaskDrainAndTracking:
    @pytest.mark.asyncio
    async def test_active_task_registration_and_cleanup(self):
        """Verify in-process tasks are registered in active set and removed on completion."""
        from app.queue.tasks import _active_in_process_tasks, drain_background_tasks

        # Clean slate
        await drain_background_tasks(timeout=1.0)
        assert len(_active_in_process_tasks) == 0

        async def quick_task():
            await asyncio.sleep(0.05)
            return "ok"

        task = HybridTask(lambda: None, async_fn=quick_task)
        with patch("app.core.config.USE_CELERY", False):
            t = task.delay()
            assert t in _active_in_process_tasks
            await t
            # Check cleanup after event loop turn
            await asyncio.sleep(0.01)
            assert t not in _active_in_process_tasks

    @pytest.mark.asyncio
    async def test_drain_background_tasks_successful(self):
        """Verify drain_background_tasks awaits all active tasks cleanly."""
        from app.queue.tasks import drain_background_tasks

        async def worker(n):
            await asyncio.sleep(0.05)
            return n

        task = HybridTask(lambda: None, async_fn=worker)
        with patch("app.core.config.USE_CELERY", False):
            task.delay(1)
            task.delay(2)
            result = await drain_background_tasks(timeout=2.0)
            assert result["drained"] == 2
            assert result["timed_out"] == 0

    @pytest.mark.asyncio
    async def test_drain_background_tasks_timeout_graceful(self):
        """Verify drain_background_tasks logs audit warning on timeout without deadlocking."""
        from app.queue.tasks import _active_in_process_tasks, drain_background_tasks

        async def hanging_task():
            await asyncio.sleep(10.0)

        task = HybridTask(lambda: None, async_fn=hanging_task)
        with patch("app.core.config.USE_CELERY", False):
            t = task.delay()
            assert t in _active_in_process_tasks
            result = await drain_background_tasks(timeout=0.05)
            assert result["timed_out"] == 1
            # Cleanup hanging task
            t.cancel()
            try:
                await t
            except asyncio.CancelledError:
                pass
            _active_in_process_tasks.discard(t)

    @pytest.mark.asyncio
    async def test_task_exception_callback_logged_safely(self, caplog):
        """Verify tasks raising exceptions are logged and discarded without crashing."""
        from app.queue.tasks import _active_in_process_tasks

        async def failing_task():
            raise ValueError("Intentional background failure")

        task = HybridTask(lambda: None, async_fn=failing_task)
        with patch("app.core.config.USE_CELERY", False):
            with caplog.at_level("ERROR"):
                t = task.delay()
                try:
                    await t
                except ValueError:
                    pass
                await asyncio.sleep(0.01)
                assert t not in _active_in_process_tasks
                assert any("Intentional background failure" in record.message for record in caplog.records)
