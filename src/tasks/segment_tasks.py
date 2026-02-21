"""Celery tasks for segment intelligence."""

from src.celery_app import celery_app


@celery_app.task(bind=True, max_retries=1)
def generate_segment_intel(self, job_id: str, tier: str, force: bool = False):
    """Generate market intelligence for a specific segment."""
    from src.jobs.queue import get_job_queue
    from src.cb_config.segment_research_service import get_segment_research_service

    queue = get_job_queue()

    try:
        queue.update_progress(job_id, 20, f"Gathering data for segment {tier}...")
        queue.update_progress(job_id, 50, "Calling LLM for segment analysis...")

        service = get_segment_research_service()
        intel = service.generate_segment_intel(tier, force_refresh=force)

        queue.update_progress(job_id, 90, "Finalizing segment intelligence...")
        queue.complete_job(job_id, {
            "segment_tier": tier,
            "tam_estimate": intel.tam_estimate if intel else 0,
        })

    except Exception as e:
        queue.fail_job(job_id, str(e))


@celery_app.task(bind=True, max_retries=1)
def generate_all_segments_intel(self, job_id: str, force: bool = False):
    """Generate market intelligence for all segments."""
    from src.jobs.queue import get_job_queue
    from src.cb_config.store import get_cb_config_store
    from src.cb_config.segment_research_service import get_segment_research_service

    queue = get_job_queue()

    try:
        store = get_cb_config_store()
        segments = store.get_config().segments
        total = len(segments)

        service = get_segment_research_service()
        results = {}

        for i, segment in enumerate(segments):
            pct = 20 + int((i / total) * 60)
            queue.update_progress(job_id, pct, f"Generating intel for {segment.label}...")
            intel = service.generate_segment_intel(segment.tier, force_refresh=force)
            if intel:
                results[segment.tier] = intel.model_dump()

        queue.update_progress(job_id, 90, "Finalizing all segment intelligence...")
        queue.complete_job(job_id, {
            "generated_count": len(results),
            "segments": list(results.keys()),
        })

    except Exception as e:
        queue.fail_job(job_id, str(e))
