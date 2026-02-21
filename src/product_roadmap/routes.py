"""API routes for Product Competitiveness and Roadmap analysis."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime

from .models import (
    ProductPortfolio,
    ProductCompetitiveness,
    RoadmapRecommendation,
    ProductRoadmapIntel,
    ProductCategory,
)
from .service import get_product_roadmap_service
from ..jobs.queue import get_job_queue
from ..jobs.models import JobType


router = APIRouter(prefix="/api/product-roadmap", tags=["Product Roadmap"])


def _run_product_intel_generation(job_id: str, force: bool):
    """Background task to generate product roadmap intel."""
    queue = get_job_queue()
    service = get_product_roadmap_service()
    
    try:
        queue.update_progress(job_id, 20, "Gathering product portfolio data...")
        
        queue.update_progress(job_id, 50, "Calling LLM for competitive analysis...")
        intel = service.generate_intel(force_refresh=force)
        
        queue.update_progress(job_id, 90, "Finalizing roadmap recommendations...")
        queue.complete_job(job_id, {
            "portfolio_health_score": intel.portfolio_health_score if intel else 0,
            "recommendations_count": len(intel.roadmap_recommendations) if intel else 0,
        })
        
    except Exception as e:
        queue.fail_job(job_id, str(e))


# ═══════════════════════════════════════════════════════════════════════════
# RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════

class PortfolioResponse(BaseModel):
    """Response with product portfolio."""
    products: List[dict]
    total_products: int
    categories: List[str]


class IntelStatusResponse(BaseModel):
    """Response with intel generation status."""
    has_intel: bool
    generated_at: Optional[datetime] = None
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None


class IntelResponse(BaseModel):
    """Response with full product roadmap intel."""
    status: str
    intel: Optional[dict] = None
    message: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# PORTFOLIO ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/portfolio", response_model=PortfolioResponse)
async def get_portfolio():
    """Get the Comcast Business product portfolio."""
    service = get_product_roadmap_service()
    portfolio = service.get_default_portfolio()
    
    categories = list(set(p.category.value for p in portfolio))
    
    return PortfolioResponse(
        products=[p.model_dump() for p in portfolio],
        total_products=len(portfolio),
        categories=categories,
    )


@router.get("/portfolio/{product_id}")
async def get_product(product_id: str):
    """Get a specific product from the portfolio."""
    service = get_product_roadmap_service()
    portfolio = service.get_default_portfolio()
    
    for product in portfolio:
        if product.id == product_id:
            return product.model_dump()
    
    raise HTTPException(status_code=404, detail=f"Product {product_id} not found")


@router.get("/portfolio/category/{category}")
async def get_products_by_category(category: str):
    """Get products in a specific category."""
    service = get_product_roadmap_service()
    portfolio = service.get_default_portfolio()
    
    try:
        cat = ProductCategory(category)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
    
    products = [p.model_dump() for p in portfolio if p.category == cat]
    
    return {
        "category": category,
        "products": products,
        "count": len(products),
    }


# ═══════════════════════════════════════════════════════════════════════════
# INTEL ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/intel/status", response_model=IntelStatusResponse)
async def get_intel_status():
    """Get the status of product roadmap intel generation."""
    service = get_product_roadmap_service()
    intel = service.get_intel()
    
    if intel:
        return IntelStatusResponse(
            has_intel=True,
            generated_at=intel.generated_at,
            llm_provider=intel.llm_provider,
            llm_model=intel.llm_model,
        )
    
    return IntelStatusResponse(has_intel=False)


@router.get("/intel", response_model=IntelResponse)
async def get_intel():
    """Get the current product roadmap intel."""
    service = get_product_roadmap_service()
    intel = service.get_intel()
    
    if not intel:
        return IntelResponse(
            status="not_generated",
            message="Product roadmap intel has not been generated yet. Use POST /intel/generate to create it.",
        )
    
    return IntelResponse(
        status="generated",
        intel=intel.model_dump(),
    )


@router.post("/intel/generate")
async def generate_intel(
    force: bool = False,
):
    """
    Generate product competitiveness and roadmap intel using LLM (async).
    
    Returns immediately with job_id. Poll /api/jobs/{job_id} for status.
    When complete, use GET /api/product-roadmap/intel to get the intel.
    """
    service = get_product_roadmap_service()
    
    # Check if intel exists and we're not forcing
    if not force:
        intel = service.get_intel()
        if intel:
            return {
                "status": "cached",
                "message": "Using cached intel. Use force=true to regenerate.",
            }
    
    # Create a job to track progress
    queue = get_job_queue()
    job = queue.create_job(
        job_type=JobType.PRODUCT_ROADMAP,
        target_id="product-roadmap",
        target_name="Product Roadmap Analysis",
    )
    queue.start_job(job.id)
    
    from src.tasks.product_tasks import generate_product_roadmap
    generate_product_roadmap.delay(job.id, force)
    
    return {
        "status": "started",
        "job_id": job.id,
        "message": "Product roadmap analysis started. This may take 1-2 minutes.",
    }


@router.delete("/intel")
async def delete_intel():
    """Delete the cached product roadmap intel."""
    service = get_product_roadmap_service()
    success = service.delete_intel()
    
    if success:
        return {"message": "Product roadmap intel deleted successfully"}
    
    return {"message": "No intel to delete"}


# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/summary")
async def get_summary():
    """Get a summary of the product portfolio and intel status."""
    service = get_product_roadmap_service()
    portfolio = service.get_default_portfolio()
    intel = service.get_intel()
    
    # Calculate portfolio stats
    total_penetration = sum(p.current_penetration_pct for p in portfolio if p.is_launched)
    launched_count = sum(1 for p in portfolio if p.is_launched)
    avg_penetration = total_penetration / launched_count if launched_count > 0 else 0
    
    avg_growth = sum(p.yoy_growth_pct for p in portfolio if p.is_launched) / launched_count if launched_count > 0 else 0
    
    # Category breakdown
    category_counts = {}
    for p in portfolio:
        cat = p.category.value
        if cat not in category_counts:
            category_counts[cat] = 0
        category_counts[cat] += 1
    
    # Position breakdown
    position_counts = {}
    for p in portfolio:
        pos = p.market_position.value
        if pos not in position_counts:
            position_counts[pos] = 0
        position_counts[pos] += 1
    
    summary = {
        "portfolio": {
            "total_products": len(portfolio),
            "launched_products": launched_count,
            "upcoming_products": len(portfolio) - launched_count,
            "avg_penetration_pct": round(avg_penetration, 1),
            "avg_yoy_growth_pct": round(avg_growth, 1),
            "categories": category_counts,
            "positions": position_counts,
        },
        "intel": {
            "has_intel": intel is not None,
        },
    }
    
    if intel:
        summary["intel"].update({
            "generated_at": intel.generated_at.isoformat(),
            "llm_provider": intel.llm_provider,
            "llm_model": intel.llm_model,
            "portfolio_health_score": intel.portfolio_health_score,
            "total_recommendations": len(intel.roadmap_recommendations),
            "total_investment_millions": intel.total_recommended_investment_millions,
            "expected_revenue_millions": intel.expected_revenue_impact_millions,
            "expected_roi_pct": intel.expected_roi_pct,
        })
    
    return summary


@router.get("/recommendations")
async def get_recommendations():
    """Get just the roadmap recommendations from intel."""
    service = get_product_roadmap_service()
    intel = service.get_intel()
    
    if not intel:
        return {
            "status": "not_generated",
            "recommendations": [],
            "message": "Generate intel first to see recommendations.",
        }
    
    # Group by phase
    by_phase = {}
    for rec in intel.roadmap_recommendations:
        phase = rec.phase
        if phase not in by_phase:
            by_phase[phase] = []
        by_phase[phase].append(rec.model_dump())
    
    # Group by priority
    by_priority = {}
    for rec in intel.roadmap_recommendations:
        priority = rec.priority.value
        if priority not in by_priority:
            by_priority[priority] = []
        by_priority[priority].append(rec.model_dump())
    
    return {
        "status": "generated",
        "total_recommendations": len(intel.roadmap_recommendations),
        "by_phase": by_phase,
        "by_priority": by_priority,
        "total_investment_millions": intel.total_recommended_investment_millions,
        "expected_revenue_millions": intel.expected_revenue_impact_millions,
    }


@router.get("/competitive-analysis")
async def get_competitive_analysis():
    """Get just the competitive analysis from intel."""
    service = get_product_roadmap_service()
    intel = service.get_intel()
    
    if not intel:
        return {
            "status": "not_generated",
            "analysis": [],
            "message": "Generate intel first to see competitive analysis.",
        }
    
    return {
        "status": "generated",
        "analysis": [ca.model_dump() for ca in intel.competitive_analysis],
        "total_categories": len(intel.competitive_analysis),
    }

