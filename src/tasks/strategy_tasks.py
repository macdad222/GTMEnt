"""Celery tasks for strategy report generation."""

from src.celery_app import celery_app


@celery_app.task(bind=True, max_retries=1)
def generate_strategy_report(self, job_id: str, report_id: str):
    """Generate a comprehensive strategy report."""
    from src.jobs.queue import get_job_queue
    from src.strategy_report.service import StrategyReportService

    queue = get_job_queue()

    try:
        queue.start_job(job_id)
        queue.update_progress(job_id, 10, "Gathering platform data...")

        service = StrategyReportService()
        service.generate_report_content(report_id, job_id)

    except Exception as e:
        queue.fail_job(job_id, str(e))
