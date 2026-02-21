"""Celery tasks for product roadmap analysis."""

from src.celery_app import celery_app


@celery_app.task(bind=True, max_retries=1)
def generate_product_roadmap(self, job_id: str, force: bool = False):
    """Generate product competitiveness and roadmap analysis."""
    from src.jobs.queue import get_job_queue
    from src.product_roadmap.service import ProductRoadmapService

    queue = get_job_queue()

    try:
        queue.start_job(job_id)
        queue.update_progress(job_id, 20, "Analyzing product portfolio...")

        service = ProductRoadmapService()
        intel = service.generate_intel(force_refresh=force)

        queue.update_progress(job_id, 90, "Saving roadmap analysis...")
        queue.complete_job(job_id, {
            "status": "completed" if intel else "no_data",
        })

    except Exception as e:
        queue.fail_job(job_id, str(e))
