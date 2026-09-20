import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from uuid import UUID

from app.core.quota import save_translation_background
from app.queue.celery_config import celery_app
from app.services.email import email_service

logger = logging.getLogger("anuvaad")


def run_async(coro):
    """Helper to run async functions within synchronous Celery workers or tests.

    Celery tasks run in non-main threads where asyncio.get_event_loop() is
    deprecated (Python 3.10+) and raises RuntimeError in Python 3.12+.
    If called from a thread with an active event loop (e.g. pytest-asyncio),
    delegates execution to a worker thread with its own loop to prevent
    RuntimeError: Cannot run the event loop while another loop is running.
    """
    try:
        running_loop = asyncio.get_running_loop()
    except RuntimeError:
        running_loop = None

    if running_loop and running_loop.is_running():
        with ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(lambda: asyncio.run(coro)).result()

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


_active_in_process_tasks: set[asyncio.Task] = set()


def get_active_tasks_count() -> int:
    """Return the number of currently executing in-process background tasks."""
    return len(_active_in_process_tasks)


def _register_active_task(task: asyncio.Task, name: str = "task") -> None:
    """Register an active task with tracking and exception logging callbacks."""
    task._task_name = name
    _active_in_process_tasks.add(task)

    def _done_callback(t: asyncio.Task) -> None:
        _active_in_process_tasks.discard(t)
        if not t.cancelled():
            exc = t.exception()
            if exc:
                task_name = getattr(t, "_task_name", name)
                logger.error(
                    f"In-process background task '{task_name}' raised an unhandled error: {exc}",
                    exc_info=exc,
                )

    task.add_done_callback(_done_callback)


async def drain_background_tasks(timeout: float = 10.0) -> dict[str, int]:
    """Wait for all in-flight in-process background tasks to complete before process shutdown.

    Ensures that background jobs (e.g. translation history persistence, webhooks)
    are not abruptly killed during rolling deployments or container restarts.
    If tasks remain unfinished when `timeout` is reached, logs an audit warning and
    allows shutdown to proceed without deadlock.
    """
    if not _active_in_process_tasks:
        return {"drained": 0, "timed_out": 0}

    pending = set(_active_in_process_tasks)
    total = len(pending)
    logger.info(f"Draining {total} active in-process background task(s) before shutdown (timeout={timeout}s)...")

    done, still_pending = await asyncio.wait(pending, timeout=timeout)

    if still_pending:
        unfinished_names = [getattr(t, "_task_name", t.get_name()) for t in still_pending]
        logger.warning(
            f"[SHUTDOWN TIMEOUT] {len(still_pending)} background task(s) did not complete "
            f"within {timeout}s: {unfinished_names}"
        )
    else:
        logger.info(f"Successfully drained {len(done)} in-process background task(s).")

    return {"drained": len(done), "timed_out": len(still_pending)}


class HybridTask:
    """Wrapper around a Celery task that supports in-process background execution

    when USE_CELERY=False (the default zero-budget mode), while preserving standard
    Celery broker dispatch when USE_CELERY=True. Preserves .delay() and .apply_async()
    signatures so existing caller code and test fixtures (e.g. mock_celery_tasks)
    continue to work with zero regressions.
    """

    def __init__(self, celery_task, async_fn=None):
        self._celery_task = celery_task
        self._async_fn = async_fn
        self.__name__ = getattr(celery_task, "__name__", "task")
        self.__doc__ = getattr(celery_task, "__doc__", "")
        self.__module__ = getattr(celery_task, "__module__", __name__)
        self.name = getattr(celery_task, "name", self.__name__)

    def __call__(self, *args, **kwargs):
        return self._celery_task(*args, **kwargs)

    def delay(self, *args, **kwargs):
        from app.core.config import USE_CELERY

        if USE_CELERY:
            return self._celery_task.delay(*args, **kwargs)
        return self._dispatch_in_process(*args, **kwargs)

    def apply_async(self, args=None, kwargs=None, **options):
        from app.core.config import USE_CELERY

        if USE_CELERY:
            return self._celery_task.apply_async(args=args, kwargs=kwargs, **options)
        args = args or ()
        kwargs = kwargs or {}
        return self._dispatch_in_process(*args, **kwargs)

    def _dispatch_in_process(self, *args, **kwargs):
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                if self._async_fn:
                    task = loop.create_task(self._async_fn(*args, **kwargs))
                else:
                    task = loop.create_task(asyncio.to_thread(self._celery_task, *args, **kwargs))
                _register_active_task(task, name=self.name)
                return task
        except RuntimeError:
            pass

        with ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(lambda: self._celery_task(*args, **kwargs))


@celery_app.task(
    name="tasks.save_translation_history",
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=30,
    retry_backoff=True,
    retry_jitter=True,
)
def save_translation_history_task(
    user_email,
    mode,
    source_language,
    target_language,
    input_text,
    blocks,
    model_used,
    workspace_id=None,
    session_id=None,
    repository_name=None,
    file_path=None,
):
    """Offloads saving translation history and quota enforcement to Celery."""
    logger.info(f"Celery: Saving translation history for {user_email}")
    run_async(
        save_translation_background(
            user_email=user_email,
            mode=mode,
            source_language=source_language,
            target_language=target_language,
            input_text=input_text,
            blocks=blocks,
            model_used=model_used,
            workspace_id=workspace_id,
            session_id=session_id,
            repository_name=repository_name,
            file_path=file_path,
        )
    )


save_translation_history_task = HybridTask(
    save_translation_history_task,
    async_fn=save_translation_background,
)


@celery_app.task(
    name="tasks.send_transactional_email",
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
    retry_jitter=True,
)
def send_transactional_email_task(email_type: str, user_email: str, **kwargs):
    """Offloads sending transactional emails to Celery."""
    logger.info(f"Celery: Sending {email_type} email to {user_email}")
    if email_type == "welcome":
        email_service.send_welcome(user_email)
    elif email_type == "milestone":
        email_service.send_translation_milestone(user_email, kwargs.get("count", 0))
    elif email_type == "subscription_upgrade":
        email_service.send_subscription_upgrade(user_email, kwargs.get("plan_name", "Pro"))


send_transactional_email_task = HybridTask(send_transactional_email_task)


@celery_app.task(
    name="tasks.process_billing_webhook",
    autoretry_for=(Exception,),
    max_retries=5,
    default_retry_delay=30,
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
)
def process_billing_webhook_task(event_id: str, payload: dict):
    """
    Offload subscription updates to Celery.
    This guarantees delivery even if the API pod dies.
    """
    logger.info(f"Celery: Processing billing webhook {event_id}")

    from sqlalchemy.exc import IntegrityError

    from app.core.database_session import AsyncSessionLocal
    from app.models.db_models import PaymentTransaction
    from app.repositories import subscription as subscription_repo  # H-04

    async def _process():

        async with AsyncSessionLocal() as session:
            try:
                txn = PaymentTransaction(event_id=event_id, payload=payload)
                session.add(txn)
                await session.commit()
            except IntegrityError:
                await session.rollback()
                logger.info(f"Webhook {event_id} already processed. Ignoring.")
                return

        event_type = payload.get("event", "")
        payload_data = payload.get("payload", {})

        if event_type == "subscription.activated":
            subscription = payload_data.get("subscription", {}).get("entity", {})
            notes = subscription.get("notes", {})
            user_email = notes.get("user_email", "")
            subscription_id = subscription.get("id", "")
            if user_email:
                logger.info(f"Razorpay subscription activated: {user_email} (sub: {subscription_id})")
                # H-04: ORM upsert replaces supabase_request GET + conditional PATCH/POST
                existing = await subscription_repo.get_subscription(user_email)
                is_new = not existing
                # H-04: single upsert_subscription() replaces the GET + conditional PATCH/POST
                await subscription_repo.upsert_subscription(
                    user_email,
                    {
                        "razorpay_subscription_id": subscription_id,
                        "is_pro": True,
                        "onboarded": False,
                    },
                )
                if is_new:
                    email_service.send_welcome(user_email)
                email_service.send_subscription_upgrade(user_email, "Pro")

        elif event_type == "subscription.charged":
            subscription = payload_data.get("subscription", {}).get("entity", {})
            subscription_id = subscription.get("id", "")
            notes = subscription.get("notes", {})
            user_email = notes.get("user_email", "")
            logger.info(f"Razorpay subscription charged: {user_email} (sub: {subscription_id})")
            if subscription_id:
                # H-04: update_by_razorpay_id() replaces raw PATCH by razorpay_subscription_id
                await subscription_repo.update_by_razorpay_id(subscription_id, {"is_pro": True})

        elif event_type in ("subscription.cancelled", "subscription.completed"):
            subscription = payload_data.get("subscription", {}).get("entity", {})
            subscription_id = subscription.get("id", "")
            notes = subscription.get("notes", {})
            user_email = notes.get("user_email", "")
            logger.info(f"Razorpay subscription ended: {user_email} (sub: {subscription_id})")
            await subscription_repo.update_by_razorpay_id(subscription_id, {"is_pro": False})

        elif event_type == "payment.failed":
            payment = payload_data.get("payment", {}).get("entity", {})
            customer_email = payment.get("email", "unknown")
            logger.warning(f"Razorpay payment failed: {customer_email}")
            if customer_email and customer_email != "unknown":
                await subscription_repo.upsert_subscription(customer_email, {"is_pro": False})

        else:
            logger.info(f"Razorpay webhook received: {event_type} (unhandled)")

    run_async(_process())


process_billing_webhook_task = HybridTask(process_billing_webhook_task)


@celery_app.task(
    name="tasks.prune_translation_history",
    autoretry_for=(Exception,),
    max_retries=2,
    default_retry_delay=120,
)
def prune_translation_history_task(user_email: str):
    """Prune old translation history items for a single user (immediate, on-demand).

    NOTE: This task handles per-user immediate pruning when a new translation
    is saved. The nightly scheduled prune_old_translation_history_scheduled()
    task handles bulk cleanup for all users. Both coexist intentionally.

    AUDIT-FIX-02: Replaced magic number 50 with HISTORY_LIMIT_FREE constant.
    """
    logger.info(f"Celery: Pruning translation history for {user_email}")
    from sqlalchemy import delete, desc, select

    from app.core.config import HISTORY_LIMIT_FREE
    from app.core.database_session import AsyncSessionLocal
    from app.models.db_models import TranslationHistory

    async def _process():

        async with AsyncSessionLocal() as session:
            stmt = (
                select(TranslationHistory.id)
                .where(TranslationHistory.user_email == user_email)
                .order_by(desc(TranslationHistory.created_at))
            )
            result = await session.execute(stmt)
            ids = [row[0] for row in result.all()]

            if len(ids) > HISTORY_LIMIT_FREE:
                ids_to_delete = ids[HISTORY_LIMIT_FREE:]
                delete_stmt = delete(TranslationHistory).where(TranslationHistory.id.in_(ids_to_delete))
                await session.execute(delete_stmt)
                await session.commit()
                logger.info(f"Pruned {len(ids_to_delete)} old translation history items for {user_email}")

    run_async(_process())


prune_translation_history_task = HybridTask(prune_translation_history_task)


@celery_app.task(
    name="tasks.process_large_file",
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def process_large_file_task(
    file_content: str,
    user_email: str,
    language: str = "auto",
    is_pro: bool = False,  # FIX-05 (P0-06): Must be passed by caller; never hardcoded.
    tier: str = "free",
):
    """Process large file translation in background.

    FIX-05 (P0-06): is_pro is now a task parameter, passed from the enqueuing
    route handler based on the user's ACTUAL subscription status retrieved from
    the DB/cache.  The old hardcoded `is_pro=True` gave every user Pro-tier
    model access for large files — a fraud vector.

    FIX-10 (P1-08): Added autoretry with exponential backoff.
    """
    logger.info(f"Celery: Processing large file for {user_email} (is_pro={is_pro})")
    from app.models.schemas import CodePayload
    from app.services.ai import stream_code_to_english

    async def _process():
        payload = CodePayload(raw_code=file_content, language=language)
        try:
            async for _ in stream_code_to_english(
                payload=payload,
                email=user_email,
                is_pro=is_pro,  # use caller-supplied value, NOT hardcoded True
                use_r1=False,
                tier=tier,
                deduct_credit_flag=False,
            ):
                pass  # Result is saved via save_translation_history_task inside the generator
            logger.info(f"Celery: Large file processed successfully for {user_email}")
        except Exception as e:
            logger.error(f"Celery: Failed to process large file for {user_email}: {e}")
            raise  # re-raise so autoretry_for can catch it

    run_async(_process())


process_large_file_task = HybridTask(process_large_file_task)


@celery_app.task(
    name="tasks.process_github_repo",
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=300,
    retry_backoff=True,
)
def process_github_repo_task(repo_name: str, installation_id: str = None, user_email: str = None):
    """Background pipeline for GitHub repo embeddings.

    Arch#2.7: Implemented real GitHub API integration.
    SEC-REPO-03: Tracks user_email to populate indexed_by column.
    """
    logger.info(f"Celery: process_github_repo_task called for {repo_name} (user: {user_email})")
    import os

    from app.core.database_session import AsyncSessionLocal
    from app.repositories.vectors import insert_repo_embeddings
    from app.services.embedding import (
        chunk_text,
        generate_embeddings_hf,
        generate_embeddings_openai,
        pad_embedding_to_1536,
    )
    from app.services.github import fetch_repository_files

    async def _process():
        # 1. Fetch files from GitHub
        files = fetch_repository_files(repo_name)
        if not files:
            logger.warning(f"No files found or fetched for {repo_name}")
            return

        logger.info(f"Chunking {len(files)} files for {repo_name}")
        chunks_data = []
        for file in files:
            chunks = chunk_text(file["content"], chunk_size=1500, overlap=200)
            for i, chunk in enumerate(chunks):
                chunks_data.append(
                    {
                        "file_path": file["path"],
                        "chunk_index": i,
                        "content": chunk,
                    }
                )

        if not chunks_data:
            logger.warning(f"No chunks generated for {repo_name}")
            return

        logger.info(f"Generated {len(chunks_data)} chunks. Generating embeddings...")

        openai_key = os.environ.get("OPENAI_API_KEY")
        provider = "openai" if openai_key else "hf"
        embedding_dim = 1536

        # We should chunk the embeddings request in case there are thousands of chunks
        BATCH_SIZE = 100
        for i in range(0, len(chunks_data), BATCH_SIZE):
            batch = chunks_data[i : i + BATCH_SIZE]
            texts = [c["content"] for c in batch]

            try:
                if provider == "openai":
                    embeddings = await generate_embeddings_openai(texts)
                else:
                    embeddings = await generate_embeddings_hf(texts)

                for j, emb in enumerate(embeddings):
                    if j < len(batch) and emb is not None:
                        batch[j]["embedding"] = pad_embedding_to_1536(emb)
                        batch[j]["provider"] = provider
                    elif j < len(batch):
                        # Fallback if the embedding is somehow malformed
                        batch[j]["embedding"] = [0.0] * embedding_dim

                # Insert into DB
                async with AsyncSessionLocal() as session:
                    await insert_repo_embeddings(session, repo_name, batch, indexed_by=user_email)
            except Exception as e:
                logger.error(f"Error processing batch {i} for {repo_name}: {e}")

    run_async(_process())


process_github_repo_task = HybridTask(process_github_repo_task)


@celery_app.task(
    name="tasks.run_repository_indexing",
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
    retry_jitter=True,
)
def run_repository_indexing_task(workspace_id: str, import_id: str, desired_state_id: str):
    """Run the workspace-owned Phase 3 ingestion pipeline, never RepoEmbedding."""
    from app.core.database_session import AsyncSessionLocal
    from app.services.indexing.pipeline import RepositoryIndexingPipeline

    async def _process():
        async with AsyncSessionLocal() as session:
            return await RepositoryIndexingPipeline(session).run(
                UUID(workspace_id), UUID(import_id), UUID(desired_state_id)
            )

    return run_async(_process())


# ── FIX-11 (P1-04): Celery Beat scheduled tasks ──────────────────────────────


@celery_app.task(name="reset_daily_stats")
def reset_daily_stats():
    """Reset today_count for ALL users at midnight UTC.

    Scheduled by Celery Beat via celery_config.py beat_schedule.
    """
    logger.info("Celery Beat: Resetting daily translation stats for all users")

    from sqlalchemy import update as sa_update

    from app.core.database_session import AsyncSessionLocal
    from app.models.db_models import UserTranslationStats

    async def _reset():

        async with AsyncSessionLocal() as session:
            await session.execute(sa_update(UserTranslationStats).values(today_count=0))
            await session.commit()
        logger.info("Celery Beat: Daily stats reset complete")

    run_async(_reset())


@celery_app.task(name="reset_weekly_stats")
def reset_weekly_stats():
    """Reset this_week_count for ALL users every Monday at midnight UTC."""
    logger.info("Celery Beat: Resetting weekly translation stats for all users")

    from sqlalchemy import update as sa_update

    from app.core.database_session import AsyncSessionLocal
    from app.models.db_models import UserTranslationStats

    async def _reset():

        async with AsyncSessionLocal() as session:
            await session.execute(sa_update(UserTranslationStats).values(this_week_count=0))
            await session.commit()
        logger.info("Celery Beat: Weekly stats reset complete")

    run_async(_reset())


@celery_app.task(name="prune_old_translation_history")
def prune_old_translation_history_scheduled():
    """Prune old history entries for ALL users that exceed their tier limits.

    Runs daily at 2am UTC. Free users: keep 100. Pro users: keep 1000.

    FIX-H/Q (PERF-02, Phase 5): Replaced O(n) per-user subquery loop with
    two bulk SQL DELETE statements using ROW_NUMBER() window functions.
    This cuts DB round-trips from 2*N to exactly 2 regardless of user count.
    """
    logger.info("Celery Beat: Running daily history pruning for all users")

    from sqlalchemy import text as sa_text

    from app.core.config import HISTORY_LIMIT_FREE, HISTORY_LIMIT_PRO
    from app.core.database_session import AsyncSessionLocal

    async def _prune():
        async with AsyncSessionLocal() as session:
            # Single bulk DELETE for FREE users exceeding their limit.
            # Uses ROW_NUMBER() window function to rank each user's history newest-first,
            # then deletes all rows ranked beyond :free_limit in one statement.
            # AUDIT-FIX-03: Replaced f-string interpolation with :bindparam syntax
            # for clarity and safety, even though the values come from config.
            await session.execute(
                sa_text("""
                    DELETE FROM translation_history
                    WHERE id IN (
                        SELECT id FROM (
                            SELECT id,
                                   ROW_NUMBER() OVER (
                                       PARTITION BY user_email
                                       ORDER BY created_at DESC
                                   ) AS rn
                            FROM translation_history
                            WHERE user_email NOT IN (
                                SELECT user_email FROM user_subscriptions WHERE is_pro = TRUE
                            )
                        ) ranked
                        WHERE rn > :free_limit
                    )
                """),
                {"free_limit": HISTORY_LIMIT_FREE},
            )

            # Single bulk DELETE for PRO users exceeding their (larger) limit.
            await session.execute(
                sa_text("""
                    DELETE FROM translation_history
                    WHERE id IN (
                        SELECT id FROM (
                            SELECT id,
                                   ROW_NUMBER() OVER (
                                       PARTITION BY user_email
                                       ORDER BY created_at DESC
                                   ) AS rn
                            FROM translation_history
                            WHERE user_email IN (
                                SELECT user_email FROM user_subscriptions WHERE is_pro = TRUE
                            )
                        ) ranked
                        WHERE rn > :pro_limit
                    )
                """),
                {"pro_limit": HISTORY_LIMIT_PRO},
            )

            await session.commit()
        logger.info("Celery Beat: Daily history pruning complete")

    run_async(_prune())


async def prune_database_footprint_async():
    """Daily database footprint cleanup: prune anonymous history (7d) and stale vectors (30d)."""
    from app.core.database_session import AsyncSessionLocal
    from app.repositories.translation import prune_anonymous_history
    from app.repositories.vectors import prune_stale_vectors

    async with AsyncSessionLocal() as session:
        deleted_history = await prune_anonymous_history(session, 7)
        deleted_vectors = await prune_stale_vectors(session, 30)

        # Defragment and optimize IVFFlat centroid indexes on PostgreSQL
        bind = getattr(session, "bind", None)
        if bind is None and hasattr(session, "get_bind"):
            bind_res = session.get_bind()
            if not hasattr(bind_res, "__await__"):
                bind = bind_res

        if bind is not None and getattr(getattr(bind, "dialect", None), "name", None) == "postgresql":
            from sqlalchemy import text as sa_text

            try:
                await session.execute(sa_text("REINDEX INDEX CONCURRENTLY ix_semantic_artifacts_embedding_ivfflat;"))
                await session.execute(sa_text("REINDEX INDEX CONCURRENTLY ix_repo_embeddings_embedding_ivfflat;"))
                await session.execute(sa_text("REINDEX INDEX CONCURRENTLY ix_llm_semantic_cache_embedding_ivfflat;"))
                logger.info("Successfully reindexed IVFFlat vector centroid indexes.")
            except Exception as reindex_err:
                logger.warning(f"IVFFlat reindexing skipped or deferred: {reindex_err}")

        # Capture persistent telemetry checkpoint across scheduled maintenance cycles
        try:
            from app.core.metrics import metrics

            await metrics.record_telemetry_checkpoint()
        except Exception as tel_err:
            logger.warning(f"Failed to record telemetry checkpoint: {tel_err}")

        logger.info(
            f"Database footprint cleanup complete. Deleted {deleted_history} anonymous history records and {deleted_vectors} stale vector cache records."
        )
        return {"deleted_history": deleted_history, "deleted_vectors": deleted_vectors}


@celery_app.task(name="prune_database_footprint")
def prune_database_footprint():
    """Daily database footprint cleanup task.

    Executes prune_anonymous_history(7) and prune_stale_vectors(30).
    Scheduled by Celery Beat to run daily at 3am UTC.
    """
    logger.info("Running daily database footprint cleanup")
    return run_async(prune_database_footprint_async())


prune_database_footprint = HybridTask(
    prune_database_footprint,
    async_fn=prune_database_footprint_async,
)
