import os
from celery import Celery

REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")
REDIS_URL = os.getenv("REDIS_URL", f"redis://:{REDIS_PASSWORD}@localhost:6379" if REDIS_PASSWORD else "redis://localhost:6379")

celery_app = Celery(
    "anuvaad_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.queue.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True
)
