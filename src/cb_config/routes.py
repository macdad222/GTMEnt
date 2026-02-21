"""API routes for Comcast Business configuration management."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime

from .models import (
    CBConfiguration,
    CompanyMetrics,
    SegmentConfig,
    GrowthDataPoint,
    SegmentMarketIntel,
    ProductConfig,
    SalesCapacityConfig,
    NationalSalesCapacity,
    RepTypeQuota,
    MSASalesOverride,
)
from .store import get_cb_config_store
from ..jobs.queue import get_job_queue
from ..jobs.models import JobType


router = APIRouter(tags=["CB Configuration"])


def _run_segment_intel_generation(job_id: str, tier: str, force: bool):
    """Background task to generate segment intel."""
    from .segment_research_service import get_segment_research_service
    
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


def _run_all_segments_intel_generation(job_id: str, force: bool):
    """Background task to generate intel for all segments."""
    from .segment_research_service import get_segment_research_service
    
    queue = get_job_queue()
    store = get_cb_config_store()
    
    try:
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


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════

class CompanyMetricsRequest(BaseModel):
    enterprise_arr: Optional[float] = None
    enterprise_accounts: Optional[int] = None
    growth_target_pct: Optional[float] = None
    fiscal_year: Optional[int] = None
    avg_mrr: Optional[float] = None
    growth_rate_actual: Optional[float] = None
    net_revenue_retention: Optional[float] = None
    gross_revenue_churn: Optional[float] = None
    cac_ratio: Optional[float] = None
    customer_lifetime_value: Optional[float] = None
    # Sales Bookings Targets
    bookings_target_2026_mrr: Optional[float] = None
    bookings_target_2027_mrr: Optional[float] = None
    bookings_target_2028_mrr: Optional[float] = None


class SegmentRequest(BaseModel):
    tier: str
    label: Optional[str] = None
    description: Optional[str] = None
    mrr_min: Optional[float] = None
    mrr_max: Optional[float] = None
    accounts: Optional[int] = None
    arr: Optional[float] = None
    avg_mrr: Optional[float] = None
    growth_potential: Optional[float] = None
    churn_risk: Optional[float] = None
    attach_opportunity: Optional[float] = None
    typical_industries: Optional[List[str]] = None
    key_products: Optional[List[str]] = None
    sales_motion: Optional[str] = None


class GrowthDataRequest(BaseModel):
    data: List[GrowthDataPoint]


class ProductRequest(BaseModel):
    """Request to create or update a product."""
    id: str
    name: str
    category: str
    description: Optional[str] = ""
    current_arr: Optional[float] = 0.0
    current_penetration_pct: Optional[float] = 0.0
    yoy_growth_pct: Optional[float] = 0.0
    market_position: Optional[str] = "growing"
    market_rank: Optional[int] = 3
    key_competitors: Optional[List[str]] = None
    competitive_strengths: Optional[List[str]] = None
    competitive_gaps: Optional[List[str]] = None
    is_launched: Optional[bool] = True
    launch_date: Optional[str] = None
    maturity: Optional[str] = "mature"
    target_penetration_pct: Optional[float] = 0.0
    target_arr_growth_pct: Optional[float] = 0.0


class RepTypeQuotaRequest(BaseModel):
    """Request for a single rep type quota."""
    rep_type: str
    rep_type_label: str
    count: int = 0
    quota_per_rep_mrr: float = 0.0  # MRR sold quota per rep per year
    is_quota_bearing: bool = True


class NationalSalesCapacityRequest(BaseModel):
    """Request to update national sales capacity.
    
    All quotas are MRR-based (Monthly Recurring Revenue sold per year).
    The rule_of_78_factor accounts for when MRR is sold during the year:
    - MRR sold in Jan contributes 12 months of ARR in year 1
    - MRR sold in Dec contributes only 1 month of ARR in year 1
    - Average factor = 6.5 (assumes even distribution)
    """
    fiscal_year: Optional[int] = 2026
    rep_quotas: Optional[List[RepTypeQuotaRequest]] = None
    total_headcount: Optional[int] = None
    total_quota_mrr: Optional[float] = None  # Total MRR sold quota for the year
    new_logo_quota_pct: Optional[float] = 60.0
    expansion_quota_pct: Optional[float] = 40.0
    avg_ramp_time_months: Optional[int] = 6
    avg_quota_attainment_pct: Optional[float] = 85.0
    attrition_rate_pct: Optional[float] = 15.0
    rule_of_78_factor: Optional[float] = 6.5  # Adjust based on sales seasonality


class MSASalesOverrideRequest(BaseModel):
    """Request to set an MSA sales override."""
    msa_name: str
    sdr_count: Optional[int] = None
    bdr_count: Optional[int] = None
    inside_ae_count: Optional[int] = None
    inside_am_count: Optional[int] = None
    field_ae_count: Optional[int] = None
    field_am_count: Optional[int] = None
    strategic_ae_count: Optional[int] = None
    major_am_count: Optional[int] = None
    se_count: Optional[int] = None
    partner_mgr_count: Optional[int] = None
    sales_mgr_count: Optional[int] = None
    total_quota_override_usd: Optional[float] = None
    new_logo_quota_override_usd: Optional[float] = None
    notes: Optional[str] = ""


class ConfigResponse(BaseModel):
    id: str
    updated_at: datetime
    updated_by: str
    company_metrics: CompanyMetrics
    segments: List[SegmentConfig]
    growth_trajectory: List[GrowthDataPoint]
    primary_markets: List[str]
    key_competitors: List[str]


class SegmentIntelResponse(BaseModel):
    id: str
    segment_tier: str
    generated_at: datetime
    llm_provider: str
    llm_model: str
    executive_summary: str
    tam_estimate: float
    tam_methodology: str
    sam_estimate: float
    growth_rate_cagr: str
    total_market_customers: int = 0
    total_market_revenue: float = 0.0
    buyer_personas: List[dict]
    competitive_landscape: str
    primary_competitors: List[str]
    competitive_strengths: List[str]
    competitive_weaknesses: List[str]
    growth_strategies: List[dict]
    pricing_insights: str
    typical_deal_size: str
    pricing_trends: List[str]
    attach_opportunities: List[dict]
    key_takeaways: List[str]
    sources: List[str]


class DashboardDataResponse(BaseModel):
    """Aggregated data for the dashboard."""
    stats: List[dict]
    segment_data: List[dict]
    growth_data: List[dict]
    trends: List[dict]


# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/cb-config", response_model=ConfigResponse)
async def get_configuration():
    """Get the complete CB configuration."""
    store = get_cb_config_store()
    config = store.get_config()
    return ConfigResponse(
        id=config.id,
        updated_at=config.updated_at,
        updated_by=config.updated_by,
        company_metrics=config.company_metrics,
        segments=config.segments,
        growth_trajectory=config.growth_trajectory,
        primary_markets=config.primary_markets,
        key_competitors=config.key_competitors,
    )


@router.put("/cb-config/company-metrics", response_model=ConfigResponse)
async def update_company_metrics(request: CompanyMetricsRequest):
    """Update company-wide metrics."""
    store = get_cb_config_store()
    config = store.get_config()
    
    # Merge with existing metrics
    current = config.company_metrics
    updated = CompanyMetrics(
        enterprise_arr=request.enterprise_arr if request.enterprise_arr is not None else current.enterprise_arr,
        enterprise_accounts=request.enterprise_accounts if request.enterprise_accounts is not None else current.enterprise_accounts,
        growth_target_pct=request.growth_target_pct if request.growth_target_pct is not None else current.growth_target_pct,
        fiscal_year=request.fiscal_year if request.fiscal_year is not None else current.fiscal_year,
        avg_mrr=request.avg_mrr if request.avg_mrr is not None else current.avg_mrr,
        growth_rate_actual=request.growth_rate_actual if request.growth_rate_actual is not None else current.growth_rate_actual,
        net_revenue_retention=request.net_revenue_retention if request.net_revenue_retention is not None else current.net_revenue_retention,
        gross_revenue_churn=request.gross_revenue_churn if request.gross_revenue_churn is not None else current.gross_revenue_churn,
        cac_ratio=request.cac_ratio if request.cac_ratio is not None else current.cac_ratio,
        customer_lifetime_value=request.customer_lifetime_value if request.customer_lifetime_value is not None else current.customer_lifetime_value,
        bookings_target_2026_mrr=request.bookings_target_2026_mrr if request.bookings_target_2026_mrr is not None else current.bookings_target_2026_mrr,
        bookings_target_2027_mrr=request.bookings_target_2027_mrr if request.bookings_target_2027_mrr is not None else current.bookings_target_2027_mrr,
        bookings_target_2028_mrr=request.bookings_target_2028_mrr if request.bookings_target_2028_mrr is not None else current.bookings_target_2028_mrr,
    )
    
    config = store.update_company_metrics(updated)
    return ConfigResponse(
        id=config.id,
        updated_at=config.updated_at,
        updated_by=config.updated_by,
        company_metrics=config.company_metrics,
        segments=config.segments,
        growth_trajectory=config.growth_trajectory,
        primary_markets=config.primary_markets,
        key_competitors=config.key_competitors,
    )


@router.put("/cb-config/segments/{tier}", response_model=ConfigResponse)
async def update_segment(tier: str, request: SegmentRequest):
    """Update a specific segment's configuration."""
    store = get_cb_config_store()
    existing = store.get_segment(tier)
    
    if not existing:
        raise HTTPException(status_code=404, detail=f"Segment {tier} not found")
    
    # Merge with existing segment
    updated = SegmentConfig(
        tier=tier,
        label=request.label if request.label is not None else existing.label,
        description=request.description if request.description is not None else existing.description,
        mrr_min=request.mrr_min if request.mrr_min is not None else existing.mrr_min,
        mrr_max=request.mrr_max if request.mrr_max is not None else existing.mrr_max,
        accounts=request.accounts if request.accounts is not None else existing.accounts,
        arr=request.arr if request.arr is not None else existing.arr,
        avg_mrr=request.avg_mrr if request.avg_mrr is not None else existing.avg_mrr,
        growth_potential=request.growth_potential if request.growth_potential is not None else existing.growth_potential,
        churn_risk=request.churn_risk if request.churn_risk is not None else existing.churn_risk,
        attach_opportunity=request.attach_opportunity if request.attach_opportunity is not None else existing.attach_opportunity,
        typical_industries=request.typical_industries if request.typical_industries is not None else existing.typical_industries,
        key_products=request.key_products if request.key_products is not None else existing.key_products,
        sales_motion=request.sales_motion if request.sales_motion is not None else existing.sales_motion,
    )
    
    config = store.update_segment(updated)
    return ConfigResponse(
        id=config.id,
        updated_at=config.updated_at,
        updated_by=config.updated_by,
        company_metrics=config.company_metrics,
        segments=config.segments,
        growth_trajectory=config.growth_trajectory,
        primary_markets=config.primary_markets,
        key_competitors=config.key_competitors,
    )


@router.put("/cb-config/growth-trajectory", response_model=ConfigResponse)
async def update_growth_trajectory(request: GrowthDataRequest):
    """Update the growth trajectory data."""
    store = get_cb_config_store()
    config = store.update_growth_trajectory(request.data)
    return ConfigResponse(
        id=config.id,
        updated_at=config.updated_at,
        updated_by=config.updated_by,
        company_metrics=config.company_metrics,
        segments=config.segments,
        growth_trajectory=config.growth_trajectory,
        primary_markets=config.primary_markets,
        key_competitors=config.key_competitors,
    )


@router.get("/cb-config/segments/{tier}")
async def get_segment(tier: str):
    """Get a specific segment configuration."""
    store = get_cb_config_store()
    segment = store.get_segment(tier)
    if not segment:
        raise HTTPException(status_code=404, detail=f"Segment {tier} not found")
    return segment


# ═══════════════════════════════════════════════════════════════════════════
# DASHBOARD DATA ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/cb-config/dashboard-data", response_model=DashboardDataResponse)
async def get_dashboard_data():
    """Get aggregated data formatted for the dashboard."""
    store = get_cb_config_store()
    config = store.get_config()
    
    # Format stats
    metrics = config.company_metrics
    stats = [
        {
            "name": "Enterprise ARR",
            "value": f"${metrics.enterprise_arr / 1_000_000_000:.1f}B",
            "change": f"+{metrics.growth_rate_actual:.0f}%",
            "changeType": "positive" if metrics.growth_rate_actual > 0 else "negative",
            "icon": "CurrencyDollarIcon",
        },
        {
            "name": "Enterprise Accounts",
            "value": f"{metrics.enterprise_accounts:,}",
            "change": "+8.2%",  # Could be calculated from historical data
            "changeType": "positive",
            "icon": "BuildingOffice2Icon",
        },
        {
            "name": "Growth Target",
            "value": f"{metrics.growth_target_pct:.0f}%",
            "change": "YoY",
            "changeType": "neutral",
            "icon": "RocketLaunchIcon",
        },
        {
            "name": "Avg MRR",
            "value": f"${metrics.avg_mrr / 1000:.1f}K",
            "change": "+5.4%",  # Could be calculated
            "changeType": "positive",
            "icon": "ChartBarIcon",
        },
    ]
    
    # Format segment data
    colors = ['#0084f4', '#36a5ff', '#ec7612', '#f19432', '#fad5a5']
    segment_data = []
    for i, seg in enumerate(config.segments):
        segment_data.append({
            "tier": seg.tier.replace("tier_", "").upper(),
            "label": seg.label.split(": ")[1] if ": " in seg.label else seg.label,
            "arr": seg.arr / 1_000_000,  # In millions
            "accounts": seg.accounts,
            "color": colors[i % len(colors)],
        })
    
    # Format growth data (quarterly)
    growth_data = [
        {"period": gd.period, "actual": gd.actual, "target": gd.target}
        for gd in config.growth_trajectory
    ]
    
    # Trends would come from market intel - using placeholder for now
    trends = [
        {"title": "SD-WAN adoption accelerating", "direction": "up", "magnitude": "18–22% CAGR"},
        {"title": "SASE convergence: SD-WAN + cloud security", "direction": "up", "magnitude": "25%+ CAGR"},
        {"title": "Enterprises outsourcing network operations", "direction": "up", "magnitude": "10–12% CAGR"},
        {"title": "Fiber upgrade cycle in enterprise", "direction": "up", "magnitude": "Moderate growth"},
    ]
    
    return DashboardDataResponse(
        stats=stats,
        segment_data=segment_data,
        growth_data=growth_data,
        trends=trends,
    )


# ═══════════════════════════════════════════════════════════════════════════
# PRODUCT PORTFOLIO ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/cb-config/products")
async def get_products():
    """Get all products in the portfolio."""
    store = get_cb_config_store()
    products = store.get_products()
    return {"products": [p.model_dump() for p in products]}


@router.get("/cb-config/products/{product_id}")
async def get_product(product_id: str):
    """Get a specific product by ID."""
    store = get_cb_config_store()
    product = store.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return product.model_dump()


@router.put("/cb-config/products/{product_id}")
async def update_product(product_id: str, request: ProductRequest):
    """Update a specific product."""
    store = get_cb_config_store()
    existing = store.get_product(product_id)
    
    if not existing:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    
    # Merge with existing product
    updated = ProductConfig(
        id=product_id,
        name=request.name,
        category=request.category,
        description=request.description or existing.description,
        current_arr=request.current_arr if request.current_arr is not None else existing.current_arr,
        current_penetration_pct=request.current_penetration_pct if request.current_penetration_pct is not None else existing.current_penetration_pct,
        yoy_growth_pct=request.yoy_growth_pct if request.yoy_growth_pct is not None else existing.yoy_growth_pct,
        market_position=request.market_position or existing.market_position,
        market_rank=request.market_rank if request.market_rank is not None else existing.market_rank,
        key_competitors=request.key_competitors if request.key_competitors is not None else existing.key_competitors,
        competitive_strengths=request.competitive_strengths if request.competitive_strengths is not None else existing.competitive_strengths,
        competitive_gaps=request.competitive_gaps if request.competitive_gaps is not None else existing.competitive_gaps,
        is_launched=request.is_launched if request.is_launched is not None else existing.is_launched,
        launch_date=request.launch_date if request.launch_date is not None else existing.launch_date,
        maturity=request.maturity or existing.maturity,
        target_penetration_pct=request.target_penetration_pct if request.target_penetration_pct is not None else existing.target_penetration_pct,
        target_arr_growth_pct=request.target_arr_growth_pct if request.target_arr_growth_pct is not None else existing.target_arr_growth_pct,
    )
    
    store.update_product(updated)
    return {"status": "updated", "product": updated.model_dump()}


@router.post("/cb-config/products")
async def add_product(request: ProductRequest):
    """Add a new product to the portfolio."""
    store = get_cb_config_store()
    
    # Check if product already exists
    existing = store.get_product(request.id)
    if existing:
        raise HTTPException(status_code=400, detail=f"Product {request.id} already exists")
    
    new_product = ProductConfig(
        id=request.id,
        name=request.name,
        category=request.category,
        description=request.description or "",
        current_arr=request.current_arr or 0.0,
        current_penetration_pct=request.current_penetration_pct or 0.0,
        yoy_growth_pct=request.yoy_growth_pct or 0.0,
        market_position=request.market_position or "emerging",
        market_rank=request.market_rank or 5,
        key_competitors=request.key_competitors or [],
        competitive_strengths=request.competitive_strengths or [],
        competitive_gaps=request.competitive_gaps or [],
        is_launched=request.is_launched if request.is_launched is not None else True,
        launch_date=request.launch_date,
        maturity=request.maturity or "emerging",
        target_penetration_pct=request.target_penetration_pct or 0.0,
        target_arr_growth_pct=request.target_arr_growth_pct or 0.0,
    )
    
    store.add_product(new_product)
    return {"status": "created", "product": new_product.model_dump()}


@router.delete("/cb-config/products/{product_id}")
async def delete_product(product_id: str):
    """Delete a product from the portfolio."""
    store = get_cb_config_store()
    success = store.delete_product(product_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return {"status": "deleted", "product_id": product_id}


# ═══════════════════════════════════════════════════════════════════════════
# SALES CAPACITY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/cb-config/sales-capacity")
async def get_sales_capacity():
    """Get the complete sales capacity configuration."""
    store = get_cb_config_store()
    capacity = store.get_sales_capacity()
    return capacity.model_dump()


@router.get("/cb-config/sales-capacity/national")
async def get_national_sales_capacity():
    """Get national-level sales capacity configuration."""
    store = get_cb_config_store()
    capacity = store.get_sales_capacity()
    return capacity.national.model_dump()


@router.put("/cb-config/sales-capacity/national")
async def update_national_sales_capacity(request: NationalSalesCapacityRequest):
    """Update national sales capacity configuration.
    
    All quotas are MRR-based. The response includes calculated ARR impact
    using the Rule of 78 factor.
    """
    store = get_cb_config_store()
    current = store.get_sales_capacity().national
    
    # Convert request rep quotas to model
    rep_quotas = []
    if request.rep_quotas:
        for rq in request.rep_quotas:
            rep_quotas.append(RepTypeQuota(
                rep_type=rq.rep_type,
                rep_type_label=rq.rep_type_label,
                count=rq.count,
                quota_per_rep_mrr=rq.quota_per_rep_mrr,
                is_quota_bearing=rq.is_quota_bearing,
            ))
    else:
        rep_quotas = current.rep_quotas
    
    # Calculate totals if not provided
    total_headcount = request.total_headcount
    if total_headcount is None:
        total_headcount = sum(rq.count for rq in rep_quotas)
    
    total_quota_mrr = request.total_quota_mrr
    if total_quota_mrr is None:
        total_quota_mrr = sum(rq.count * rq.quota_per_rep_mrr for rq in rep_quotas if rq.is_quota_bearing)
    
    rule_of_78_factor = request.rule_of_78_factor if request.rule_of_78_factor is not None else current.rule_of_78_factor
    
    updated = NationalSalesCapacity(
        fiscal_year=request.fiscal_year if request.fiscal_year is not None else current.fiscal_year,
        rep_quotas=rep_quotas,
        total_headcount=total_headcount,
        total_quota_mrr=total_quota_mrr,
        new_logo_quota_pct=request.new_logo_quota_pct if request.new_logo_quota_pct is not None else current.new_logo_quota_pct,
        expansion_quota_pct=request.expansion_quota_pct if request.expansion_quota_pct is not None else current.expansion_quota_pct,
        avg_ramp_time_months=request.avg_ramp_time_months if request.avg_ramp_time_months is not None else current.avg_ramp_time_months,
        avg_quota_attainment_pct=request.avg_quota_attainment_pct if request.avg_quota_attainment_pct is not None else current.avg_quota_attainment_pct,
        attrition_rate_pct=request.attrition_rate_pct if request.attrition_rate_pct is not None else current.attrition_rate_pct,
        rule_of_78_factor=rule_of_78_factor,
    )
    
    store.update_national_sales_capacity(updated)
    
    # Calculate ARR impacts for the response
    year1_arr_impact = total_quota_mrr * rule_of_78_factor
    full_run_rate_arr = total_quota_mrr * 12
    
    return {
        "status": "updated",
        "national": updated.model_dump(),
        "calculated": {
            "year1_arr_impact": year1_arr_impact,
            "full_run_rate_arr": full_run_rate_arr,
            "explanation": f"${total_quota_mrr/1_000_000:.1f}M MRR sold × {rule_of_78_factor} = ${year1_arr_impact/1_000_000:.1f}M Year 1 ARR impact. Full run-rate = ${full_run_rate_arr/1_000_000:.1f}M ARR"
        }
    }


@router.get("/cb-config/sales-capacity/msa")
async def get_all_msa_overrides():
    """Get all MSA-specific sales overrides."""
    store = get_cb_config_store()
    capacity = store.get_sales_capacity()
    return {
        "count": len(capacity.msa_overrides),
        "overrides": {code: o.model_dump() for code, o in capacity.msa_overrides.items()},
    }


@router.get("/cb-config/sales-capacity/msa/{msa_code}")
async def get_msa_override(msa_code: str):
    """Get the sales override for a specific MSA."""
    store = get_cb_config_store()
    override = store.get_msa_override(msa_code)
    if not override:
        return {"status": "no_override", "msa_code": msa_code, "message": "Using calculated values"}
    return {"status": "has_override", "override": override.model_dump()}


@router.put("/cb-config/sales-capacity/msa/{msa_code}")
async def update_msa_override(msa_code: str, request: MSASalesOverrideRequest):
    """Update or create an MSA-specific sales override."""
    store = get_cb_config_store()
    
    override = MSASalesOverride(
        msa_code=msa_code,
        msa_name=request.msa_name,
        sdr_count=request.sdr_count,
        bdr_count=request.bdr_count,
        inside_ae_count=request.inside_ae_count,
        inside_am_count=request.inside_am_count,
        field_ae_count=request.field_ae_count,
        field_am_count=request.field_am_count,
        strategic_ae_count=request.strategic_ae_count,
        major_am_count=request.major_am_count,
        se_count=request.se_count,
        partner_mgr_count=request.partner_mgr_count,
        sales_mgr_count=request.sales_mgr_count,
        total_quota_override_usd=request.total_quota_override_usd,
        new_logo_quota_override_usd=request.new_logo_quota_override_usd,
        notes=request.notes or "",
    )
    
    store.update_msa_override(override)
    return {"status": "updated", "override": override.model_dump()}


@router.delete("/cb-config/sales-capacity/msa/{msa_code}")
async def delete_msa_override(msa_code: str):
    """Delete an MSA-specific override (will use calculated values)."""
    store = get_cb_config_store()
    success = store.delete_msa_override(msa_code)
    if not success:
        raise HTTPException(status_code=404, detail=f"No override found for MSA {msa_code}")
    return {"status": "deleted", "msa_code": msa_code}


# ═══════════════════════════════════════════════════════════════════════════
# SEGMENT INTEL ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/cb-config/segments/{tier}/intel")
async def get_segment_intel(tier: str):
    """Get market intelligence for a specific segment."""
    store = get_cb_config_store()
    intel = store.get_segment_intel(tier)
    if not intel:
        return {"status": "not_generated", "segment_tier": tier}
    return {"status": "generated", "intel": intel}


@router.get("/cb-config/intel/all")
async def get_all_segment_intel():
    """Get market intelligence for all segments."""
    store = get_cb_config_store()
    all_intel = store.get_all_segment_intel()
    return {
        "count": len(all_intel),
        "intel": {tier: intel.model_dump() for tier, intel in all_intel.items()},
    }


@router.delete("/cb-config/segments/{tier}/intel")
async def delete_segment_intel(tier: str):
    """Delete market intelligence for a specific segment."""
    store = get_cb_config_store()
    success = store.delete_segment_intel(tier)
    if not success:
        raise HTTPException(status_code=404, detail=f"No intel found for segment {tier}")
    return {"message": f"Intel for segment {tier} deleted"}


# ═══════════════════════════════════════════════════════════════════════════
# SEGMENT RESEARCH GENERATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/cb-config/segments/{tier}/intel/generate")
async def generate_segment_intel(
    tier: str, 
    force: bool = False,
):
    """
    Generate market intelligence for a specific segment using LLM (async).
    
    Returns immediately with job_id. Poll /api/jobs/{job_id} for status.
    """
    store = get_cb_config_store()
    segment = store.get_segment(tier)
    if not segment:
        raise HTTPException(status_code=404, detail=f"Segment {tier} not found")
    
    # Create a job to track progress
    queue = get_job_queue()
    job = queue.create_job(
        job_type=JobType.SEGMENT_INTEL,
        target_id=tier,
        target_name=f"Segment Intel: {segment.label}",
    )
    queue.start_job(job.id)
    
    # Run in background
    from src.tasks.segment_tasks import generate_segment_intel as seg_task
    seg_task.delay(job.id, tier, force)
    
    return {
        "status": "started",
        "job_id": job.id,
        "segment_tier": tier,
        "message": f"Segment intelligence generation started for {segment.label}. This may take 30-60 seconds.",
    }


@router.post("/cb-config/intel/generate-all")
async def generate_all_segment_intel(
    force: bool = False,
):
    """
    Generate market intelligence for all segments using LLM (async).
    
    Returns immediately with job_id. Poll /api/jobs/{job_id} for status.
    """
    store = get_cb_config_store()
    segments = store.get_config().segments
    
    # Create a job to track progress
    queue = get_job_queue()
    job = queue.create_job(
        job_type=JobType.SEGMENT_INTEL,
        target_id="all",
        target_name=f"Segment Intel: All {len(segments)} Segments",
    )
    queue.start_job(job.id)
    
    # Run in background
    from src.tasks.segment_tasks import generate_all_segments_intel as all_seg_task
    all_seg_task.delay(job.id, force)
    
    return {
        "status": "started",
        "job_id": job.id,
        "message": f"Generating intelligence for {len(segments)} segments. This may take 2-3 minutes.",
    }

