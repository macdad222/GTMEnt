"""Celery tasks for MSA market intelligence."""

from src.celery_app import celery_app


@celery_app.task(bind=True, max_retries=1)
def generate_msa_intel(self, job_id: str, msa_code: str, msa_name: str, msa_data: dict):
    """Generate LLM-powered market intelligence for an MSA."""
    from src.jobs.queue import get_job_queue
    from src.segments.msa_research_service import get_msa_research_service

    queue = get_job_queue()

    try:
        queue.update_progress(job_id, 20, f"Researching {msa_name}...")

        service = get_msa_research_service()
        intel = service.generate_intel(msa_code, msa_data)

        queue.update_progress(job_id, 90, "Saving intelligence...")
        queue.complete_job(job_id, {
            "msa_code": msa_code,
            "msa_name": msa_name,
        })

    except Exception as e:
        queue.fail_job(job_id, str(e))
