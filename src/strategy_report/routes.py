"""API routes for strategy reports."""

from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from typing import List, Optional
from pydantic import BaseModel

from .models import StrategyReport, ReportStatus
from .service import StrategyReportService
from ..jobs.queue import get_job_queue
from ..jobs.models import JobType


router = APIRouter(prefix="/strategy-report", tags=["Strategy Report"])

strategy_service = StrategyReportService()


def _run_report_generation(job_id: str, report_id: str):
    """Background task to run strategy report generation."""
    import asyncio
    queue = get_job_queue()
    
    try:
        queue.update_progress(job_id, 10, "Gathering data from all sources...")
        
        # Run the async generation in a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            queue.update_progress(job_id, 30, "Calling LLM for comprehensive analysis...")
            report = loop.run_until_complete(strategy_service.generate_report(report_id=report_id))
            
            queue.update_progress(job_id, 90, "Finalizing report...")
            queue.complete_job(job_id, {
                "report_id": report.id,
                "title": report.title,
                "sections_count": len(report.sections) if report.sections else 0,
            })
        finally:
            loop.close()
            
    except Exception as e:
        queue.fail_job(job_id, str(e))


class GenerateReportRequest(BaseModel):
    """Request to generate a new report."""
    title: Optional[str] = None


class ReportSummary(BaseModel):
    """Summary of a report for listing."""
    id: str
    title: str
    status: ReportStatus
    created_at: str
    completed_at: Optional[str] = None
    generation_time_seconds: Optional[float] = None


@router.get("/", response_model=List[ReportSummary])
async def list_reports():
    """List all strategy reports."""
    reports = strategy_service.get_all_reports()
    return [
        ReportSummary(
            id=r.id,
            title=r.title,
            status=r.status,
            created_at=r.created_at.isoformat(),
            completed_at=r.completed_at.isoformat() if r.completed_at else None,
            generation_time_seconds=r.generation_time_seconds
        )
        for r in reports
    ]


@router.get("/latest", response_model=Optional[StrategyReport])
async def get_latest_report():
    """Get the most recent completed strategy report."""
    report = strategy_service.get_latest_report()
    if not report:
        return None
    return report


@router.get("/{report_id}", response_model=StrategyReport)
async def get_report(report_id: str):
    """Get a specific strategy report by ID."""
    report = strategy_service.get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found"
        )
    return report


@router.post("/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_report(
    background_tasks: BackgroundTasks,
    request: Optional[GenerateReportRequest] = None
):
    """
    Generate a new comprehensive strategy report (async).
    
    Returns immediately with a job_id. Poll /jobs/{job_id} for status.
    When complete, use /strategy-report/latest to get the report.
    """
    import uuid
    
    # Create a placeholder report ID
    report_id = str(uuid.uuid4())
    
    # Create a job to track progress
    queue = get_job_queue()
    job = queue.create_job(
        job_type=JobType.STRATEGY_REPORT,
        target_id=report_id,
        target_name="Enterprise Strategy Report",
    )
    queue.start_job(job.id)
    
    # Run generation in background
    background_tasks.add_task(_run_report_generation, job.id, report_id)
    
    return {
        "status": "started",
        "job_id": job.id,
        "report_id": report_id,
        "message": "Strategy report generation started. This may take 2-3 minutes.",
    }


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(report_id: str):
    """Delete a strategy report."""
    if not strategy_service.delete_report(report_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found"
        )
    return {"message": "Report deleted"}


@router.get("/{report_id}/status")
async def get_report_status(report_id: str):
    """Get the generation status of a report."""
    report = strategy_service.get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found"
        )
    return {
        "id": report.id,
        "status": report.status,
        "created_at": report.created_at.isoformat(),
        "completed_at": report.completed_at.isoformat() if report.completed_at else None,
        "generation_time_seconds": report.generation_time_seconds,
        "error_message": report.error_message
    }

