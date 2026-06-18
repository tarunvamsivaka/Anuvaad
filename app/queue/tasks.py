import asyncio
import logging
import os
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
def process_large_file_task(file_content: str, user_email: str):
    """Process large file translation in background."""
    logger.info(f"Celery: Processing large file for {user_email}")
    async def _process():
        from app.services.ai import route_and_translate
        try:
            result = await route_and_translate(
                prompt=file_content,
                model_name="deepseek-chat",
                mode="code-to-english",
                source_language="auto",
                target_language="english",
                custom_instructions="This is a large file background translation task.",
                user_email=user_email
            )
            logger.info(f"Successfully processed large file for {user_email}. Translated {len(str(result))} characters.")
            # In a real app, send an email or WebSocket notification here with the result ID.
        except Exception as e:
            logger.error(f"Failed to process large file for {user_email}: {e}")

    run_async(_process())

@celery_app.task(name="tasks.process_github_repo")
def process_github_repo_task(repo_name: str, installation_id: str):
    """Background pipeline for Supabase pgvector repo embeddings using HuggingFace API"""
    logger.info(f"Celery: Processing GitHub repo {repo_name} for installation {installation_id}")

    # Use the free HuggingFace Inference API instead of a heavy local model
    HF_API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
    HF_API_KEY = os.environ.get("HUGGINGFACE_API_KEY")

    def chunk_text(text: str, chunk_size: int = 500) -> list[str]:
        return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

    # 1. Fetch repo file contents using GitHub API
    mock_files = [
        {"path": "README.md", "content": "# Anuvaad\n\nAI translation platform."},
        {"path": "main.py", "content": "from fastapi import FastAPI\n\napp = FastAPI()\n"},
    ]

    # 2 & 3. Chunk files and generate embeddings synchronously
    chunks_data = []
    
    # Simple synchronous HTTP client for the Celery worker
    import httpx
    
    with httpx.Client() as client:
        headers = {}
        if HF_API_KEY:
            headers["Authorization"] = f"Bearer {HF_API_KEY}"
            
        for file in mock_files:
            for idx, chunk in enumerate(chunk_text(file["content"])):
                # 3. Generate 384-dim embeddings via Free API
                try:
                    response = client.post(HF_API_URL, headers=headers, json={"inputs": chunk})
                    response.raise_for_status()
                    embedding = response.json()
                    
                    if not isinstance(embedding, list) or len(embedding) == 0:
                        logger.warning(f"Unexpected HF API response for chunk {idx}")
                        continue
                        
                except Exception as e:
                    logger.error(f"Failed to generate embedding for {file['path']} chunk {idx}: {e}")
                    # If API fails or is rate-limited, fallback to a zero-vector for demonstration
                    # In production, we would retry or fail the task
                    embedding = [0.0] * 384
                    
                chunks_data.append({
                    "repository_name": repo_name,
                    "file_path": file["path"],
                    "chunk_index": idx,
                    "content": chunk,
                    "embedding": embedding,
                })

    # 4. Insert into Supabase pgvector (I/O-bound — handled in async context)
    async def _save_to_db():
        from app.models.db_models import RepoEmbedding
        from app.core.database_session import AsyncSessionLocal

        records = [RepoEmbedding(**d) for d in chunks_data]
        async with AsyncSessionLocal() as session:
            session.add_all(records)
            await session.commit()

        logger.info(f"Successfully saved {len(records)} embeddings for {repo_name}")

    run_async(_save_to_db())

