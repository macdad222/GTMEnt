"""Celery tasks for insights generation."""

import asyncio
from src.celery_app import celery_app


@celery_app.task(bind=True, max_retries=1)
def generate_insight(self, job_id: str, insight_id: str):
    """Generate an LLM-powered insight response."""
    from src.jobs.queue import get_job_queue
    from src.insights.service import InsightsService
    from src.insights.models import InsightQuestionCreate, InsightCategory

    queue = get_job_queue()

    try:
        queue.update_progress(job_id, 10, "Preparing question...")

        service = InsightsService()
        service._store = service._load_store()

        question_text = None
        category = InsightCategory.GENERAL
        for insight in service._store.insights:
            if insight.id == insight_id:
                question_text = insight.question
                category = insight.category
                break

        if not question_text:
            raise ValueError(f"Insight {insight_id} not found in store")

        queue.update_progress(job_id, 20, "Gathering platform context...")

        request = InsightQuestionCreate(question=question_text, category=category)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(
                service.create_insight(request, insight_id=insight_id)
            )
        finally:
            loop.close()

        queue.update_progress(job_id, 90, "Insight generated.")
        queue.complete_job(job_id, {
            "insight_id": insight_id,
            "status": result.status.value,
            "response_length": len(result.response or ""),
        })

    except Exception as e:
        queue.fail_job(job_id, str(e))
        try:
            service.mark_insight_failed(insight_id, str(e))
        except Exception:
            pass
