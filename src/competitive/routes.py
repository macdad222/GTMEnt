"""API routes for Competitive Intelligence."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime

from .models import Competitor, CompetitorCategory, ScrapedWebContent
from .service import get_competitive_intel_service
from ..jobs.queue import get_job_queue
from ..jobs.models import JobType


router = APIRouter(tags=["Competitive Intelligence"])


def _run_competitive_analysis(job_id: str, competitor_ids: List[str], refresh_scrape: bool):
    """Background task to run competitive analysis."""
    queue = get_job_queue()
    service = get_competitive_intel_service()
    
    try:
        queue.update_progress(job_id, 10, "Gathering competitor data...")
        
        queue.update_progress(job_id, 30, "Scraping competitor websites...")
        
        queue.update_progress(job_id, 50, "Calling LLM for analysis...")
        analysis = service.generate_analysis(
            competitor_ids=competitor_ids,
            refresh_scrape=refresh_scrape,
        )
        
        queue.update_progress(job_id, 90, "Finalizing analysis...")
        
        # Get competitor names for result
        competitor_names = []
        for cid in competitor_ids:
            comp = service.get_competitor(cid)
            if comp:
                competitor_names.append(comp.name)
        
        queue.complete_job(job_id, {
            "analysis_id": analysis.id,
            "competitors_analyzed": competitor_names,
        })
        
    except Exception as e:
        queue.fail_job(job_id, str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Request/Response Models
# ─────────────────────────────────────────────────────────────────────────────


class CompetitorResponse(BaseModel):
    """Competitor info for API response."""
    id: str
    name: str
    ticker: Optional[str]
    category: str
    category_label: str
    business_url: str
    is_active: bool
    last_scraped: Optional[datetime]
    has_data: bool
    scrape_error: Optional[str]


class AddCompetitorRequest(BaseModel):
    """Request to add a new competitor."""
    name: str
    business_url: str
    ticker: Optional[str] = None
    category: str = "other"


class UpdateCompetitorRequest(BaseModel):
    """Request to update a competitor."""
    name: Optional[str] = None
    business_url: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class CompareRequest(BaseModel):
    """Request to compare competitors."""
    competitor_ids: List[str]
    refresh_scrape: bool = False


class ScrapedDataResponse(BaseModel):
    """Scraped website data response."""
    url: str
    title: str
    scraped_at: datetime
    products: List[str]
    features: List[str]
    target_segments: List[str]
    key_differentiators: List[str]
    pricing_info: Optional[str]
    content_preview: str


class AnalysisResponse(BaseModel):
    """Competitive analysis response."""
    id: str
    created_at: datetime
    competitors_analyzed: List[str]
    llm_provider: str
    llm_model: str
    executive_summary: str
    product_comparison: str
    market_positioning: str
    recommendations: List[str]
    opportunities: List[str]
    threats: List[str]
    full_analysis: str


class AnalysisSummaryResponse(BaseModel):
    """Brief analysis summary for list view."""
    id: str
    created_at: datetime
    competitors_analyzed: List[str]
    executive_summary: str


# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────


def _category_label(cat: CompetitorCategory) -> str:
    """Get human-readable category label."""
    labels = {
        CompetitorCategory.TELCO: "Telecommunications",
        CompetitorCategory.CABLE: "Cable Provider",
        CompetitorCategory.FIBER: "Fiber Network",
        CompetitorCategory.CLOUD: "Cloud Provider",
        CompetitorCategory.CLOUD_CONNECT: "Cloud Interconnection",
        CompetitorCategory.DATA_CENTER: "Data Center",
        CompetitorCategory.SDWAN_SASE: "SD-WAN / SASE",
        CompetitorCategory.SECURITY: "Security",
        CompetitorCategory.MULTI_CLOUD: "Multi-Cloud Networking",
        CompetitorCategory.MSP: "Managed Services",
        CompetitorCategory.UCAAS: "UCaaS / CCaaS",
        CompetitorCategory.OTHER: "Other",
    }
    return labels.get(cat, cat.value)


def _competitor_to_response(comp: Competitor) -> CompetitorResponse:
    """Convert competitor to API response."""
    return CompetitorResponse(
        id=comp.id,
        name=comp.name,
        ticker=comp.ticker,
        category=comp.category.value,
        category_label=_category_label(comp.category),
        business_url=comp.business_url,
        is_active=comp.is_active,
        last_scraped=comp.last_scraped,
        has_data=comp.scraped_content is not None,
        scrape_error=comp.scrape_error,
    )


def _scraped_to_response(data: ScrapedWebContent) -> ScrapedDataResponse:
    """Convert scraped data to API response."""
    return ScrapedDataResponse(
        url=data.url,
        title=data.title,
        scraped_at=data.scraped_at,
        products=data.products,
        features=data.features,
        target_segments=data.target_segments,
        key_differentiators=data.key_differentiators,
        pricing_info=data.pricing_info,
        content_preview=data.main_text[:500] + "..." if len(data.main_text) > 500 else data.main_text,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Competitor Management
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/competitors", response_model=List[CompetitorResponse])
async def list_competitors(active_only: bool = True):
    """List all competitors."""
    service = get_competitive_intel_service()
    competitors = service.get_competitors(active_only)
    return [_competitor_to_response(c) for c in competitors]


@router.get("/competitors/{competitor_id}", response_model=CompetitorResponse)
async def get_competitor(competitor_id: str):
    """Get a specific competitor."""
    service = get_competitive_intel_service()
    comp = service.get_competitor(competitor_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    return _competitor_to_response(comp)


@router.post("/competitors", response_model=CompetitorResponse)
async def add_competitor(request: AddCompetitorRequest, background_tasks: BackgroundTasks):
    """Add a new competitor and immediately scrape their website."""
    service = get_competitive_intel_service()
    
    try:
        category = CompetitorCategory(request.category)
    except ValueError:
        category = CompetitorCategory.OTHER
    
    comp = service.add_competitor(
        name=request.name,
        business_url=request.business_url,
        ticker=request.ticker,
        category=category,
    )
    
    # Automatically scrape the new competitor's website in the background
    def scrape_new_competitor():
        service.scrape_competitor(comp.id, force=True)
    
    background_tasks.add_task(scrape_new_competitor)
    
    return _competitor_to_response(comp)


@router.put("/competitors/{competitor_id}", response_model=CompetitorResponse)
async def update_competitor(competitor_id: str, request: UpdateCompetitorRequest):
    """Update a competitor."""
    service = get_competitive_intel_service()
    
    category = None
    if request.category:
        try:
            category = CompetitorCategory(request.category)
        except ValueError:
            pass
    
    comp = service.update_competitor(
        competitor_id=competitor_id,
        name=request.name,
        business_url=request.business_url,
        category=category,
        is_active=request.is_active,
    )
    
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    
    return _competitor_to_response(comp)


@router.delete("/competitors/{competitor_id}")
async def delete_competitor(competitor_id: str):
    """Delete a competitor."""
    service = get_competitive_intel_service()
    success = service.delete_competitor(competitor_id)
    if not success:
        raise HTTPException(status_code=404, detail="Competitor not found")
    return {"message": "Competitor deleted", "id": competitor_id}


# ─────────────────────────────────────────────────────────────────────────────
# Web Scraping
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/competitors/{competitor_id}/scrape", response_model=ScrapedDataResponse)
async def scrape_competitor(competitor_id: str, force: bool = False):
    """Scrape a competitor's website."""
    service = get_competitive_intel_service()
    
    data = service.scrape_competitor(competitor_id, force)
    if not data:
        raise HTTPException(status_code=404, detail="Competitor not found")
    
    return _scraped_to_response(data)


@router.get("/competitors/{competitor_id}/data", response_model=ScrapedDataResponse)
async def get_competitor_data(competitor_id: str):
    """Get scraped data for a competitor."""
    service = get_competitive_intel_service()
    comp = service.get_competitor(competitor_id)
    
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    
    if not comp.scraped_content:
        raise HTTPException(status_code=404, detail="No scraped data available. Run scrape first.")
    
    data = ScrapedWebContent(**comp.scraped_content)
    return _scraped_to_response(data)


@router.post("/scrape-all")
async def scrape_all_competitors(force: bool = False, background_tasks: BackgroundTasks = None):
    """Scrape all competitors and Comcast."""
    service = get_competitive_intel_service()
    
    # Run synchronously for now (could be backgrounded for large sets)
    results = service.scrape_all(force)
    
    return {
        "scraped_count": len(results),
        "competitors": list(results.keys()),
        "message": "Scraping complete",
    }


@router.get("/comcast-data", response_model=ScrapedDataResponse)
async def get_comcast_data():
    """Get scraped Comcast Business data."""
    service = get_competitive_intel_service()
    data = service.scrape_comcast(force=False)
    return _scraped_to_response(data)


# ─────────────────────────────────────────────────────────────────────────────
# Competitive Analysis
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/compare")
async def generate_comparison(
    request: CompareRequest,
    background_tasks: BackgroundTasks
):
    """
    Generate competitive analysis comparing selected competitors (async).
    
    Returns immediately with a job_id. Poll /api/jobs/{job_id} for status.
    When complete, use /api/competitors/analyses to get the analysis.
    """
    service = get_competitive_intel_service()
    
    if not request.competitor_ids:
        raise HTTPException(status_code=400, detail="Select at least one competitor to compare")
    
    # Get competitor names for display
    competitor_names = []
    for cid in request.competitor_ids:
        comp = service.get_competitor(cid)
        if comp:
            competitor_names.append(comp.name)
    
    # Create a job to track progress
    queue = get_job_queue()
    job = queue.create_job(
        job_type=JobType.COMPETITIVE_ANALYSIS,
        target_id=",".join(request.competitor_ids),
        target_name=f"Competitive Analysis: {', '.join(competitor_names[:3])}{'...' if len(competitor_names) > 3 else ''}",
    )
    queue.start_job(job.id)
    
    # Run analysis in background
    background_tasks.add_task(
        _run_competitive_analysis, 
        job.id, 
        request.competitor_ids, 
        request.refresh_scrape
    )
    
    return {
        "status": "started",
        "job_id": job.id,
        "competitors": competitor_names,
        "message": "Competitive analysis started. This may take 1-2 minutes.",
    }


@router.get("/analyses", response_model=List[AnalysisSummaryResponse])
async def list_analyses(limit: int = 10):
    """List recent competitive analyses."""
    service = get_competitive_intel_service()
    analyses = service.get_analyses(limit)
    
    results = []
    for analysis in analyses:
        # Get competitor names
        competitor_names = []
        for cid in analysis.competitor_ids:
            comp = service.get_competitor(cid)
            if comp:
                competitor_names.append(comp.name)
        
        results.append(AnalysisSummaryResponse(
            id=analysis.id,
            created_at=analysis.created_at,
            competitors_analyzed=competitor_names,
            executive_summary=analysis.executive_summary[:300] + "..." if len(analysis.executive_summary) > 300 else analysis.executive_summary,
        ))
    
    return results


@router.get("/analyses/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: str):
    """Get a specific competitive analysis."""
    service = get_competitive_intel_service()
    analysis = service.get_analysis(analysis_id)
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Get competitor names
    competitor_names = []
    for cid in analysis.competitor_ids:
        comp = service.get_competitor(cid)
        if comp:
            competitor_names.append(comp.name)
    
    return AnalysisResponse(
        id=analysis.id,
        created_at=analysis.created_at,
        competitors_analyzed=competitor_names,
        llm_provider=analysis.llm_provider,
        llm_model=analysis.llm_model,
        executive_summary=analysis.executive_summary,
        product_comparison=analysis.product_comparison,
        market_positioning=analysis.market_positioning,
        recommendations=analysis.recommendations,
        opportunities=analysis.opportunities,
        threats=analysis.threats,
        full_analysis=analysis.full_analysis,
    )


@router.get("/categories")
async def list_categories():
    """List competitor categories."""
    return {
        "categories": [
            {"value": cat.value, "label": _category_label(cat)}
            for cat in CompetitorCategory
        ]
    }

