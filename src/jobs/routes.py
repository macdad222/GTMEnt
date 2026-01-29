"""API routes for job management and status tracking."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime

from .queue import get_job_queue
from .models import Job, JobStatus, JobType, JobSummary
from src.market_intel.data_fetcher import get_data_fetcher
from src.market_intel.llm_summarizer import get_llm_summarizer
from src.market_intel.public_data_sources import get_public_data_registry


router = APIRouter(prefix="/jobs", tags=["Jobs"])


# ─────────────────────────────────────────────────────────────────────────────
# Response Models
# ─────────────────────────────────────────────────────────────────────────────


class JobResponse(BaseModel):
    """Job info for API response."""
    id: str
    job_type: str
    status: str
    target_id: Optional[str]
    target_name: Optional[str]
    progress_pct: int
    progress_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_seconds: Optional[float]
    error_message: Optional[str]
    result_summary: Optional[dict]


class ImportRequest(BaseModel):
    """Request to import data from sources."""
    source_ids: Optional[List[str]] = None
    category: Optional[str] = None
    import_all: bool = False


class SummarizeRequest(BaseModel):
    """Request to generate summaries."""
    source_ids: Optional[List[str]] = None
    summarize_all_imported: bool = False


# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────


def _job_to_response(job: Job) -> JobResponse:
    """Convert job to API response."""
    return JobResponse(
        id=job.id,
        job_type=job.job_type.value,
        status=job.status.value,
        target_id=job.target_id,
        target_name=job.target_name,
        progress_pct=job.progress_pct,
        progress_message=job.progress_message,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        duration_seconds=job.duration_seconds,
        error_message=job.error_message,
        result_summary=job.result_data,
    )


def _run_import_job(source_id: str, source_name: str, api_endpoint: Optional[str]):
    """Background task to run import."""
    fetcher = get_data_fetcher()
    fetcher.fetch_with_job(source_id, source_name, api_endpoint)


def _run_summary_job(job_id: str, source_id: str, source_name: str, data: dict):
    """Background task to run summarization."""
    from src.market_intel.llm_summarizer import get_llm_summarizer
    
    queue = get_job_queue()
    summarizer = get_llm_summarizer()
    
    # Start the existing job
    queue.start_job(job_id)
    queue.update_progress(job_id, 20, "Preparing data for analysis...")
    
    try:
        queue.update_progress(job_id, 40, "Sending to LLM...")
        summary = summarizer.summarize_data_source(source_id, source_name, data)
        
        queue.update_progress(job_id, 90, "Saving summary...")
        
        # Complete job
        result = {
            "source_id": source_id,
            "summary_length": len(summary.get("summary_text", "")),
            "llm_provider": summary.get("llm_provider"),
        }
        queue.complete_job(job_id, result)
        
    except Exception as e:
        queue.fail_job(job_id, str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/summary", response_model=JobSummary)
async def get_jobs_summary():
    """Get summary of all jobs."""
    queue = get_job_queue()
    return queue.get_summary()


@router.get("/", response_model=List[JobResponse])
async def list_jobs(
    status: Optional[str] = None,
    job_type: Optional[str] = None,
    limit: int = 50,
):
    """List jobs with optional filters."""
    queue = get_job_queue()
    
    if status:
        try:
            s = JobStatus(status)
            jobs = queue.get_jobs_by_status(s)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    elif job_type:
        try:
            jt = JobType(job_type)
            jobs = queue.get_jobs_by_type(jt)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid job type: {job_type}")
    else:
        jobs = queue.get_recent_jobs(limit)
    
    return [_job_to_response(j) for j in jobs[:limit]]


@router.get("/active", response_model=List[JobResponse])
async def get_active_jobs():
    """Get all active (pending or in-progress) jobs."""
    queue = get_job_queue()
    jobs = queue.get_active_jobs()
    return [_job_to_response(j) for j in jobs]


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    """Get a specific job by ID."""
    queue = get_job_queue()
    job = queue.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    return _job_to_response(job)


@router.post("/import", response_model=List[JobResponse])
async def import_data_sources(request: ImportRequest, background_tasks: BackgroundTasks):
    """
    Import data from public sources.
    
    Returns immediately with job IDs. Use /jobs/{id} to check status.
    """
    registry = get_public_data_registry()
    fetcher = get_data_fetcher()
    queue = get_job_queue()
    
    jobs_created = []
    
    if request.import_all:
        sources = [s for s in registry.get_all_sources() if s.api_available and s.is_enabled]
    elif request.category:
        from src.market_intel.public_data_sources import DataSourceCategory
        try:
            cat = DataSourceCategory(request.category)
            sources = [s for s in registry.get_sources_by_category(cat) if s.api_available]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {request.category}")
    elif request.source_ids:
        sources = []
        for sid in request.source_ids:
            source = registry.get_source(sid)
            if source:
                sources.append(source)
    else:
        raise HTTPException(status_code=400, detail="Specify source_ids, category, or import_all")
    
    for source in sources:
        # Create job
        job = queue.create_job(
            job_type=JobType.DATA_IMPORT,
            target_id=source.id,
            target_name=source.name,
        )
        jobs_created.append(job)
        
        # Schedule background task
        background_tasks.add_task(
            _run_import_job,
            source.id,
            source.name,
            source.api_endpoint,
        )
    
    return [_job_to_response(j) for j in jobs_created]


@router.post("/summarize", response_model=List[JobResponse])
async def summarize_data_sources(request: SummarizeRequest, background_tasks: BackgroundTasks):
    """
    Generate LLM summaries for imported data.
    
    Returns immediately with job IDs. Use /jobs/{id} to check status.
    """
    registry = get_public_data_registry()
    queue = get_job_queue()
    
    jobs_created = []
    
    if request.summarize_all_imported:
        # Get all sources with cached data from the registry
        sources_with_data = [s for s in registry.get_all_sources() if s.cached_data]
    elif request.source_ids:
        sources_with_data = []
        for sid in request.source_ids:
            source = registry.get_source(sid)
            if source and source.cached_data:
                sources_with_data.append(source)
    else:
        raise HTTPException(status_code=400, detail="Specify source_ids or summarize_all_imported")
    
    for source in sources_with_data:
        # Create job
        job = queue.create_job(
            job_type=JobType.DATA_SUMMARY,
            target_id=source.id,
            target_name=f"Summary: {source.name}",
        )
        jobs_created.append(job)
        
        # Schedule background task with job_id
        background_tasks.add_task(
            _run_summary_job,
            job.id,
            source.id,
            source.name,
            source.cached_data,
        )
    
    return [_job_to_response(j) for j in jobs_created]


@router.get("/for-source/{source_id}", response_model=List[JobResponse])
async def get_jobs_for_source(source_id: str):
    """Get all jobs for a specific data source."""
    queue = get_job_queue()
    jobs = queue.get_jobs_for_target(source_id)
    return [_job_to_response(j) for j in jobs]


@router.delete("/completed")
async def clear_completed_jobs(older_than_days: int = 7):
    """Clear completed jobs older than specified days."""
    queue = get_job_queue()
    queue.clear_completed(older_than_days)
    return {"status": "ok", "message": f"Cleared completed jobs older than {older_than_days} days"}


@router.post("/fix-stale-pending")
async def fix_stale_pending_jobs(older_than_hours: int = 24):
    """
    Mark stale pending/in_progress jobs as completed if their data exists.
    
    This fixes jobs that ran successfully but never had their status updated.
    """
    from datetime import timedelta
    from pathlib import Path
    
    queue = get_job_queue()
    fixed_count = 0
    fixed_jobs = []
    
    data_dir = Path("/app/data")
    source_cache_dir = data_dir / "source_cache"
    summaries_dir = data_dir / "summaries"
    public_data_cache = data_dir / "public_data_cache.json"
    
    # Load public data cache to check for imported data
    public_cache_keys = set()
    if public_data_cache.exists():
        try:
            import json
            with open(public_data_cache, "r") as f:
                public_cache_keys = set(json.load(f).keys())
        except Exception:
            pass
    
    cutoff = datetime.utcnow() - timedelta(hours=older_than_hours)
    
    # Get all pending/in_progress jobs
    pending_jobs = queue.get_jobs_by_status(JobStatus.PENDING)
    in_progress_jobs = queue.get_jobs_by_status(JobStatus.IN_PROGRESS)
    all_stale_candidates = pending_jobs + in_progress_jobs
    stale_jobs = [j for j in all_stale_candidates if j.created_at < cutoff]
    
    for job in stale_jobs:
        data_exists = False
        
        # Check if data exists for this job
        if job.job_type == JobType.DATA_IMPORT:
            # Check source_cache for imported data OR public_data_cache
            cache_file = source_cache_dir / f"{job.target_id}.json"
            data_exists = cache_file.exists() or job.target_id in public_cache_keys
        elif job.job_type == JobType.DATA_SUMMARY:
            # Check summaries for generated summary
            summary_file = summaries_dir / f"{job.target_id}_summary.json"
            data_exists = summary_file.exists()
        
        if data_exists:
            queue.complete_job(job.id, {"auto_fixed": True, "reason": "Data exists, job was stale"})
            fixed_count += 1
            fixed_jobs.append({
                "job_id": job.id,
                "target": job.target_name,
                "type": job.job_type.value,
            })
    
    return {
        "status": "ok",
        "fixed_count": fixed_count,
        "fixed_jobs": fixed_jobs,
        "message": f"Fixed {fixed_count} stale pending jobs that had existing data."
    }

