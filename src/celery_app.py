"""Celery application configuration."""

from celery import Celery
from src.config import get_settings

settings = get_settings()

celery_app = Celery(
    "gtm_tasks",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "src.tasks.strategy_tasks",
        "src.tasks.competitive_tasks",
        "src.tasks.msa_tasks",
        "src.tasks.product_tasks",
        "src.tasks.insight_tasks",
        "src.tasks.segment_tasks",
        "src.tasks.market_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=900,  # 15 min hard limit
    task_soft_time_limit=600,  # 10 min soft limit
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
)
