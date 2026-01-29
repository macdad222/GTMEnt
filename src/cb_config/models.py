"""Comcast Business configuration models for storing company-specific data."""

from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class SegmentConfig(BaseModel):
    """Configuration for a single enterprise segment tier."""
    tier: str  # e.g., "tier_e1", "tier_e2", etc.
    label: str  # e.g., "E1: $1.5k–$10k"
    description: str
    mrr_min: float  # Minimum MRR in dollars
    mrr_max: Optional[float]  # Maximum MRR (None for highest tier)
    accounts: int = 0
    arr: float = 0.0  # Annual recurring revenue
    avg_mrr: float = 0.0
    growth_potential: float = 0.5  # 0-1 score
    churn_risk: float = 0.1  # 0-1 score
    attach_opportunity: float = 0.5  # 0-1 score
    
    # Additional segment metadata
    typical_industries: List[str] = []
    key_products: List[str] = []
    sales_motion: str = ""  # e.g., "digital-led", "inside sales", "field sales", "strategic"


class GrowthDataPoint(BaseModel):
    """Single data point for growth trajectory."""
    period: str  # e.g., "Jan", "Q1 2025"
    actual: float  # Actual ARR in billions
    target: float  # Target ARR in billions


class CompanyMetrics(BaseModel):
    """Top-level company metrics."""
    enterprise_arr: float = 3_000_000_000  # $3B default
    enterprise_accounts: int = 18125
    growth_target_pct: float = 15.0  # 15% annual growth
    fiscal_year: int = 2025
    avg_mrr: float = 13800
    growth_rate_actual: float = 14.0  # Current actual growth rate %
    
    # Additional KPIs
    net_revenue_retention: float = 105.0  # NRR %
    gross_revenue_churn: float = 8.0  # Annual churn %
    cac_ratio: float = 1.2  # CAC payback in years
    customer_lifetime_value: float = 150000  # Average CLV
    
    # Sales Bookings Targets (MRR sold per year)
    bookings_target_2026_mrr: float = 50_000_000  # $50M MRR sold in 2026
    bookings_target_2027_mrr: float = 60_000_000  # $60M MRR sold in 2027
    bookings_target_2028_mrr: float = 72_000_000  # $72M MRR sold in 2028


# ─────────────────────────────────────────────────────────────────────────────
# Product Portfolio Configuration
# ─────────────────────────────────────────────────────────────────────────────


class ProductConfig(BaseModel):
    """Configurable product in the portfolio."""
    id: str
    name: str
    category: str  # connectivity, secure_networking, cybersecurity, voice_collab, data_center, mobile
    description: str = ""
    
    # Current performance (editable)
    current_arr: float = 0.0  # Current ARR from this product
    current_penetration_pct: float = 0.0  # % of enterprise accounts with product
    yoy_growth_pct: float = 0.0  # Year-over-year growth
    
    # Market position
    market_position: str = "growing"  # leader, strong, growing, challenger, emerging, not_yet
    market_rank: int = 3  # 1-5 where 1 is market leader
    
    # Competitive info
    key_competitors: List[str] = Field(default_factory=list)
    competitive_strengths: List[str] = Field(default_factory=list)
    competitive_gaps: List[str] = Field(default_factory=list)
    
    # Status
    is_launched: bool = True
    launch_date: Optional[str] = None  # For upcoming products
    maturity: str = "mature"  # emerging, growing, mature, declining
    
    # Targets for planning
    target_penetration_pct: float = 0.0
    target_arr_growth_pct: float = 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Sales Capacity Configuration
# ─────────────────────────────────────────────────────────────────────────────


class RepTypeQuota(BaseModel):
    """Quota and count for a specific rep type."""
    rep_type: str  # sdr, bdr, inside_ae, inside_am, field_ae, field_am, strategic_ae, major_am, se, partner_mgr, sales_mgr
    rep_type_label: str
    count: int = 0
    # MRR-based quota: total MRR a rep is expected to sell in the fiscal year
    quota_per_rep_mrr: float = 0.0  # Annual MRR sold quota per rep
    is_quota_bearing: bool = True


class NationalSalesCapacity(BaseModel):
    """National-level sales capacity configuration."""
    fiscal_year: int = 2026
    
    # Rep types with counts and quotas (MRR-based)
    rep_quotas: List[RepTypeQuota] = Field(default_factory=list)
    
    # Aggregate targets (MRR-based)
    total_headcount: int = 0
    total_quota_mrr: float = 0.0  # Total MRR sold quota for the year
    new_logo_quota_pct: float = 60.0
    expansion_quota_pct: float = 40.0
    
    # Productivity assumptions
    avg_ramp_time_months: int = 6
    avg_quota_attainment_pct: float = 85.0
    attrition_rate_pct: float = 15.0
    
    # Rule of 78 parameters
    # The Rule of 78 accounts for when MRR is sold during the year
    # MRR sold in Jan contributes 12 months of revenue, Dec only 1 month
    # Sum of 12+11+10+...+1 = 78; average month = 78/12 = 6.5
    rule_of_78_factor: float = 6.5  # Default: assumes even sales distribution
    # Allows adjustment if sales are front-loaded (higher factor) or back-loaded (lower)


class MSASalesOverride(BaseModel):
    """Per-MSA override for sales capacity."""
    msa_code: str
    msa_name: str
    
    # Override rep counts (None = use calculated)
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
    
    # Override quotas
    total_quota_override_usd: Optional[float] = None
    new_logo_quota_override_usd: Optional[float] = None
    
    # Notes
    notes: str = ""
    updated_at: Optional[datetime] = None


class SalesCapacityConfig(BaseModel):
    """Complete sales capacity configuration."""
    national: NationalSalesCapacity = Field(default_factory=NationalSalesCapacity)
    msa_overrides: Dict[str, MSASalesOverride] = Field(default_factory=dict)


class CBConfiguration(BaseModel):
    """Complete Comcast Business configuration."""
    id: str = "cb_config_v1"
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: str = "admin"
    
    # Company-wide metrics
    company_metrics: CompanyMetrics = Field(default_factory=CompanyMetrics)
    
    # Segment configurations
    segments: List[SegmentConfig] = Field(default_factory=list)
    
    # Growth trajectory data
    growth_trajectory: List[GrowthDataPoint] = Field(default_factory=list)
    
    # Product portfolio configuration
    products: List[ProductConfig] = Field(default_factory=list)
    
    # Sales capacity configuration
    sales_capacity: SalesCapacityConfig = Field(default_factory=SalesCapacityConfig)
    
    # Market context
    primary_markets: List[str] = Field(default_factory=lambda: [
        "Connectivity & Internet",
        "SD-WAN",
        "SASE & Security",
        "Managed Services",
        "Ethernet Transport",
        "Voice & UCaaS"
    ])
    
    # Key competitors for context
    key_competitors: List[str] = Field(default_factory=lambda: [
        "AT&T Business",
        "Verizon Business",
        "Lumen",
        "Spectrum Enterprise",
        "Frontier"
    ])


class SegmentMarketIntel(BaseModel):
    """LLM-generated market intelligence for a specific segment."""
    id: str
    segment_tier: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    llm_provider: str = ""
    llm_model: str = ""
    
    # Executive summary
    executive_summary: str = ""
    
    # TAM/SAM sizing for this segment
    tam_estimate: float = 0.0  # in USD
    tam_methodology: str = ""
    sam_estimate: float = 0.0
    growth_rate_cagr: str = ""
    
    # Total market sizing
    total_market_customers: int = 0  # Total number of customers in this market segment nationally
    total_market_revenue: float = 0.0  # Total market revenue in USD (entire market)
    
    # Buyer analysis
    buyer_personas: List[dict] = Field(default_factory=list)
    # Each persona: {title, responsibilities, pain_points, decision_criteria}
    
    # Competitive dynamics
    competitive_landscape: str = ""
    primary_competitors: List[str] = Field(default_factory=list)
    competitive_strengths: List[str] = Field(default_factory=list)
    competitive_weaknesses: List[str] = Field(default_factory=list)
    
    # Growth strategies
    growth_strategies: List[dict] = Field(default_factory=list)
    # Each strategy: {name, description, impact, complexity, timeline}
    
    # Pricing intelligence
    pricing_insights: str = ""
    typical_deal_size: str = ""
    pricing_trends: List[str] = Field(default_factory=list)
    
    # Cross-sell / upsell
    attach_opportunities: List[dict] = Field(default_factory=list)
    # Each opportunity: {product, penetration_rate, revenue_potential, approach}
    
    # Key takeaways
    key_takeaways: List[str] = Field(default_factory=list)
    
    # Sources
    sources: List[str] = Field(default_factory=list)

