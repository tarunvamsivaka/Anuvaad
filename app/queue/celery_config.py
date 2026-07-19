import os
import ssl

from celery import Celery

REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")
REDIS_URL = os.getenv("REDIS_URL", f"redis://:{REDIS_PASSWORD}@localhost:6379" if REDIS_PASSWORD else "redis://localhost:6379")

celery_app = Celery(
    "anuvaad_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.queue.tasks"]
)

if REDIS_URL.startswith("rediss://"):
    celery_app.conf.broker_use_ssl = {"ssl_cert_reqs": ssl.CERT_NONE}
    celery_app.conf.redis_backend_use_ssl = {"ssl_cert_reqs": ssl.CERT_NONE}

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    # ── QUEUE PARTITIONING ──────────────────────────────────────────────────
    # 'default' queue: fast, low-latency tasks (emails, history saves, billing)
    # 'heavy'   queue: long-running tasks (repo embedding/indexing, large files)
    # Run separate workers per queue:
    #   celery -A app.queue.celery_config.celery_app worker -Q default --concurrency=4
    #   celery -A app.queue.celery_config.celery_app worker -Q heavy --concurrency=1
    task_default_queue="default",
    task_queues={
        "default": {},
        "heavy": {},
    },
    task_routes={
        # ── Fast tasks → default queue ──
        "tasks.save_translation_history":   {"queue": "default"},
        "tasks.send_transactional_email":   {"queue": "default"},
        "tasks.process_billing_webhook":    {"queue": "default"},
        "tasks.prune_translation_history":  {"queue": "default"},
        # ── Heavy tasks → heavy queue ──
        "tasks.process_large_file":         {"queue": "heavy"},
        "tasks.process_github_repo":        {"queue": "heavy"},
        "tasks.run_repository_indexing":   {"queue": "heavy"},
    },
)

# FIX-11 (P1-04): Celery Beat schedule for periodic/stats-reset tasks.
# Run: celery -A app.queue.celery_config beat --loglevel=info
from celery.schedules import crontab  # noqa: E402

celery_app.conf.beat_schedule = {
    "reset-daily-translation-stats": {
        "task": "reset_daily_stats",
        "schedule": crontab(hour=0, minute=0),  # midnight UTC daily
    },
    "reset-weekly-translation-stats": {
        "task": "reset_weekly_stats",
        "schedule": crontab(hour=0, minute=0, day_of_week="monday"),  # Monday midnight UTC
    },
    "prune-translation-history": {
        "task": "prune_old_translation_history",
        "schedule": crontab(hour=2, minute=0),  # 2am UTC daily
    },
}
