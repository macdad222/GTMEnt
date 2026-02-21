"""Celery tasks for market data import and summarization."""

from src.celery_app import celery_app


@celery_app.task(bind=True, max_retries=1)
def import_data_source(self, source_id: str, source_name: str, api_endpoint: str = None):
    """Import data from a public source."""
    from src.market_intel.data_fetcher import get_data_fetcher

    fetcher = get_data_fetcher()
    fetcher.fetch_with_job(source_id, source_name, api_endpoint)


@celery_app.task(bind=True, max_retries=1)
def summarize_data_source(self, job_id: str, source_id: str, source_name: str, data: dict):
    """Generate LLM summary for imported data."""
    from src.jobs.queue import get_job_queue
    from src.market_intel.llm_summarizer import get_llm_summarizer

    queue = get_job_queue()

    try:
        queue.start_job(job_id)
        queue.update_progress(job_id, 20, "Preparing data for analysis...")
        queue.update_progress(job_id, 40, "Sending to LLM...")

        summarizer = get_llm_summarizer()
        summary = summarizer.summarize_data_source(source_id, source_name, data)

        queue.update_progress(job_id, 90, "Saving summary...")
        queue.complete_job(job_id, {
            "source_id": source_id,
            "summary_length": len(summary.get("summary_text", "")),
            "llm_provider": summary.get("llm_provider"),
        })

    except Exception as e:
        queue.fail_job(job_id, str(e))


@celery_app.task(bind=True, max_retries=1)
def generate_market_research(self, job_id: str, force: bool = False):
    """Generate LLM-powered market research."""
    from src.jobs.queue import get_job_queue
    from src.market_intel.market_research_service import MarketResearchService

    queue = get_job_queue()

    try:
        queue.start_job(job_id)
        queue.update_progress(job_id, 20, "Researching market data...")

        service = MarketResearchService()
        result = service.research_market_data(force_refresh=force)

        queue.update_progress(job_id, 90, "Saving research...")
        queue.complete_job(job_id, {
            "status": "completed" if result else "no_data",
        })

    except Exception as e:
        queue.fail_job(job_id, str(e))
