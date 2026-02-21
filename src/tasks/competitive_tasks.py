"""Celery tasks for competitive intelligence."""

from src.celery_app import celery_app


@celery_app.task(bind=True, max_retries=1)
def scrape_competitor(self, job_id: str, competitor_id: str):
    """Scrape a competitor website."""
    from src.jobs.queue import get_job_queue
    from src.competitive.service import CompetitiveIntelService

    queue = get_job_queue()

    try:
        queue.start_job(job_id)
        queue.update_progress(job_id, 20, "Scraping competitor website...")

        service = CompetitiveIntelService()
        service.scrape_competitor(competitor_id)

        queue.update_progress(job_id, 90, "Saving scraped data...")
        queue.complete_job(job_id, {"competitor_id": competitor_id})

    except Exception as e:
        queue.fail_job(job_id, str(e))


@celery_app.task(bind=True, max_retries=1)
def run_competitive_analysis(self, job_id: str, competitor_ids: list, force: bool = False):
    """Run competitive analysis against selected competitors."""
    from src.jobs.queue import get_job_queue
    from src.competitive.service import CompetitiveIntelService

    queue = get_job_queue()

    try:
        queue.start_job(job_id)
        queue.update_progress(job_id, 10, "Preparing competitive analysis...")

        service = CompetitiveIntelService()
        analysis = service.generate_analysis(competitor_ids, refresh_scrape=force)

        queue.update_progress(job_id, 90, "Saving analysis results...")
        queue.complete_job(job_id, {
            "analysis_id": analysis.id if analysis else None,
            "competitor_count": len(competitor_ids),
        })

    except Exception as e:
        queue.fail_job(job_id, str(e))
