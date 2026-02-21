"""API routes for Questions and Insights."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException
import asyncio

from .models import (
    InsightQuestion,
    InsightQuestionCreate,
    InsightQuestionUpdate,
    InsightCategory,
    InsightStatus,
)
from .service import InsightsService
from ..jobs.queue import get_job_queue
from ..jobs.models import JobType

router = APIRouter(prefix="/insights", tags=["insights"])


def _run_insight_generation(job_id: str, insight_id: str, request_dict: dict):
    """Background task to generate insight response."""
    queue = get_job_queue()
    service = InsightsService()
    
    try:
        queue.update_progress(job_id, 10, "Preparing question...")
        
        # Recreate request object
        request = InsightQuestionCreate(**request_dict)
        
        queue.update_progress(job_id, 30, "Gathering platform context...")
        
        queue.update_progress(job_id, 50, "Generating LLM response...")
        
        # Run the async generation
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            insight = loop.run_until_complete(
                service.create_insight(request, insight_id=insight_id)
            )
            
            queue.update_progress(job_id, 90, "Finalizing insight...")
            queue.complete_job(job_id, {
                "insight_id": insight.id,
                "status": insight.status.value,
                "response_length": len(insight.response or ""),
            })
        finally:
            loop.close()
            
    except Exception as e:
        queue.fail_job(job_id, str(e))
        # Also update the insight status
        try:
            service.mark_insight_failed(insight_id, str(e))
        except:
            pass


@router.get("", response_model=List[InsightQuestion])
async def list_insights(
    category: Optional[InsightCategory] = None,
    incorporated_only: bool = False,
    starred_only: bool = False,
):
    """List all insights with optional filters."""
    service = InsightsService()
    
    if incorporated_only:
        return service.get_incorporated_insights()
    elif starred_only:
        return service.get_starred_insights()
    elif category:
        return service.get_insights_by_category(category)
    else:
        return service.get_all_insights()


@router.get("/categories")
async def list_categories():
    """List all available insight categories."""
    return [
        {"value": cat.value, "label": cat.value.replace("_", " ").title()}
        for cat in InsightCategory
    ]


@router.get("/{insight_id}", response_model=InsightQuestion)
async def get_insight(insight_id: str):
    """Get a specific insight by ID."""
    service = InsightsService()
    insight = service.get_insight(insight_id)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    return insight


@router.post("")
async def create_insight(
    request: InsightQuestionCreate,
):
    """
    Create a new insight question and generate LLM response (async).
    
    Returns immediately with job_id and insight_id. 
    Poll /api/jobs/{job_id} for status.
    When complete, use /api/insights/{insight_id} to get the response.
    """
    import uuid
    
    service = InsightsService()
    
    # Create a placeholder insight ID
    insight_id = str(uuid.uuid4())
    
    # Create a placeholder insight record immediately so user sees it
    placeholder_insight = InsightQuestion(
        id=insight_id,
        question=request.question,
        category=request.category or InsightCategory.GENERAL,
        status=InsightStatus.PROCESSING,
    )
    service._store.insights.insert(0, placeholder_insight)
    service._save_store()
    
    # Create a job to track progress
    queue = get_job_queue()
    job = queue.create_job(
        job_type=JobType.QA_INSIGHT,
        target_id=insight_id,
        target_name=f"Q&A: {request.question[:50]}{'...' if len(request.question) > 50 else ''}",
    )
    queue.start_job(job.id)
    
    from src.tasks.insight_tasks import generate_insight
    generate_insight.delay(job.id, insight_id)
    
    return {
        "status": "started",
        "job_id": job.id,
        "insight_id": insight_id,
        "message": "Insight generation started. This may take 30-60 seconds.",
    }


@router.patch("/{insight_id}", response_model=InsightQuestion)
async def update_insight(insight_id: str, update: InsightQuestionUpdate):
    """Update an insight (incorporate, star, change category)."""
    service = InsightsService()
    insight = service.update_insight(insight_id, update)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    return insight


@router.delete("/{insight_id}")
async def delete_insight(insight_id: str):
    """Delete an insight."""
    service = InsightsService()
    success = service.delete_insight(insight_id)
    if not success:
        raise HTTPException(status_code=404, detail="Insight not found")
    return {"success": True, "message": "Insight deleted"}


@router.post("/{insight_id}/incorporate", response_model=InsightQuestion)
async def incorporate_insight(insight_id: str, note: Optional[str] = None):
    """Mark an insight as incorporated for use in other analyses."""
    service = InsightsService()
    update = InsightQuestionUpdate(is_incorporated=True, incorporation_note=note)
    insight = service.update_insight(insight_id, update)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    return insight


@router.post("/{insight_id}/unincorporate", response_model=InsightQuestion)
async def unincorporate_insight(insight_id: str):
    """Remove an insight from incorporated status."""
    service = InsightsService()
    update = InsightQuestionUpdate(is_incorporated=False, incorporation_note=None)
    insight = service.update_insight(insight_id, update)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    return insight


@router.post("/{insight_id}/star", response_model=InsightQuestion)
async def star_insight(insight_id: str):
    """Star an insight as important."""
    service = InsightsService()
    update = InsightQuestionUpdate(is_starred=True)
    insight = service.update_insight(insight_id, update)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    return insight


@router.post("/{insight_id}/unstar", response_model=InsightQuestion)
async def unstar_insight(insight_id: str):
    """Remove star from an insight."""
    service = InsightsService()
    update = InsightQuestionUpdate(is_starred=False)
    insight = service.update_insight(insight_id, update)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    return insight


@router.get("/stats/summary")
async def get_insights_stats():
    """Get summary statistics about insights."""
    service = InsightsService()
    all_insights = service.get_all_insights()
    
    # Calculate stats
    total = len(all_insights)
    completed = len([i for i in all_insights if i.status == InsightStatus.COMPLETED])
    incorporated = len([i for i in all_insights if i.is_incorporated])
    starred = len([i for i in all_insights if i.is_starred])
    
    # Category breakdown
    by_category = {}
    for insight in all_insights:
        cat = insight.category.value
        by_category[cat] = by_category.get(cat, 0) + 1
    
    # Average processing time
    times = [i.processing_time_seconds for i in all_insights if i.processing_time_seconds]
    avg_time = sum(times) / len(times) if times else 0
    
    return {
        "total": total,
        "completed": completed,
        "incorporated": incorporated,
        "starred": starred,
        "by_category": by_category,
        "avg_processing_time_seconds": round(avg_time, 2),
    }

