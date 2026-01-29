"""API routes for market intelligence and public data sources."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime

from .public_data_sources import (
    get_public_data_registry,
    DataSourceCategory,
    ServiceArea,
    RefreshStatus,
)
from .llm_summarizer import get_llm_summarizer
from .market_research_service import get_market_research_service


router = APIRouter(prefix="/market-intel", tags=["Market Intelligence"])


# ─────────────────────────────────────────────────────────────────────────────
# Response Models
# ─────────────────────────────────────────────────────────────────────────────


class PublicDataSourceResponse(BaseModel):
    """Public data source info for API response."""
    id: str
    name: str
    description: str
    category: str
    category_label: str
    service_areas: List[str]
    url: str
    api_available: bool
    is_enabled: bool
    last_refresh: Optional[datetime]
    refresh_status: str
    has_data: bool
    error_message: Optional[str]


class CategorySummary(BaseModel):
    """Summary of a category."""
    category: str
    label: str
    total: int
    enabled: int
    refreshed: int
    sources: List[PublicDataSourceResponse]


class DataSourcesSummary(BaseModel):
    """Overall summary of data sources."""
    total_sources: int
    enabled_sources: int
    refreshed_sources: int
    last_refresh: Optional[datetime]
    by_category: dict
    by_service_area: dict


class RefreshRequest(BaseModel):
    """Request to refresh data sources."""
    source_ids: Optional[List[str]] = None
    category: Optional[str] = None
    refresh_all: bool = False


# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────


def _category_label(category: DataSourceCategory) -> str:
    """Get human-readable label for category."""
    labels = {
        DataSourceCategory.REGULATORY: "Regulatory & Government",
        DataSourceCategory.ANALYST: "Analyst & Market Research",
        DataSourceCategory.THREAT_INTEL: "Threat Intelligence",
        DataSourceCategory.INFRASTRUCTURE: "Infrastructure & Data Centers",
        DataSourceCategory.COMPETITOR: "Competitor Intelligence",
    }
    return labels.get(category, category.value)


def _service_area_label(sa: ServiceArea) -> str:
    """Get human-readable label for service area."""
    labels = {
        ServiceArea.CONNECTIVITY: "Connectivity",
        ServiceArea.SECURE_NETWORKING: "Secure Networking (SD-WAN/SASE)",
        ServiceArea.CYBERSECURITY: "Cybersecurity",
        ServiceArea.DATA_CENTER: "Data Center",
        ServiceArea.ALL: "All Service Areas",
    }
    return labels.get(sa, sa.value)


def _source_to_response(source) -> PublicDataSourceResponse:
    """Convert source to API response."""
    return PublicDataSourceResponse(
        id=source.id,
        name=source.name,
        description=source.description,
        category=source.category.value,
        category_label=_category_label(source.category),
        service_areas=[sa.value for sa in source.service_areas],
        url=source.url,
        api_available=source.api_available,
        is_enabled=source.is_enabled,
        last_refresh=source.last_refresh,
        refresh_status=source.refresh_status.value,
        has_data=source.cached_data is not None,
        error_message=source.error_message,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/public-sources/summary", response_model=DataSourcesSummary)
async def get_data_sources_summary():
    """Get summary of all public data sources."""
    registry = get_public_data_registry()
    summary = registry.get_summary()
    
    return DataSourcesSummary(
        total_sources=summary["total_sources"],
        enabled_sources=summary["enabled_sources"],
        refreshed_sources=summary["refreshed_sources"],
        last_refresh=datetime.fromisoformat(summary["last_refresh"]) if summary["last_refresh"] else None,
        by_category=summary["by_category"],
        by_service_area=summary["by_service_area"],
    )


@router.get("/public-sources", response_model=List[PublicDataSourceResponse])
async def list_public_sources(
    category: Optional[str] = None,
    service_area: Optional[str] = None,
    enabled_only: bool = False,
):
    """List all public data sources with optional filters."""
    registry = get_public_data_registry()
    
    if category:
        try:
            cat = DataSourceCategory(category)
            sources = registry.get_sources_by_category(cat)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
    elif service_area:
        try:
            sa = ServiceArea(service_area)
            sources = registry.get_sources_by_service_area(sa)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid service area: {service_area}")
    else:
        sources = registry.get_all_sources()
    
    if enabled_only:
        sources = [s for s in sources if s.is_enabled]
    
    return [_source_to_response(s) for s in sources]


@router.get("/public-sources/by-category", response_model=List[CategorySummary])
async def get_sources_by_category():
    """Get all sources organized by category."""
    registry = get_public_data_registry()
    
    result = []
    for cat in DataSourceCategory:
        sources = registry.get_sources_by_category(cat)
        result.append(CategorySummary(
            category=cat.value,
            label=_category_label(cat),
            total=len(sources),
            enabled=sum(1 for s in sources if s.is_enabled),
            refreshed=sum(1 for s in sources if s.refresh_status == RefreshStatus.SUCCESS),
            sources=[_source_to_response(s) for s in sources],
        ))
    
    return result


@router.get("/public-sources/{source_id}", response_model=PublicDataSourceResponse)
async def get_public_source(source_id: str):
    """Get a specific public data source."""
    registry = get_public_data_registry()
    source = registry.get_source(source_id)
    
    if not source:
        raise HTTPException(status_code=404, detail=f"Source {source_id} not found")
    
    return _source_to_response(source)


@router.post("/public-sources/{source_id}/refresh", response_model=PublicDataSourceResponse)
async def refresh_source(source_id: str):
    """Refresh data for a specific source."""
    registry = get_public_data_registry()
    
    try:
        source = registry.refresh_source(source_id)
        return _source_to_response(source)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/public-sources/refresh", response_model=List[PublicDataSourceResponse])
async def refresh_sources(request: RefreshRequest):
    """Refresh multiple sources."""
    registry = get_public_data_registry()
    
    if request.refresh_all:
        sources = registry.refresh_all()
    elif request.category:
        try:
            cat = DataSourceCategory(request.category)
            sources = registry.refresh_category(cat)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {request.category}")
    elif request.source_ids:
        sources = []
        for source_id in request.source_ids:
            try:
                source = registry.refresh_source(source_id)
                sources.append(source)
            except ValueError:
                pass  # Skip invalid source IDs
    else:
        raise HTTPException(status_code=400, detail="Specify source_ids, category, or refresh_all")
    
    return [_source_to_response(s) for s in sources]


@router.put("/public-sources/{source_id}/toggle")
async def toggle_source(source_id: str, enabled: bool = Query(...)):
    """Enable or disable a source."""
    registry = get_public_data_registry()
    
    try:
        source = registry.toggle_source(source_id, enabled)
        return _source_to_response(source)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/categories")
async def list_categories():
    """List all data source categories."""
    return {
        "categories": [
            {"value": cat.value, "label": _category_label(cat)}
            for cat in DataSourceCategory
        ]
    }


@router.get("/service-areas")
async def list_service_areas():
    """List all service areas."""
    return {
        "service_areas": [
            {"value": sa.value, "label": _service_area_label(sa)}
            for sa in ServiceArea
            if sa != ServiceArea.ALL
        ]
    }


@router.get("/summaries")
async def get_all_summaries():
    """Get all LLM-generated summaries."""
    summarizer = get_llm_summarizer()
    summaries = summarizer.get_all_summaries()
    return {"summaries": summaries}


@router.get("/summaries/{source_id}")
async def get_summary(source_id: str):
    """Get LLM summary for a specific source."""
    summarizer = get_llm_summarizer()
    summary = summarizer.get_summary(source_id)
    
    if not summary:
        raise HTTPException(status_code=404, detail=f"No summary found for source {source_id}")
    
    return summary


# ─────────────────────────────────────────────────────────────────────────────
# Market Research Endpoints (LLM-Powered)
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/research")
async def get_market_research():
    """Get the latest LLM-generated market research with citations."""
    service = get_market_research_service()
    research = service.get_latest_research()
    
    if not research:
        return {
            "status": "not_generated",
            "message": "No market research available. Click 'Generate Research' to create one.",
        }
    
    return research


@router.post("/research/generate")
async def generate_market_research(
    force_refresh: bool = False,
    background_tasks: BackgroundTasks = None
):
    """
    Generate comprehensive market research using LLM.
    
    This will use the configured LLM to research and compile:
    - TAM/SAM/SOM data with citations
    - Market trends and growth rates
    - Competitive landscape insights
    - All data properly footnoted with sources
    """
    service = get_market_research_service()
    
    # Run in background with job tracking
    job_id = service.research_with_job(force_refresh)
    
    return {
        "status": "started",
        "job_id": job_id,
        "message": "Market research generation started. This may take 1-2 minutes.",
    }


@router.post("/research/generate-sync")
async def generate_market_research_sync(force_refresh: bool = False):
    """
    Generate market research synchronously (waits for completion).
    Use this for immediate results, but may take 30-60 seconds.
    """
    service = get_market_research_service()
    
    try:
        result = service.research_market_data(force_refresh)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

