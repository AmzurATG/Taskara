from celery import Celery
from app.core.config import settings
import os

# Ensure we have Redis connection before creating Celery app
redis_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:9095/0")

# Create Celery instance
celery_app = Celery(
    "task_generator",
    broker=redis_url,
    backend=redis_url,
    include=["app.tasks.ai_jobs"]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    # Add these to fix unpacking issues
    worker_disable_rate_limits=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)
