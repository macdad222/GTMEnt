"""Celery tasks for insights generation."""

from src.celery_app import celery_app


@celery_app.task(bind=True, max_retries=1)
def generate_insight(self, job_id: str, insight_id: str):
    """Generate an LLM-powered insight response."""
    from src.jobs.queue import get_job_queue
    from src.insights.service import InsightsService

    queue = get_job_queue()

    try:
        queue.start_job(job_id)
        queue.update_progress(job_id, 20, "Gathering platform context...")

        service = InsightsService()
        service.process_insight(insight_id)

        queue.update_progress(job_id, 90, "Insight generated.")
        queue.complete_job(job_id, {"insight_id": insight_id})

    except Exception as e:
        queue.fail_job(job_id, str(e))
