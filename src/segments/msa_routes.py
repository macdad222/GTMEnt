"""API routes for MSA geographic segmentation with sales resource planning."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime

from .msa_model import (
    get_msa_registry,
    get_segment_sales_configs,
    MSA,
    MSARegion,
    MSASalesAllocation,
    MSASegmentDistribution,
    SegmentSalesConfig,
    InfrastructureType,
    SalesMotionType,
    RepType,
)
from .msa_research_service import (
    get_msa_research_service,
    MSAMarketIntel,
    ProductOpportunity,
    SalesResourceRecommendation,
)
from ..jobs.queue import get_job_queue
from ..jobs.models import JobType


router = APIRouter(prefix="/msas", tags=["MSA Geographic Segmentation"])


def _run_msa_intel_generation(job_id: str, msa_code: str, msa_name: str, msa_data: dict):
    """Background task to generate MSA intel."""
    queue = get_job_queue()
    research_service = get_msa_research_service()
    
    try:
        queue.update_progress(job_id, 20, f"Gathering data for {msa_name}...")
        
        queue.update_progress(job_id, 50, "Calling LLM for market analysis...")
        intel = research_service.generate_msa_intel(**msa_data)
        
        queue.update_progress(job_id, 90, "Finalizing MSA intelligence...")
        queue.complete_job(job_id, {
            "msa_code": msa_code,
            "msa_name": msa_name,
            "market_tam": intel.total_enterprise_tam_usd if intel else 0,
        })
        
    except Exception as e:
        queue.fail_job(job_id, str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Response Models
# ─────────────────────────────────────────────────────────────────────────────


class SalesAllocationResponse(BaseModel):
    """Sales allocation for API response."""
    sdr_count: int
    bdr_count: int
    inside_ae_count: int
    inside_am_count: int
    field_ae_count: int
    field_am_count: int
    strategic_ae_count: int
    major_am_count: int
    se_count: int
    partner_mgr_count: int
    sales_mgr_count: int
    total_quota_usd: float
    new_logo_quota_usd: float
    expansion_quota_usd: float
    quota_attainment_pct: float
    total_quota_bearing_headcount: int
    total_headcount: int


class SegmentDistributionResponse(BaseModel):
    """Segment distribution for API response."""
    segment_tier: str
    total_accounts: int
    hq_accounts: int
    branch_accounts: int
    arr_usd: float
    avg_mrr_usd: float
    whitespace_accounts: int
    expansion_opportunities: int


class MSAResponse(BaseModel):
    """MSA info for API response."""
    code: str
    name: str
    short_name: str
    state_codes: List[str]
    region: str
    population_2023: int
    enterprise_establishments: int
    
    # Infrastructure
    has_fiber: bool
    has_coax: bool
    infrastructure_type: str
    
    # Coverage
    in_comcast_footprint: bool
    comcast_coverage_pct: float
    fiber_coverage_pct: float
    
    # Priority
    priority_tier: int
    priority_score: float
    
    # Market opportunity
    tam_usd: float
    sam_usd: float
    current_arr_usd: float
    market_share_pct: float
    
    # Sales allocation
    sales_allocation: SalesAllocationResponse
    
    # Segment distribution
    segment_distribution: List[SegmentDistributionResponse]


class MSAListResponse(BaseModel):
    """Simplified MSA for list views."""
    code: str
    short_name: str
    region: str
    population_2023: int
    enterprise_establishments: int
    has_fiber: bool
    has_coax: bool
    comcast_coverage_pct: float
    fiber_coverage_pct: float
    priority_tier: int
    priority_score: float
    current_arr_usd: float
    total_quota_bearing_headcount: int
    total_accounts: int


class MSASummary(BaseModel):
    """Summary of MSA data."""
    total_msas: int
    total_population: int
    total_enterprise_establishments: int
    total_quota_bearing_headcount: int
    total_quota_usd: float
    total_current_arr_usd: float
    by_region: dict
    by_tier: dict
    by_infrastructure: dict
    high_coverage_count: int
    avg_coverage_pct: float
    avg_fiber_coverage_pct: float


class SalesCapacitySummary(BaseModel):
    """Sales capacity summary."""
    by_role: dict
    total_headcount: int
    total_quota_bearing: int
    inside_sales_total: int
    field_sales_total: int


class SegmentSalesConfigResponse(BaseModel):
    """Segment sales configuration for API response."""
    segment_tier: str
    primary_motion: str
    secondary_motion: Optional[str]
    allowed_rep_types: List[str]
    target_accounts_per_rep: int
    target_arr_per_rep: float
    avg_deal_cycle_days: int
    requires_se: bool
    requires_field_visit: bool


# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────


def _allocation_to_response(alloc: MSASalesAllocation) -> SalesAllocationResponse:
    """Convert allocation to API response."""
    return SalesAllocationResponse(
        sdr_count=alloc.sdr_count,
        bdr_count=alloc.bdr_count,
        inside_ae_count=alloc.inside_ae_count,
        inside_am_count=alloc.inside_am_count,
        field_ae_count=alloc.field_ae_count,
        field_am_count=alloc.field_am_count,
        strategic_ae_count=alloc.strategic_ae_count,
        major_am_count=alloc.major_am_count,
        se_count=alloc.se_count,
        partner_mgr_count=alloc.partner_mgr_count,
        sales_mgr_count=alloc.sales_mgr_count,
        total_quota_usd=alloc.total_quota_usd,
        new_logo_quota_usd=alloc.new_logo_quota_usd,
        expansion_quota_usd=alloc.expansion_quota_usd,
        quota_attainment_pct=alloc.quota_attainment_pct,
        total_quota_bearing_headcount=alloc.total_quota_bearing_headcount,
        total_headcount=alloc.total_headcount,
    )


def _distribution_to_response(dist: MSASegmentDistribution, arr_scale: float = 1.0) -> SegmentDistributionResponse:
    """Convert distribution to API response with ARR scaling."""
    return SegmentDistributionResponse(
        segment_tier=dist.segment_tier,
        total_accounts=dist.total_accounts,
        hq_accounts=dist.hq_accounts,
        branch_accounts=dist.branch_accounts,
        arr_usd=dist.arr_usd * arr_scale,
        avg_mrr_usd=dist.avg_mrr_usd * arr_scale,
        whitespace_accounts=dist.whitespace_accounts,
        expansion_opportunities=dist.expansion_opportunities,
    )


def _msa_to_response(msa: MSA, arr_scale: float = 1.0) -> MSAResponse:
    """Convert MSA to API response with ARR scaling."""
    return MSAResponse(
        code=msa.code,
        name=msa.name,
        short_name=msa.short_name,
        state_codes=msa.state_codes,
        region=msa.region.value,
        population_2023=msa.population_2023,
        enterprise_establishments=msa.enterprise_establishments,
        has_fiber=msa.has_fiber,
        has_coax=msa.has_coax,
        infrastructure_type=msa.infrastructure_type.value,
        in_comcast_footprint=msa.in_comcast_footprint,
        comcast_coverage_pct=msa.comcast_coverage_pct,
        fiber_coverage_pct=msa.fiber_coverage_pct,
        priority_tier=msa.priority_tier,
        priority_score=msa.priority_score,
        tam_usd=msa.tam_usd,
        sam_usd=msa.sam_usd,
        current_arr_usd=msa.current_arr_usd * arr_scale,
        market_share_pct=msa.market_share_pct,
        sales_allocation=_allocation_to_response(msa.sales_allocation),
        segment_distribution=[_distribution_to_response(d, arr_scale) for d in msa.segment_distribution],
    )


def _get_arr_scale() -> float:
    """Get the ARR scaling factor from CB Config vs base MSA ARR."""
    try:
        from src.cb_config.store import CBConfigStore
        cb_store = CBConfigStore()
        cb_config = cb_store.get_config()
        enterprise_arr = cb_config.company_metrics.enterprise_arr
        
        # Calculate base MSA ARR sum
        registry = get_msa_registry()
        base_msa_arr = sum(m.current_arr_usd for m in registry.get_all())
        
        if enterprise_arr and enterprise_arr > 0 and base_msa_arr > 0:
            return enterprise_arr / base_msa_arr
    except Exception:
        pass
    return 1.0


def _msa_to_list_response(msa: MSA, arr_scale: float = 1.0) -> MSAListResponse:
    """Convert MSA to list response with ARR scaling."""
    total_accounts = sum(d.total_accounts for d in msa.segment_distribution)
    return MSAListResponse(
        code=msa.code,
        short_name=msa.short_name,
        region=msa.region.value,
        population_2023=msa.population_2023,
        enterprise_establishments=msa.enterprise_establishments,
        has_fiber=msa.has_fiber,
        has_coax=msa.has_coax,
        comcast_coverage_pct=msa.comcast_coverage_pct,
        fiber_coverage_pct=msa.fiber_coverage_pct,
        priority_tier=msa.priority_tier,
        priority_score=msa.priority_score,
        current_arr_usd=msa.current_arr_usd * arr_scale,
        total_quota_bearing_headcount=msa.sales_allocation.total_quota_bearing_headcount,
        total_accounts=total_accounts,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Summary Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/summary", response_model=MSASummary)
async def get_msa_summary():
    """Get summary of all MSA data including sales capacity."""
    registry = get_msa_registry()
    return registry.get_summary()


@router.get("/sales-capacity", response_model=SalesCapacitySummary)
async def get_sales_capacity():
    """Get sales capacity and headcount summary across all MSAs."""
    registry = get_msa_registry()
    return registry.get_sales_capacity_summary()


# ─────────────────────────────────────────────────────────────────────────────
# List Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/", response_model=List[MSAListResponse])
async def list_msas(
    region: Optional[str] = None,
    tier: Optional[int] = None,
    state: Optional[str] = None,
    min_coverage: Optional[float] = None,
    has_fiber: Optional[bool] = None,
    has_coax: Optional[bool] = None,
    min_priority_score: Optional[float] = None,
    sort_by: str = Query("priority_score", enum=["priority_score", "arr", "headcount", "accounts"]),
    limit: Optional[int] = None,
):
    """
    List MSAs with optional filters.
    
    Filters:
    - region: Filter by geographic region (northeast, midwest, south, west)
    - tier: Filter by priority tier (1, 2, 3)
    - state: Filter by state code (e.g., "CA", "NY")
    - min_coverage: Minimum Comcast coverage percentage
    - has_fiber: Filter to MSAs with fiber infrastructure
    - has_coax: Filter to MSAs with coax infrastructure
    - min_priority_score: Minimum priority score
    
    Sorting:
    - priority_score: Sort by calculated priority score (default)
    - arr: Sort by current ARR
    - headcount: Sort by quota-bearing headcount
    - accounts: Sort by total accounts
    """
    registry = get_msa_registry()
    msas = registry.get_all()
    
    # Apply filters
    if region:
        try:
            r = MSARegion(region)
            msas = [m for m in msas if m.region == r]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid region: {region}")
    
    if tier:
        msas = [m for m in msas if m.priority_tier == tier]
    
    if state:
        msas = [m for m in msas if state.upper() in m.state_codes]
    
    if min_coverage:
        msas = [m for m in msas if m.comcast_coverage_pct >= min_coverage]
    
    if has_fiber is not None:
        msas = [m for m in msas if m.has_fiber == has_fiber]
    
    if has_coax is not None:
        msas = [m for m in msas if m.has_coax == has_coax]
    
    if min_priority_score:
        msas = [m for m in msas if m.priority_score >= min_priority_score]
    
    # Sort
    if sort_by == "priority_score":
        msas = sorted(msas, key=lambda m: m.priority_score, reverse=True)
    elif sort_by == "arr":
        msas = sorted(msas, key=lambda m: m.current_arr_usd, reverse=True)
    elif sort_by == "headcount":
        msas = sorted(msas, key=lambda m: m.sales_allocation.total_quota_bearing_headcount, reverse=True)
    elif sort_by == "accounts":
        msas = sorted(msas, key=lambda m: sum(d.total_accounts for d in m.segment_distribution), reverse=True)
    
    # Limit
    if limit:
        msas = msas[:limit]
    
    # Get ARR scale from CB Config
    arr_scale = _get_arr_scale()
    
    return [_msa_to_list_response(m, arr_scale) for m in msas]


@router.get("/prioritized")
async def get_prioritized_msas(
    infrastructure: str = Query("fiber_coax", enum=["fiber_coax", "fiber", "coax", "any"]),
    min_coverage: float = 60,
    limit: int = 20,
):
    """
    Get prioritized MSAs based on infrastructure and coverage.
    
    This endpoint returns MSAs sorted by priority score, filtered by infrastructure type.
    Useful for sales territory planning and resource allocation.
    """
    registry = get_msa_registry()
    
    if infrastructure == "fiber_coax":
        msas = registry.get_fiber_coax()
    elif infrastructure == "fiber":
        msas = registry.get_with_fiber()
    elif infrastructure == "coax":
        msas = registry.get_with_coax()
    else:
        msas = registry.get_all()
    
    # Filter by coverage
    msas = [m for m in msas if m.comcast_coverage_pct >= min_coverage]
    
    # Sort by priority score
    msas = sorted(msas, key=lambda m: m.priority_score, reverse=True)[:limit]
    
    return {
        "count": len(msas),
        "filter": {
            "infrastructure": infrastructure,
            "min_coverage": min_coverage,
        },
        "msas": [_msa_to_list_response(m, _get_arr_scale()) for m in msas],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Detail Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/detail/{code}", response_model=MSAResponse)
async def get_msa_detail(code: str):
    """Get detailed MSA information including sales allocation and segment distribution."""
    registry = get_msa_registry()
    msa = registry.get_by_code(code)
    
    if not msa:
        # Try by name
        msa = registry.get_by_name(code)
    
    if not msa:
        raise HTTPException(status_code=404, detail=f"MSA {code} not found")
    
    return _msa_to_response(msa, _get_arr_scale())


@router.get("/by-name/{name}", response_model=MSAResponse)
async def get_msa_by_name(name: str):
    """Get MSA by short name (case-insensitive)."""
    registry = get_msa_registry()
    msa = registry.get_by_name(name)
    
    if not msa:
        raise HTTPException(status_code=404, detail=f"MSA '{name}' not found")
    
    return _msa_to_response(msa, _get_arr_scale())


# ─────────────────────────────────────────────────────────────────────────────
# Segment Distribution Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/segments/{segment_tier}/distribution")
async def get_segment_distribution_by_msa(
    segment_tier: str,
    sort_by: str = Query("arr", enum=["arr", "accounts", "hq_accounts", "whitespace"]),
    limit: Optional[int] = None,
):
    """
    Get distribution of a customer segment across all MSAs.
    
    Shows how many accounts (total, HQ, branch) of a specific segment tier
    are located in each MSA.
    """
    registry = get_msa_registry()
    results = registry.get_segment_distribution_by_msa(segment_tier)
    
    if not results:
        raise HTTPException(status_code=404, detail=f"No data found for segment {segment_tier}")
    
    # Sort
    sort_keys = {
        "arr": "arr_usd",
        "accounts": "total_accounts",
        "hq_accounts": "hq_accounts",
        "whitespace": "whitespace_accounts",
    }
    results = sorted(results, key=lambda x: x[sort_keys[sort_by]], reverse=True)
    
    if limit:
        results = results[:limit]
    
    # Calculate totals
    totals = {
        "total_accounts": sum(r["total_accounts"] for r in results),
        "hq_accounts": sum(r["hq_accounts"] for r in results),
        "branch_accounts": sum(r["branch_accounts"] for r in results),
        "arr_usd": sum(r["arr_usd"] for r in results),
        "whitespace_accounts": sum(r["whitespace_accounts"] for r in results),
        "expansion_opportunities": sum(r["expansion_opportunities"] for r in results),
    }
    
    return {
        "segment_tier": segment_tier,
        "msa_count": len(results),
        "totals": totals,
        "distribution": results,
    }


@router.get("/segments/hq-concentration")
async def get_hq_concentration():
    """
    Get HQ concentration analysis showing which MSAs have the most headquarters.
    
    Useful for strategic account planning and field sales allocation.
    """
    registry = get_msa_registry()
    msas = registry.get_all()
    
    results = []
    for msa in msas:
        total_hq = sum(d.hq_accounts for d in msa.segment_distribution)
        total_accounts = sum(d.total_accounts for d in msa.segment_distribution)
        hq_pct = (total_hq / total_accounts * 100) if total_accounts > 0 else 0
        
        results.append({
            "msa_code": msa.code,
            "msa_name": msa.short_name,
            "region": msa.region.value,
            "priority_tier": msa.priority_tier,
            "total_hq_accounts": total_hq,
            "total_accounts": total_accounts,
            "hq_percentage": round(hq_pct, 1),
            "has_fiber": msa.has_fiber,
            "strategic_ae_count": msa.sales_allocation.strategic_ae_count,
        })
    
    results = sorted(results, key=lambda x: x["total_hq_accounts"], reverse=True)
    
    return {
        "total_hq_accounts": sum(r["total_hq_accounts"] for r in results),
        "concentration": results,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Sales Configuration Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/sales-configs", response_model=List[SegmentSalesConfigResponse])
async def get_sales_configurations():
    """
    Get sales configurations for each customer segment.
    
    Shows which sales motions and rep types are appropriate for each segment tier,
    along with target metrics and deal characteristics.
    """
    configs = get_segment_sales_configs()
    return [
        SegmentSalesConfigResponse(
            segment_tier=c.segment_tier,
            primary_motion=c.primary_motion.value,
            secondary_motion=c.secondary_motion.value if c.secondary_motion else None,
            allowed_rep_types=[r.value for r in c.allowed_rep_types],
            target_accounts_per_rep=c.target_accounts_per_rep,
            target_arr_per_rep=c.target_arr_per_rep,
            avg_deal_cycle_days=c.avg_deal_cycle_days,
            requires_se=c.requires_se,
            requires_field_visit=c.requires_field_visit,
        )
        for c in configs
    ]


@router.get("/rep-types")
async def get_rep_types():
    """Get all available sales rep types with descriptions."""
    return {
        "rep_types": [
            {"value": RepType.SDR.value, "label": "Sales Development Rep", "category": "inside", "quota_bearing": False},
            {"value": RepType.BDR.value, "label": "Business Development Rep", "category": "inside", "quota_bearing": False},
            {"value": RepType.INSIDE_AE.value, "label": "Inside Account Executive", "category": "inside", "quota_bearing": True},
            {"value": RepType.INSIDE_AM.value, "label": "Inside Account Manager", "category": "inside", "quota_bearing": True},
            {"value": RepType.FIELD_AE.value, "label": "Field Account Executive", "category": "field", "quota_bearing": True},
            {"value": RepType.FIELD_AM.value, "label": "Field Account Manager", "category": "field", "quota_bearing": True},
            {"value": RepType.STRATEGIC_AE.value, "label": "Strategic Account Executive", "category": "field", "quota_bearing": True},
            {"value": RepType.MAJOR_AM.value, "label": "Major Account Manager", "category": "field", "quota_bearing": True},
            {"value": RepType.SE.value, "label": "Sales Engineer", "category": "specialist", "quota_bearing": False},
            {"value": RepType.PARTNER_MGR.value, "label": "Partner Manager", "category": "specialist", "quota_bearing": True},
            {"value": RepType.SALES_MGR.value, "label": "Sales Manager", "category": "leadership", "quota_bearing": False},
        ]
    }


@router.get("/sales-motions")
async def get_sales_motions():
    """Get all available sales motion types."""
    return {
        "motions": [
            {"value": SalesMotionType.DIGITAL.value, "label": "Digital / Self-Serve", "complexity": "low"},
            {"value": SalesMotionType.INSIDE_SALES.value, "label": "Inside Sales", "complexity": "medium"},
            {"value": SalesMotionType.FIELD_SALES.value, "label": "Field Sales", "complexity": "high"},
            {"value": SalesMotionType.STRATEGIC.value, "label": "Strategic / Named Accounts", "complexity": "very_high"},
            {"value": SalesMotionType.PARTNER.value, "label": "Partner / Channel", "complexity": "medium"},
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# Reference Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/regions")
async def list_regions():
    """List all geographic regions with MSA counts."""
    registry = get_msa_registry()
    return {
        "regions": [
            {
                "value": r.value,
                "label": r.value.title(),
                "msa_count": len(registry.get_by_region(r)),
            }
            for r in MSARegion
        ]
    }


@router.get("/tiers")
async def list_tiers():
    """List all priority tiers with details."""
    registry = get_msa_registry()
    return {
        "tiers": [
            {
                "tier": t,
                "label": f"Tier {t}",
                "count": len(registry.get_by_tier(t)),
                "description": {
                    1: "Top 10 markets - highest priority, full sales coverage",
                    2: "Markets 11-25 - high priority, strong sales presence",
                    3: "Markets 26-50 - standard priority, targeted coverage",
                }.get(t, ""),
            }
            for t in [1, 2, 3]
        ]
    }


@router.get("/infrastructure-types")
async def list_infrastructure_types():
    """List infrastructure types with counts."""
    registry = get_msa_registry()
    return {
        "types": [
            {"value": "fiber_coax", "label": "Fiber + Coax", "count": len(registry.get_fiber_coax())},
            {"value": "fiber", "label": "Fiber Only", "count": len([m for m in registry.get_all() if m.has_fiber and not m.has_coax])},
            {"value": "coax", "label": "Coax Only", "count": len([m for m in registry.get_all() if m.has_coax and not m.has_fiber])},
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# LLM-Driven Market Intelligence Endpoints
# ─────────────────────────────────────────────────────────────────────────────


class ProductOpportunityResponse(BaseModel):
    """Product opportunity for API response."""
    product_category: str
    tam_usd: float
    sam_usd: float
    current_penetration_pct: float
    growth_rate_cagr: str
    competitive_intensity: str
    key_competitors: List[str]
    recommended_focus: str


class SalesResourceRecommendationResponse(BaseModel):
    """Sales resource recommendation for API response."""
    recommended_sdr_count: int
    recommended_bdr_count: int
    recommended_inside_ae_count: int
    recommended_inside_am_count: int
    recommended_field_ae_count: int
    recommended_field_am_count: int
    recommended_strategic_ae_count: int
    recommended_major_am_count: int
    recommended_se_count: int
    recommended_partner_mgr_count: int
    recommended_sales_mgr_count: int
    recommended_total_quota_usd: float
    recommended_new_logo_quota_usd: float
    recommended_expansion_quota_usd: float
    headcount_rationale: str
    quota_methodology: str
    territory_structure: str


class MSAMarketIntelResponse(BaseModel):
    """MSA market intelligence for API response."""
    id: str
    msa_code: str
    msa_name: str
    generated_at: datetime
    llm_provider: str
    llm_model: str
    
    executive_summary: str
    market_dynamics: str
    
    total_enterprise_tam_usd: float
    total_enterprise_sam_usd: float
    tam_methodology: str
    
    product_opportunities: List[ProductOpportunityResponse]
    
    broadband_opportunity: str
    ethernet_opportunity: str
    fixed_wireless_opportunity: str
    mobile_enterprise_opportunity: str
    
    sdwan_sase_opportunity: str
    cybersecurity_opportunity: str
    ucaas_ccaas_opportunity: str
    
    competitive_overview: str
    primary_competitors: List[str]
    cb_competitive_position: str
    competitive_strengths: List[str]
    competitive_gaps: List[str]
    
    sales_resource_recommendation: SalesResourceRecommendationResponse
    recommended_sales_motion_mix: Dict[str, float]
    
    growth_priorities: List[Dict[str, Any]]
    quick_wins: List[str]
    long_term_plays: List[str]
    
    top_verticals: List[Dict[str, Any]]
    
    sources: List[str]
    data_freshness: str


class MSAIntelSummary(BaseModel):
    """Summary of MSA intel for list views."""
    msa_code: str
    msa_name: str
    generated_at: datetime
    llm_provider: str
    total_enterprise_tam_usd: float
    total_enterprise_sam_usd: float
    recommended_total_headcount: int
    recommended_total_quota_usd: float


def _intel_to_response(intel: MSAMarketIntel) -> MSAMarketIntelResponse:
    """Convert MSA intel to API response."""
    sr = intel.sales_resource_recommendation
    return MSAMarketIntelResponse(
        id=intel.id,
        msa_code=intel.msa_code,
        msa_name=intel.msa_name,
        generated_at=intel.generated_at,
        llm_provider=intel.llm_provider,
        llm_model=intel.llm_model,
        executive_summary=intel.executive_summary,
        market_dynamics=intel.market_dynamics,
        total_enterprise_tam_usd=intel.total_enterprise_tam_usd,
        total_enterprise_sam_usd=intel.total_enterprise_sam_usd,
        tam_methodology=intel.tam_methodology,
        product_opportunities=[
            ProductOpportunityResponse(
                product_category=po.product_category,
                tam_usd=po.tam_usd,
                sam_usd=po.sam_usd,
                current_penetration_pct=po.current_penetration_pct,
                growth_rate_cagr=po.growth_rate_cagr,
                competitive_intensity=po.competitive_intensity,
                key_competitors=po.key_competitors,
                recommended_focus=po.recommended_focus,
            )
            for po in intel.product_opportunities
        ],
        broadband_opportunity=intel.broadband_opportunity,
        ethernet_opportunity=intel.ethernet_opportunity,
        fixed_wireless_opportunity=intel.fixed_wireless_opportunity,
        mobile_enterprise_opportunity=intel.mobile_enterprise_opportunity,
        sdwan_sase_opportunity=intel.sdwan_sase_opportunity,
        cybersecurity_opportunity=intel.cybersecurity_opportunity,
        ucaas_ccaas_opportunity=intel.ucaas_ccaas_opportunity,
        competitive_overview=intel.competitive_overview,
        primary_competitors=intel.primary_competitors,
        cb_competitive_position=intel.cb_competitive_position,
        competitive_strengths=intel.competitive_strengths,
        competitive_gaps=intel.competitive_gaps,
        sales_resource_recommendation=SalesResourceRecommendationResponse(
            recommended_sdr_count=sr.recommended_sdr_count,
            recommended_bdr_count=sr.recommended_bdr_count,
            recommended_inside_ae_count=sr.recommended_inside_ae_count,
            recommended_inside_am_count=sr.recommended_inside_am_count,
            recommended_field_ae_count=sr.recommended_field_ae_count,
            recommended_field_am_count=sr.recommended_field_am_count,
            recommended_strategic_ae_count=sr.recommended_strategic_ae_count,
            recommended_major_am_count=sr.recommended_major_am_count,
            recommended_se_count=sr.recommended_se_count,
            recommended_partner_mgr_count=sr.recommended_partner_mgr_count,
            recommended_sales_mgr_count=sr.recommended_sales_mgr_count,
            recommended_total_quota_usd=sr.recommended_total_quota_usd,
            recommended_new_logo_quota_usd=sr.recommended_new_logo_quota_usd,
            recommended_expansion_quota_usd=sr.recommended_expansion_quota_usd,
            headcount_rationale=sr.headcount_rationale,
            quota_methodology=sr.quota_methodology,
            territory_structure=sr.territory_structure,
        ),
        recommended_sales_motion_mix=intel.recommended_sales_motion_mix,
        growth_priorities=intel.growth_priorities,
        quick_wins=intel.quick_wins,
        long_term_plays=intel.long_term_plays,
        top_verticals=intel.top_verticals,
        sources=intel.sources,
        data_freshness=intel.data_freshness,
    )


@router.post("/intel/generate-all")
async def generate_all_msa_intel(
    force: bool = False,
):
    """
    Generate LLM-powered market intelligence for ALL MSAs (async, sequential).
    
    Returns immediately with list of job_ids. Poll /api/jobs/{job_id} for status.
    Jobs run sequentially to avoid overloading the LLM API.
    """
    registry = get_msa_registry()
    research_service = get_msa_research_service()
    queue = get_job_queue()
    
    # Get all MSAs with Comcast infrastructure
    all_msas = [msa for msa in registry.get_all() if msa.has_fiber or msa.has_coax]
    
    jobs_created = []
    skipped = []
    
    for msa in all_msas:
        # Check cache if not forcing
        if not force:
            cached = research_service.get_cached_intel(msa.code)
            if cached:
                skipped.append({"msa_code": msa.code, "msa_name": msa.name, "reason": "cached"})
                continue
        
        # Prepare MSA data
        msa_data = {
            "msa_code": msa.code,
            "msa_name": msa.name,
            "region": msa.region.value,
            "population": msa.population_2023,
            "establishments": msa.enterprise_establishments,
            "has_fiber": msa.has_fiber,
            "has_coax": msa.has_coax,
            "comcast_coverage_pct": msa.comcast_coverage_pct,
            "current_arr": msa.current_arr_usd,
        }
        
        # Create job for this MSA
        job = queue.create_job(
            job_type=JobType.MSA_INTEL,
            target_id=msa.code,
            target_name=f"MSA Intel: {msa.name}",
        )
        jobs_created.append(job)
        
        from src.tasks.msa_tasks import generate_msa_intel
        generate_msa_intel.delay(job.id, msa.code, msa.name, msa_data)
    
    return {
        "status": "started",
        "total_msas": len(all_msas),
        "jobs_started": len(jobs_created),
        "skipped": len(skipped),
        "skipped_details": skipped,
        "job_ids": [j.id for j in jobs_created],
        "message": f"Started intel generation for {len(jobs_created)} MSAs. {len(skipped)} already cached."
    }


@router.post("/{msa_code}/intel/generate")
async def generate_msa_intel(
    msa_code: str,
    force: bool = False,
):
    """
    Generate LLM-powered market intelligence for an MSA (async).
    
    Returns immediately with job_id. Poll /api/jobs/{job_id} for status.
    When complete, use GET /api/msas/{msa_code}/intel to get the intelligence.
    
    Args:
        msa_code: The CBSA code of the MSA
        force: If True, regenerate even if cached intel exists
    """
    registry = get_msa_registry()
    research_service = get_msa_research_service()
    
    # Get MSA data
    msa = registry.get_by_code(msa_code)
    if not msa:
        raise HTTPException(status_code=404, detail=f"MSA {msa_code} not found")
    
    # Check cache (return immediately if exists and not forcing)
    if not force:
        cached = research_service.get_cached_intel(msa_code)
        if cached:
            return {
                "status": "cached",
                "msa_code": msa_code,
                "msa_name": msa.name,
                "message": "Using cached intelligence. Use force=true to regenerate.",
            }
    
    # Prepare MSA data for background task
    msa_data = {
        "msa_code": msa.code,
        "msa_name": msa.name,
        "region": msa.region.value,
        "population": msa.population_2023,
        "establishments": msa.enterprise_establishments,
        "has_fiber": msa.has_fiber,
        "has_coax": msa.has_coax,
        "comcast_coverage_pct": msa.comcast_coverage_pct,
        "current_arr": msa.current_arr_usd,
    }
    
    # Create a job to track progress
    queue = get_job_queue()
    job = queue.create_job(
        job_type=JobType.MSA_INTEL,
        target_id=msa_code,
        target_name=f"MSA Intel: {msa.name}",
    )
    queue.start_job(job.id)
    
    from src.tasks.msa_tasks import generate_msa_intel as msa_task
    msa_task.delay(job.id, msa_code, msa.name, msa_data)
    
    return {
        "status": "started",
        "job_id": job.id,
        "msa_code": msa_code,
        "msa_name": msa.name,
        "message": f"MSA intelligence generation started for {msa.name}. This may take 30-60 seconds.",
    }


@router.get("/{msa_code}/intel", response_model=MSAMarketIntelResponse)
async def get_msa_intel(msa_code: str):
    """
    Get cached market intelligence for an MSA.
    
    Returns 404 if no intel has been generated yet.
    """
    research_service = get_msa_research_service()
    intel = research_service.get_cached_intel(msa_code)
    
    if not intel:
        raise HTTPException(
            status_code=404,
            detail=f"No market intelligence found for MSA {msa_code}. Use POST /{msa_code}/intel/generate to create."
        )
    
    return _intel_to_response(intel)


@router.get("/intel/all", response_model=List[MSAIntelSummary])
async def get_all_msa_intel_summaries():
    """Get summaries of all generated MSA market intelligence."""
    research_service = get_msa_research_service()
    all_intel = research_service.get_all_cached_intel()
    
    summaries = []
    for code, intel in all_intel.items():
        sr = intel.sales_resource_recommendation
        total_headcount = (
            sr.recommended_sdr_count + sr.recommended_bdr_count +
            sr.recommended_inside_ae_count + sr.recommended_inside_am_count +
            sr.recommended_field_ae_count + sr.recommended_field_am_count +
            sr.recommended_strategic_ae_count + sr.recommended_major_am_count +
            sr.recommended_se_count + sr.recommended_partner_mgr_count +
            sr.recommended_sales_mgr_count
        )
        summaries.append(MSAIntelSummary(
            msa_code=intel.msa_code,
            msa_name=intel.msa_name,
            generated_at=intel.generated_at,
            llm_provider=intel.llm_provider,
            total_enterprise_tam_usd=intel.total_enterprise_tam_usd,
            total_enterprise_sam_usd=intel.total_enterprise_sam_usd,
            recommended_total_headcount=total_headcount,
            recommended_total_quota_usd=sr.recommended_total_quota_usd,
        ))
    
    return summaries


@router.get("/intel/status")
async def get_intel_generation_status():
    """Get status of MSA intel generation."""
    registry = get_msa_registry()
    research_service = get_msa_research_service()
    
    all_msas = registry.get_all()
    all_intel = research_service.get_all_cached_intel()
    
    generated_codes = set(all_intel.keys())
    
    return {
        "total_msas": len(all_msas),
        "intel_generated": len(generated_codes),
        "intel_pending": len(all_msas) - len(generated_codes),
        "generated_msas": [
            {"code": code, "name": intel.msa_name, "generated_at": intel.generated_at.isoformat()}
            for code, intel in all_intel.items()
        ],
        "pending_msas": [
            {"code": msa.code, "name": msa.short_name}
            for msa in all_msas
            if msa.code not in generated_codes
        ][:20],  # Limit to first 20 pending
    }


@router.post("/intel/save-cache")
async def save_msa_intel_cache():
    """
    Manually save the current in-memory MSA intel cache to disk.
    
    Use this before restarting the container to preserve generated intel.
    """
    research_service = get_msa_research_service()
    count = research_service.save_current_cache()
    
    return {
        "status": "saved",
        "entries_saved": count,
        "message": f"Successfully saved {count} MSA intel entries to disk."
    }
