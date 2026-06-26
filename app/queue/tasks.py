import asyncio
import logging
from app.queue.celery_config import celery_app
from app.core.quota import save_translation_background
from app.services.email import email_service
from app.core.database import supabase_request

logger = logging.getLogger("anuvaad")

def run_async(coro):
    """Helper to run async functions within synchronous Celery workers.

    Celery tasks run in non-main threads where asyncio.get_event_loop() is
    deprecated (Python 3.10+) and raises RuntimeError in Python 3.12+. Always
    create and close a fresh event loop per task invocation.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

@celery_app.task(name="tasks.save_translation_history")
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
    file_path=None
):
    """Offloads saving translation history and quota enforcement to Celery."""
    logger.info(f"Celery: Saving translation history for {user_email}")
    run_async(save_translation_background(
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
        file_path=file_path
    ))


@celery_app.task(name="tasks.send_transactional_email")
def send_transactional_email_task(email_type: str, user_email: str, **kwargs):
    """Offloads sending transactional emails to Celery."""
    logger.info(f"Celery: Sending {email_type} email to {user_email}")
    if email_type == "welcome":
        email_service.send_welcome(user_email)
    elif email_type == "milestone":
        email_service.send_translation_milestone(user_email, kwargs.get("count", 0))
    elif email_type == "subscription_upgrade":
        email_service.send_subscription_upgrade(user_email, kwargs.get("plan_name", "Pro"))


@celery_app.task(name="tasks.process_billing_webhook")
def process_billing_webhook_task(event_id: str, payload: dict):
    """
    Offload subscription updates to Celery.
    This guarantees delivery even if the API pod dies.
    """
    logger.info(f"Celery: Processing billing webhook {event_id}")

    async def _process():
        from app.core.database_session import AsyncSessionLocal
        from app.models.db_models import PaymentTransaction
        from sqlalchemy.exc import IntegrityError

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
                logger.info(f"✅ Razorpay subscription activated: {user_email} (sub: {subscription_id})")
                existing = await supabase_request(
                    "GET",
                    f"user_subscriptions?user_email=eq.{user_email}&select=user_email",
                )
                is_new = not existing
                # BUG#2b FIX: Upsert — PATCH if row exists, POST if new.
                # Always POSTing fails silently on UNIQUE constraint.
                if existing:
                    await supabase_request(
                        "PATCH",
                        f"user_subscriptions?user_email=eq.{user_email}",
                        {
                            "razorpay_subscription_id": subscription_id,
                            "is_pro": True,
                            "onboarded": False,
                        },
                    )
                else:
                    await supabase_request(
                        "POST",
                        "user_subscriptions",
                        {
                            "user_email": user_email,
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
            logger.info(f"🔄 Razorpay subscription charged: {user_email} (sub: {subscription_id})")
            if subscription_id:
                await supabase_request(
                    "PATCH",
                    f"user_subscriptions?razorpay_subscription_id=eq.{subscription_id}",
                    {"is_pro": True},
                )

        elif event_type in ("subscription.cancelled", "subscription.completed"):
            subscription = payload_data.get("subscription", {}).get("entity", {})
            subscription_id = subscription.get("id", "")
            notes = subscription.get("notes", {})
            user_email = notes.get("user_email", "")
            logger.info(f"❌ Razorpay subscription ended: {user_email} (sub: {subscription_id})")
            await supabase_request(
                "PATCH",
                f"user_subscriptions?razorpay_subscription_id=eq.{subscription_id}",
                {"is_pro": False},
            )

        elif event_type == "payment.failed":
            payment = payload_data.get("payment", {}).get("entity", {})
            customer_email = payment.get("email", "unknown")
            logger.warning(f"⚠ Razorpay payment failed: {customer_email}")
            if customer_email and customer_email != "unknown":
                await supabase_request(
                    "PATCH",
                    f"user_subscriptions?user_email=eq.{customer_email}",
                    {"is_pro": False},
                )

        else:
            logger.info(f"Razorpay webhook received: {event_type} (unhandled)")

    run_async(_process())


@celery_app.task(name="tasks.prune_translation_history")
def prune_translation_history_task(user_email: str):
    """Prune old translation history items for a user."""
    logger.info(f"Celery: Pruning translation history for {user_email}")
    async def _process():
        from app.core.database_session import AsyncSessionLocal
        from app.models.db_models import TranslationHistory
        from sqlalchemy import select, desc, delete

        async with AsyncSessionLocal() as session:
            stmt = select(TranslationHistory.id).where(TranslationHistory.user_email == user_email).order_by(desc(TranslationHistory.created_at))
            result = await session.execute(stmt)
            ids = [row[0] for row in result.all()]

            if len(ids) > 50:
                ids_to_delete = ids[50:]
                delete_stmt = delete(TranslationHistory).where(TranslationHistory.id.in_(ids_to_delete))
                await session.execute(delete_stmt)
                await session.commit()
                logger.info(f"Pruned {len(ids_to_delete)} old translation history items for {user_email}")

    run_async(_process())


@celery_app.task(name="tasks.process_large_file")
def process_large_file_task(file_content: str, user_email: str, language: str = "auto"):
    """Process large file translation in background.
    BUG#4 FIX: Replaced broken import of non-existent route_and_translate
    with correct stream_code_to_english.
    """
    logger.info(f"Celery: Processing large file for {user_email}")
    async def _process():
        from app.models.schemas import CodePayload
        from app.services.ai import stream_code_to_english
        payload = CodePayload(raw_code=file_content, language=language)
        try:
            async for _ in stream_code_to_english(
                payload=payload,
                email=user_email,
                is_pro=True,  # Large file processing is a Pro feature
                use_r1=False,
                tier="pro",
                deduct_credit_flag=False,
            ):
                pass  # Result is saved via save_translation_history_task inside the generator
            logger.info(f"Celery: Large file processed successfully for {user_email}")
        except Exception as e:
            logger.error(f"Celery: Failed to process large file for {user_email}: {e}")

    run_async(_process())

@celery_app.task(name="tasks.process_github_repo")
def process_github_repo_task(repo_name: str, installation_id: str = None):
    """Background pipeline for GitHub repo embeddings.

    Arch#2.7: Implemented real GitHub API integration.
    """
    logger.info(f"Celery: process_github_repo_task called for {repo_name}")
    
    async def _process():
        from app.core.database_session import AsyncSessionLocal
        from app.services.github import fetch_repository_files
        from app.services.embedding import generate_embeddings_hf, chunk_text
        from app.repositories.vectors import insert_repo_embeddings

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
                chunks_data.append({
                    "file_path": file["path"],
                    "chunk_index": i,
                    "content": chunk,
                })
        
        if not chunks_data:
            logger.warning(f"No chunks generated for {repo_name}")
            return
            
        logger.info(f"Generated {len(chunks_data)} chunks. Generating embeddings...")
        
        # We should chunk the embeddings request in case there are thousands of chunks
        BATCH_SIZE = 100
        for i in range(0, len(chunks_data), BATCH_SIZE):
            batch = chunks_data[i:i+BATCH_SIZE]
            texts = [c["content"] for c in batch]
            
            try:
                embeddings = await generate_embeddings_hf(texts)
                for j, emb in enumerate(embeddings):
                    if j < len(batch) and isinstance(emb, list):
                        batch[j]["embedding"] = emb
                    elif j < len(batch):
                         # Fallback if the embedding is somehow malformed
                         batch[j]["embedding"] = [0.0] * 384
                        
                # Insert into DB
                async with AsyncSessionLocal() as session:
                    await insert_repo_embeddings(session, repo_name, batch)
            except Exception as e:
                logger.error(f"Error processing batch {i} for {repo_name}: {e}")

    run_async(_process())

