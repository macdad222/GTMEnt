"""
MSA (Metropolitan Statistical Area) Geographic Segmentation Model.

Provides geographic segmentation for the top 50 US metropolitan areas,
enabling market analysis, sales resource planning, and playbook generation by geography.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class MSARegion(str, Enum):
    """US geographic regions."""
    NORTHEAST = "northeast"
    MIDWEST = "midwest"
    SOUTH = "south"
    WEST = "west"


class InfrastructureType(str, Enum):
    """Network infrastructure types."""
    FIBER = "fiber"
    COAX = "coax"
    FIBER_COAX = "fiber_coax"  # Both available
    LIMITED = "limited"  # Limited or no coverage


class SalesMotionType(str, Enum):
    """Sales motion types by customer complexity."""
    DIGITAL = "digital"  # Self-serve, low-touch
    INSIDE_SALES = "inside_sales"  # Phone/video-based
    FIELD_SALES = "field_sales"  # In-person, territory-based
    STRATEGIC = "strategic"  # Named accounts, complex deals
    PARTNER = "partner"  # Channel partner led


class RepType(str, Enum):
    """Types of sales representatives."""
    # Inside Sales roles
    SDR = "sdr"  # Sales Development Rep - prospecting
    BDR = "bdr"  # Business Development Rep - inbound
    INSIDE_AE = "inside_ae"  # Inside Account Executive - closing
    INSIDE_AM = "inside_am"  # Inside Account Manager - retention
    
    # Field Sales roles
    FIELD_AE = "field_ae"  # Field Account Executive - mid-market
    FIELD_AM = "field_am"  # Field Account Manager - retention
    STRATEGIC_AE = "strategic_ae"  # Strategic AE - large enterprise
    MAJOR_AM = "major_am"  # Major Account Manager - strategic retention
    
    # Specialist roles
    SE = "se"  # Sales Engineer / Solutions Consultant
    PARTNER_MGR = "partner_mgr"  # Partner/Channel Manager
    
    # Leadership
    SALES_MGR = "sales_mgr"  # Front-line Sales Manager


class SegmentSalesConfig(BaseModel):
    """Sales channel configuration for a customer segment tier."""
    segment_tier: str  # e.g., "tier_e1", "tier_e2"
    primary_motion: SalesMotionType
    secondary_motion: Optional[SalesMotionType] = None
    
    # Rep types that can work this segment
    allowed_rep_types: List[RepType] = []
    
    # Target ratios
    target_accounts_per_rep: int = 50  # Varies by segment
    target_arr_per_rep: float = 500_000  # Varies by segment
    
    # Deal characteristics
    avg_deal_cycle_days: int = 45
    requires_se: bool = False  # Needs Sales Engineer support
    requires_field_visit: bool = False


class MSASalesAllocation(BaseModel):
    """Sales resource allocation for an MSA."""
    # Inside Sales headcount
    sdr_count: int = 0
    bdr_count: int = 0
    inside_ae_count: int = 0
    inside_am_count: int = 0
    
    # Field Sales headcount
    field_ae_count: int = 0
    field_am_count: int = 0
    strategic_ae_count: int = 0
    major_am_count: int = 0
    
    # Specialists
    se_count: int = 0
    partner_mgr_count: int = 0
    sales_mgr_count: int = 0
    
    # Quotas
    total_quota_usd: float = 0
    new_logo_quota_usd: float = 0
    expansion_quota_usd: float = 0
    
    # Attainment (current year)
    quota_attainment_pct: float = 0
    
    @property
    def total_quota_bearing_headcount(self) -> int:
        """Total quota-bearing reps (excludes SDR/BDR/SE/Mgrs)."""
        return (
            self.inside_ae_count + self.inside_am_count +
            self.field_ae_count + self.field_am_count +
            self.strategic_ae_count + self.major_am_count +
            self.partner_mgr_count
        )
    
    @property
    def total_headcount(self) -> int:
        """Total sales headcount in MSA."""
        return (
            self.sdr_count + self.bdr_count +
            self.inside_ae_count + self.inside_am_count +
            self.field_ae_count + self.field_am_count +
            self.strategic_ae_count + self.major_am_count +
            self.se_count + self.partner_mgr_count + self.sales_mgr_count
        )


class MSASegmentDistribution(BaseModel):
    """Customer segment distribution within an MSA."""
    segment_tier: str  # e.g., "tier_e1"
    
    # Account counts
    total_accounts: int = 0  # Accounts with presence in this MSA
    hq_accounts: int = 0  # Accounts headquartered in this MSA
    branch_accounts: int = 0  # Accounts with branches (not HQ) in this MSA
    
    # Revenue
    arr_usd: float = 0  # ARR from accounts in this MSA
    avg_mrr_usd: float = 0
    
    # Opportunity
    whitespace_accounts: int = 0  # Prospect accounts not yet customers
    expansion_opportunities: int = 0  # Existing accounts with upsell potential


class MSA(BaseModel):
    """Metropolitan Statistical Area definition with sales resource planning."""
    
    code: str  # CBSA code
    name: str  # Metro area name (e.g., "New York-Newark-Jersey City")
    short_name: str  # Short name (e.g., "New York")
    state_codes: List[str]  # Primary states
    region: MSARegion
    
    # Market characteristics
    population_2023: int  # Estimated 2023 population
    enterprise_establishments: int  # Estimated business establishments
    
    # Infrastructure - PRIORITIZATION CRITERIA
    has_fiber: bool = True  # Fiber network available
    has_coax: bool = True  # Coax/HFC network available
    infrastructure_type: InfrastructureType = InfrastructureType.FIBER_COAX
    
    # Comcast footprint
    in_comcast_footprint: bool = True
    comcast_coverage_pct: float = 0.0  # % of MSA with Comcast coverage
    fiber_coverage_pct: float = 0.0  # % with fiber specifically
    
    # Priority for enterprise sales (calculated from infrastructure + market size)
    priority_tier: int = 1  # 1 = highest priority
    priority_score: float = 0.0  # Calculated score for ranking
    
    # Sales resource allocation
    sales_allocation: MSASalesAllocation = Field(default_factory=MSASalesAllocation)
    
    # Customer segment distribution
    segment_distribution: List[MSASegmentDistribution] = Field(default_factory=list)
    
    # Market opportunity
    tam_usd: float = 0  # Total addressable market in this MSA
    sam_usd: float = 0  # Serviceable addressable market
    current_arr_usd: float = 0  # Current Comcast Business ARR
    market_share_pct: float = 0  # Current market share
    
    def calculate_priority_score(self) -> float:
        """Calculate priority score based on infrastructure and market factors."""
        score = 0.0
        
        # Infrastructure weight (40%)
        if self.has_fiber and self.has_coax:
            score += 40
        elif self.has_fiber:
            score += 30
        elif self.has_coax:
            score += 20
        
        # Coverage weight (25%)
        score += (self.comcast_coverage_pct / 100) * 25
        
        # Market size weight (20%)
        # Normalize establishments (max ~450k for NYC)
        score += min((self.enterprise_establishments / 450_000) * 20, 20)
        
        # Population weight (15%)
        # Normalize population (max ~19.5M for NYC)
        score += min((self.population_2023 / 19_500_000) * 15, 15)
        
        self.priority_score = round(score, 2)
        return self.priority_score


# Default segment sales configurations
DEFAULT_SEGMENT_SALES_CONFIGS: List[SegmentSalesConfig] = [
    SegmentSalesConfig(
        segment_tier="tier_e1",
        primary_motion=SalesMotionType.DIGITAL,
        secondary_motion=SalesMotionType.INSIDE_SALES,
        allowed_rep_types=[RepType.SDR, RepType.BDR, RepType.INSIDE_AE, RepType.INSIDE_AM],
        target_accounts_per_rep=75,
        target_arr_per_rep=400_000,
        avg_deal_cycle_days=30,
        requires_se=False,
        requires_field_visit=False,
    ),
    SegmentSalesConfig(
        segment_tier="tier_e2",
        primary_motion=SalesMotionType.INSIDE_SALES,
        secondary_motion=SalesMotionType.FIELD_SALES,
        allowed_rep_types=[RepType.SDR, RepType.BDR, RepType.INSIDE_AE, RepType.INSIDE_AM, RepType.FIELD_AE],
        target_accounts_per_rep=50,
        target_arr_per_rep=600_000,
        avg_deal_cycle_days=45,
        requires_se=False,
        requires_field_visit=False,
    ),
    SegmentSalesConfig(
        segment_tier="tier_e3",
        primary_motion=SalesMotionType.FIELD_SALES,
        secondary_motion=SalesMotionType.INSIDE_SALES,
        allowed_rep_types=[RepType.SDR, RepType.FIELD_AE, RepType.FIELD_AM, RepType.SE],
        target_accounts_per_rep=35,
        target_arr_per_rep=800_000,
        avg_deal_cycle_days=60,
        requires_se=True,
        requires_field_visit=True,
    ),
    SegmentSalesConfig(
        segment_tier="tier_e4",
        primary_motion=SalesMotionType.FIELD_SALES,
        secondary_motion=SalesMotionType.STRATEGIC,
        allowed_rep_types=[RepType.SDR, RepType.FIELD_AE, RepType.FIELD_AM, RepType.STRATEGIC_AE, RepType.SE],
        target_accounts_per_rep=25,
        target_arr_per_rep=1_200_000,
        avg_deal_cycle_days=90,
        requires_se=True,
        requires_field_visit=True,
    ),
    SegmentSalesConfig(
        segment_tier="tier_e5",
        primary_motion=SalesMotionType.STRATEGIC,
        secondary_motion=None,
        allowed_rep_types=[RepType.STRATEGIC_AE, RepType.MAJOR_AM, RepType.SE, RepType.PARTNER_MGR],
        target_accounts_per_rep=10,
        target_arr_per_rep=2_500_000,
        avg_deal_cycle_days=180,
        requires_se=True,
        requires_field_visit=True,
    ),
]


def _create_segment_distribution(tier: str, accounts: int, hq_pct: float, arr: float) -> MSASegmentDistribution:
    """Helper to create segment distribution."""
    hq_accounts = int(accounts * hq_pct)
    return MSASegmentDistribution(
        segment_tier=tier,
        total_accounts=accounts,
        hq_accounts=hq_accounts,
        branch_accounts=accounts - hq_accounts,
        arr_usd=arr,
        avg_mrr_usd=arr / max(accounts, 1) / 12,
        whitespace_accounts=int(accounts * 0.3),  # Estimate 30% whitespace
        expansion_opportunities=int(accounts * 0.4),  # 40% expansion potential
    )


def _create_sales_allocation(
    tier: int,
    population: int,
    establishments: int,
    has_fiber: bool,
    coverage_pct: float
) -> MSASalesAllocation:
    """Create sales allocation based on market characteristics."""
    # Scale factors based on market size
    pop_factor = population / 5_000_000  # Normalize to 5M
    est_factor = establishments / 100_000  # Normalize to 100k
    coverage_factor = coverage_pct / 100
    
    # Base counts scaled by tier and market
    if tier == 1:  # Top 10 markets
        base_inside = 8
        base_field = 6
        base_strategic = 3
    elif tier == 2:  # Markets 11-25
        base_inside = 5
        base_field = 4
        base_strategic = 2
    else:  # Markets 26-50
        base_inside = 3
        base_field = 2
        base_strategic = 1
    
    # Apply market scaling
    scale = (pop_factor + est_factor) / 2 * coverage_factor
    
    return MSASalesAllocation(
        sdr_count=max(1, int(base_inside * scale * 1.5)),
        bdr_count=max(1, int(base_inside * scale)),
        inside_ae_count=max(1, int(base_inside * scale)),
        inside_am_count=max(1, int(base_inside * scale * 0.8)),
        field_ae_count=max(1, int(base_field * scale)) if has_fiber else 0,
        field_am_count=max(1, int(base_field * scale * 0.6)) if has_fiber else 0,
        strategic_ae_count=max(1, int(base_strategic * scale)) if tier <= 2 else 0,
        major_am_count=max(1, int(base_strategic * scale * 0.5)) if tier == 1 else 0,
        se_count=max(1, int((base_field + base_strategic) * scale * 0.3)),
        partner_mgr_count=max(1, int(base_field * scale * 0.2)),
        sales_mgr_count=max(1, int((base_inside + base_field) * scale * 0.15)),
        total_quota_usd=establishments * 2500 * coverage_factor,  # $2500 per establishment
        new_logo_quota_usd=establishments * 1000 * coverage_factor,
        expansion_quota_usd=establishments * 1500 * coverage_factor,
        quota_attainment_pct=85 + (tier * 3),  # Tier 1 = 88%, Tier 2 = 91%, Tier 3 = 94%
    )


# Top 50 MSAs with enhanced data
TOP_50_MSAS: List[MSA] = [
    # TIER 1 - Top 10 Markets (Fiber + Coax)
    MSA(
        code="35620", name="New York-Newark-Jersey City, NY-NJ-PA", short_name="New York",
        state_codes=["NY", "NJ", "PA"], region=MSARegion.NORTHEAST,
        population_2023=19_500_000, enterprise_establishments=450_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=85, fiber_coverage_pct=70,
        priority_tier=1,
        tam_usd=4_500_000_000, sam_usd=3_800_000_000, current_arr_usd=380_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(1, 19_500_000, 450_000, True, 85),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 2800, 0.6, 85_000_000),
            _create_segment_distribution("tier_e2", 1200, 0.5, 95_000_000),
            _create_segment_distribution("tier_e3", 450, 0.45, 85_000_000),
            _create_segment_distribution("tier_e4", 180, 0.4, 70_000_000),
            _create_segment_distribution("tier_e5", 45, 0.35, 45_000_000),
        ],
    ),
    MSA(
        code="31080", name="Los Angeles-Long Beach-Anaheim, CA", short_name="Los Angeles",
        state_codes=["CA"], region=MSARegion.WEST,
        population_2023=12_800_000, enterprise_establishments=320_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=70, fiber_coverage_pct=55,
        priority_tier=1,
        tam_usd=3_200_000_000, sam_usd=2_200_000_000, current_arr_usd=220_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(1, 12_800_000, 320_000, True, 70),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 1900, 0.55, 58_000_000),
            _create_segment_distribution("tier_e2", 850, 0.5, 68_000_000),
            _create_segment_distribution("tier_e3", 320, 0.45, 58_000_000),
            _create_segment_distribution("tier_e4", 120, 0.4, 48_000_000),
            _create_segment_distribution("tier_e5", 30, 0.35, 30_000_000),
        ],
    ),
    MSA(
        code="16980", name="Chicago-Naperville-Elgin, IL-IN-WI", short_name="Chicago",
        state_codes=["IL", "IN", "WI"], region=MSARegion.MIDWEST,
        population_2023=9_400_000, enterprise_establishments=220_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=80, fiber_coverage_pct=65,
        priority_tier=1,
        tam_usd=2_200_000_000, sam_usd=1_750_000_000, current_arr_usd=175_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(1, 9_400_000, 220_000, True, 80),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 1400, 0.58, 42_000_000),
            _create_segment_distribution("tier_e2", 600, 0.52, 48_000_000),
            _create_segment_distribution("tier_e3", 220, 0.48, 40_000_000),
            _create_segment_distribution("tier_e4", 90, 0.42, 32_000_000),
            _create_segment_distribution("tier_e5", 22, 0.38, 22_000_000),
        ],
    ),
    MSA(
        code="19100", name="Dallas-Fort Worth-Arlington, TX", short_name="Dallas-Fort Worth",
        state_codes=["TX"], region=MSARegion.SOUTH,
        population_2023=7_900_000, enterprise_establishments=180_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=65, fiber_coverage_pct=50,
        priority_tier=1,
        tam_usd=1_800_000_000, sam_usd=1_170_000_000, current_arr_usd=117_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(1, 7_900_000, 180_000, True, 65),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 1100, 0.55, 34_000_000),
            _create_segment_distribution("tier_e2", 480, 0.5, 38_000_000),
            _create_segment_distribution("tier_e3", 180, 0.45, 32_000_000),
            _create_segment_distribution("tier_e4", 72, 0.4, 26_000_000),
            _create_segment_distribution("tier_e5", 18, 0.35, 18_000_000),
        ],
    ),
    MSA(
        code="26420", name="Houston-The Woodlands-Sugar Land, TX", short_name="Houston",
        state_codes=["TX"], region=MSARegion.SOUTH,
        population_2023=7_300_000, enterprise_establishments=160_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=60, fiber_coverage_pct=45,
        priority_tier=1,
        tam_usd=1_600_000_000, sam_usd=960_000_000, current_arr_usd=96_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(1, 7_300_000, 160_000, True, 60),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 950, 0.52, 29_000_000),
            _create_segment_distribution("tier_e2", 420, 0.48, 33_000_000),
            _create_segment_distribution("tier_e3", 160, 0.44, 28_000_000),
            _create_segment_distribution("tier_e4", 64, 0.38, 22_000_000),
            _create_segment_distribution("tier_e5", 16, 0.32, 16_000_000),
        ],
    ),
    MSA(
        code="47900", name="Washington-Arlington-Alexandria, DC-VA-MD-WV", short_name="Washington DC",
        state_codes=["DC", "VA", "MD", "WV"], region=MSARegion.SOUTH,
        population_2023=6_300_000, enterprise_establishments=150_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=85, fiber_coverage_pct=75,
        priority_tier=1,
        tam_usd=1_500_000_000, sam_usd=1_275_000_000, current_arr_usd=128_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(1, 6_300_000, 150_000, True, 85),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 920, 0.6, 28_000_000),
            _create_segment_distribution("tier_e2", 400, 0.55, 32_000_000),
            _create_segment_distribution("tier_e3", 150, 0.5, 28_000_000),
            _create_segment_distribution("tier_e4", 60, 0.45, 22_000_000),
            _create_segment_distribution("tier_e5", 15, 0.4, 15_000_000),
        ],
    ),
    MSA(
        code="33100", name="Miami-Fort Lauderdale-Pompano Beach, FL", short_name="Miami",
        state_codes=["FL"], region=MSARegion.SOUTH,
        population_2023=6_100_000, enterprise_establishments=140_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=75, fiber_coverage_pct=60,
        priority_tier=1,
        tam_usd=1_400_000_000, sam_usd=1_050_000_000, current_arr_usd=105_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(1, 6_100_000, 140_000, True, 75),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 860, 0.58, 26_000_000),
            _create_segment_distribution("tier_e2", 380, 0.52, 30_000_000),
            _create_segment_distribution("tier_e3", 140, 0.48, 26_000_000),
            _create_segment_distribution("tier_e4", 56, 0.42, 20_000_000),
            _create_segment_distribution("tier_e5", 14, 0.38, 14_000_000),
        ],
    ),
    MSA(
        code="37980", name="Philadelphia-Camden-Wilmington, PA-NJ-DE-MD", short_name="Philadelphia",
        state_codes=["PA", "NJ", "DE", "MD"], region=MSARegion.NORTHEAST,
        population_2023=6_200_000, enterprise_establishments=145_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=90, fiber_coverage_pct=80,  # HQ market!
        priority_tier=1,
        tam_usd=1_450_000_000, sam_usd=1_305_000_000, current_arr_usd=145_000_000, market_share_pct=11.1,
        sales_allocation=_create_sales_allocation(1, 6_200_000, 145_000, True, 90),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 900, 0.62, 28_000_000),
            _create_segment_distribution("tier_e2", 400, 0.56, 32_000_000),
            _create_segment_distribution("tier_e3", 150, 0.52, 28_000_000),
            _create_segment_distribution("tier_e4", 60, 0.48, 22_000_000),
            _create_segment_distribution("tier_e5", 15, 0.42, 15_000_000),
        ],
    ),
    MSA(
        code="12060", name="Atlanta-Sandy Springs-Alpharetta, GA", short_name="Atlanta",
        state_codes=["GA"], region=MSARegion.SOUTH,
        population_2023=6_100_000, enterprise_establishments=135_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=80, fiber_coverage_pct=65,
        priority_tier=1,
        tam_usd=1_350_000_000, sam_usd=1_080_000_000, current_arr_usd=108_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(1, 6_100_000, 135_000, True, 80),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 830, 0.56, 25_000_000),
            _create_segment_distribution("tier_e2", 370, 0.5, 30_000_000),
            _create_segment_distribution("tier_e3", 135, 0.46, 25_000_000),
            _create_segment_distribution("tier_e4", 54, 0.4, 20_000_000),
            _create_segment_distribution("tier_e5", 13, 0.36, 13_000_000),
        ],
    ),
    MSA(
        code="38060", name="Phoenix-Mesa-Chandler, AZ", short_name="Phoenix",
        state_codes=["AZ"], region=MSARegion.WEST,
        population_2023=5_000_000, enterprise_establishments=110_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=70, fiber_coverage_pct=55,
        priority_tier=1,
        tam_usd=1_100_000_000, sam_usd=770_000_000, current_arr_usd=77_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(1, 5_000_000, 110_000, True, 70),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 680, 0.54, 21_000_000),
            _create_segment_distribution("tier_e2", 300, 0.48, 24_000_000),
            _create_segment_distribution("tier_e3", 110, 0.44, 20_000_000),
            _create_segment_distribution("tier_e4", 44, 0.38, 16_000_000),
            _create_segment_distribution("tier_e5", 11, 0.34, 11_000_000),
        ],
    ),

    # TIER 2 - Markets 11-25 (Most have Fiber + Coax)
    MSA(
        code="14460", name="Boston-Cambridge-Newton, MA-NH", short_name="Boston",
        state_codes=["MA", "NH"], region=MSARegion.NORTHEAST,
        population_2023=4_900_000, enterprise_establishments=120_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=85, fiber_coverage_pct=75,
        priority_tier=2,
        tam_usd=1_200_000_000, sam_usd=1_020_000_000, current_arr_usd=102_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 4_900_000, 120_000, True, 85),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 740, 0.58, 22_000_000),
            _create_segment_distribution("tier_e2", 330, 0.52, 26_000_000),
            _create_segment_distribution("tier_e3", 120, 0.48, 22_000_000),
            _create_segment_distribution("tier_e4", 48, 0.42, 18_000_000),
            _create_segment_distribution("tier_e5", 12, 0.38, 12_000_000),
        ],
    ),
    MSA(
        code="41860", name="San Francisco-Oakland-Berkeley, CA", short_name="San Francisco",
        state_codes=["CA"], region=MSARegion.WEST,
        population_2023=4_700_000, enterprise_establishments=130_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=75, fiber_coverage_pct=65,
        priority_tier=2,
        tam_usd=1_300_000_000, sam_usd=975_000_000, current_arr_usd=98_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 4_700_000, 130_000, True, 75),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 800, 0.55, 24_000_000),
            _create_segment_distribution("tier_e2", 360, 0.5, 29_000_000),
            _create_segment_distribution("tier_e3", 130, 0.46, 24_000_000),
            _create_segment_distribution("tier_e4", 52, 0.4, 19_000_000),
            _create_segment_distribution("tier_e5", 13, 0.35, 13_000_000),
        ],
    ),
    MSA(
        code="40140", name="Riverside-San Bernardino-Ontario, CA", short_name="Inland Empire",
        state_codes=["CA"], region=MSARegion.WEST,
        population_2023=4_600_000, enterprise_establishments=85_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=65, fiber_coverage_pct=45,
        priority_tier=2,
        tam_usd=850_000_000, sam_usd=552_500_000, current_arr_usd=55_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 4_600_000, 85_000, True, 65),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 520, 0.5, 16_000_000),
            _create_segment_distribution("tier_e2", 230, 0.45, 18_000_000),
            _create_segment_distribution("tier_e3", 85, 0.4, 15_000_000),
            _create_segment_distribution("tier_e4", 34, 0.35, 12_000_000),
            _create_segment_distribution("tier_e5", 8, 0.3, 8_000_000),
        ],
    ),
    MSA(
        code="19820", name="Detroit-Warren-Dearborn, MI", short_name="Detroit",
        state_codes=["MI"], region=MSARegion.MIDWEST,
        population_2023=4_300_000, enterprise_establishments=95_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=75, fiber_coverage_pct=60,
        priority_tier=2,
        tam_usd=950_000_000, sam_usd=712_500_000, current_arr_usd=71_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 4_300_000, 95_000, True, 75),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 580, 0.52, 18_000_000),
            _create_segment_distribution("tier_e2", 260, 0.47, 21_000_000),
            _create_segment_distribution("tier_e3", 95, 0.43, 17_000_000),
            _create_segment_distribution("tier_e4", 38, 0.38, 14_000_000),
            _create_segment_distribution("tier_e5", 9, 0.33, 9_000_000),
        ],
    ),
    MSA(
        code="42660", name="Seattle-Tacoma-Bellevue, WA", short_name="Seattle",
        state_codes=["WA"], region=MSARegion.WEST,
        population_2023=4_000_000, enterprise_establishments=105_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=80, fiber_coverage_pct=70,
        priority_tier=2,
        tam_usd=1_050_000_000, sam_usd=840_000_000, current_arr_usd=84_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 4_000_000, 105_000, True, 80),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 650, 0.55, 20_000_000),
            _create_segment_distribution("tier_e2", 290, 0.5, 23_000_000),
            _create_segment_distribution("tier_e3", 105, 0.46, 19_000_000),
            _create_segment_distribution("tier_e4", 42, 0.4, 15_000_000),
            _create_segment_distribution("tier_e5", 10, 0.36, 10_000_000),
        ],
    ),
    MSA(
        code="33460", name="Minneapolis-St. Paul-Bloomington, MN-WI", short_name="Minneapolis",
        state_codes=["MN", "WI"], region=MSARegion.MIDWEST,
        population_2023=3_700_000, enterprise_establishments=90_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=75, fiber_coverage_pct=60,
        priority_tier=2,
        tam_usd=900_000_000, sam_usd=675_000_000, current_arr_usd=68_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 3_700_000, 90_000, True, 75),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 550, 0.54, 17_000_000),
            _create_segment_distribution("tier_e2", 250, 0.48, 20_000_000),
            _create_segment_distribution("tier_e3", 90, 0.44, 16_000_000),
            _create_segment_distribution("tier_e4", 36, 0.38, 13_000_000),
            _create_segment_distribution("tier_e5", 9, 0.34, 9_000_000),
        ],
    ),
    MSA(
        code="41740", name="San Diego-Chula Vista-Carlsbad, CA", short_name="San Diego",
        state_codes=["CA"], region=MSARegion.WEST,
        population_2023=3_300_000, enterprise_establishments=80_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=70, fiber_coverage_pct=55,
        priority_tier=2,
        tam_usd=800_000_000, sam_usd=560_000_000, current_arr_usd=56_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 3_300_000, 80_000, True, 70),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 490, 0.52, 15_000_000),
            _create_segment_distribution("tier_e2", 220, 0.46, 17_000_000),
            _create_segment_distribution("tier_e3", 80, 0.42, 14_000_000),
            _create_segment_distribution("tier_e4", 32, 0.36, 11_000_000),
            _create_segment_distribution("tier_e5", 8, 0.32, 8_000_000),
        ],
    ),
    MSA(
        code="45300", name="Tampa-St. Petersburg-Clearwater, FL", short_name="Tampa",
        state_codes=["FL"], region=MSARegion.SOUTH,
        population_2023=3_200_000, enterprise_establishments=75_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=75, fiber_coverage_pct=60,
        priority_tier=2,
        tam_usd=750_000_000, sam_usd=562_500_000, current_arr_usd=56_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 3_200_000, 75_000, True, 75),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 460, 0.53, 14_000_000),
            _create_segment_distribution("tier_e2", 210, 0.47, 16_000_000),
            _create_segment_distribution("tier_e3", 75, 0.43, 14_000_000),
            _create_segment_distribution("tier_e4", 30, 0.37, 11_000_000),
            _create_segment_distribution("tier_e5", 7, 0.33, 7_000_000),
        ],
    ),
    MSA(
        code="19740", name="Denver-Aurora-Lakewood, CO", short_name="Denver",
        state_codes=["CO"], region=MSARegion.WEST,
        population_2023=2_900_000, enterprise_establishments=80_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=75, fiber_coverage_pct=65,
        priority_tier=2,
        tam_usd=800_000_000, sam_usd=600_000_000, current_arr_usd=60_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 2_900_000, 80_000, True, 75),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 490, 0.54, 15_000_000),
            _create_segment_distribution("tier_e2", 220, 0.48, 18_000_000),
            _create_segment_distribution("tier_e3", 80, 0.44, 15_000_000),
            _create_segment_distribution("tier_e4", 32, 0.38, 12_000_000),
            _create_segment_distribution("tier_e5", 8, 0.34, 8_000_000),
        ],
    ),
    MSA(
        code="41180", name="St. Louis, MO-IL", short_name="St. Louis",
        state_codes=["MO", "IL"], region=MSARegion.MIDWEST,
        population_2023=2_800_000, enterprise_establishments=65_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=70, fiber_coverage_pct=55,
        priority_tier=2,
        tam_usd=650_000_000, sam_usd=455_000_000, current_arr_usd=46_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 2_800_000, 65_000, True, 70),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 400, 0.52, 12_000_000),
            _create_segment_distribution("tier_e2", 180, 0.46, 14_000_000),
            _create_segment_distribution("tier_e3", 65, 0.42, 12_000_000),
            _create_segment_distribution("tier_e4", 26, 0.36, 9_000_000),
            _create_segment_distribution("tier_e5", 6, 0.32, 6_000_000),
        ],
    ),
    MSA(
        code="12580", name="Baltimore-Columbia-Towson, MD", short_name="Baltimore",
        state_codes=["MD"], region=MSARegion.SOUTH,
        population_2023=2_800_000, enterprise_establishments=65_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=90, fiber_coverage_pct=80,
        priority_tier=2,
        tam_usd=650_000_000, sam_usd=585_000_000, current_arr_usd=59_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 2_800_000, 65_000, True, 90),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 400, 0.56, 12_000_000),
            _create_segment_distribution("tier_e2", 180, 0.5, 14_000_000),
            _create_segment_distribution("tier_e3", 65, 0.46, 12_000_000),
            _create_segment_distribution("tier_e4", 26, 0.4, 9_000_000),
            _create_segment_distribution("tier_e5", 6, 0.36, 6_000_000),
        ],
    ),
    MSA(
        code="36740", name="Orlando-Kissimmee-Sanford, FL", short_name="Orlando",
        state_codes=["FL"], region=MSARegion.SOUTH,
        population_2023=2_700_000, enterprise_establishments=60_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=70, fiber_coverage_pct=55,
        priority_tier=2,
        tam_usd=600_000_000, sam_usd=420_000_000, current_arr_usd=42_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 2_700_000, 60_000, True, 70),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 370, 0.5, 11_000_000),
            _create_segment_distribution("tier_e2", 165, 0.44, 13_000_000),
            _create_segment_distribution("tier_e3", 60, 0.4, 11_000_000),
            _create_segment_distribution("tier_e4", 24, 0.34, 8_000_000),
            _create_segment_distribution("tier_e5", 6, 0.3, 6_000_000),
        ],
    ),
    MSA(
        code="16740", name="Charlotte-Concord-Gastonia, NC-SC", short_name="Charlotte",
        state_codes=["NC", "SC"], region=MSARegion.SOUTH,
        population_2023=2_700_000, enterprise_establishments=60_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=75, fiber_coverage_pct=60,
        priority_tier=2,
        tam_usd=600_000_000, sam_usd=450_000_000, current_arr_usd=45_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 2_700_000, 60_000, True, 75),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 370, 0.52, 11_000_000),
            _create_segment_distribution("tier_e2", 165, 0.46, 13_000_000),
            _create_segment_distribution("tier_e3", 60, 0.42, 11_000_000),
            _create_segment_distribution("tier_e4", 24, 0.36, 8_000_000),
            _create_segment_distribution("tier_e5", 6, 0.32, 6_000_000),
        ],
    ),
    MSA(
        code="41700", name="San Antonio-New Braunfels, TX", short_name="San Antonio",
        state_codes=["TX"], region=MSARegion.SOUTH,
        population_2023=2_600_000, enterprise_establishments=55_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=55, fiber_coverage_pct=40,
        priority_tier=2,
        tam_usd=550_000_000, sam_usd=302_500_000, current_arr_usd=30_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 2_600_000, 55_000, True, 55),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 340, 0.48, 10_000_000),
            _create_segment_distribution("tier_e2", 150, 0.42, 11_000_000),
            _create_segment_distribution("tier_e3", 55, 0.38, 9_000_000),
            _create_segment_distribution("tier_e4", 22, 0.32, 7_000_000),
            _create_segment_distribution("tier_e5", 5, 0.28, 5_000_000),
        ],
    ),
    MSA(
        code="38900", name="Portland-Vancouver-Hillsboro, OR-WA", short_name="Portland",
        state_codes=["OR", "WA"], region=MSARegion.WEST,
        population_2023=2_500_000, enterprise_establishments=65_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=80, fiber_coverage_pct=70,
        priority_tier=2,
        tam_usd=650_000_000, sam_usd=520_000_000, current_arr_usd=52_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(2, 2_500_000, 65_000, True, 80),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 400, 0.54, 12_000_000),
            _create_segment_distribution("tier_e2", 180, 0.48, 15_000_000),
            _create_segment_distribution("tier_e3", 65, 0.44, 12_000_000),
            _create_segment_distribution("tier_e4", 26, 0.38, 10_000_000),
            _create_segment_distribution("tier_e5", 6, 0.34, 6_000_000),
        ],
    ),

    # TIER 3 - Markets 26-50 (Mixed infrastructure)
    MSA(
        code="40900", name="Sacramento-Roseville-Folsom, CA", short_name="Sacramento",
        state_codes=["CA"], region=MSARegion.WEST,
        population_2023=2_400_000, enterprise_establishments=55_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=70, fiber_coverage_pct=55,
        priority_tier=3,
        tam_usd=550_000_000, sam_usd=385_000_000, current_arr_usd=39_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 2_400_000, 55_000, True, 70),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 340, 0.5, 10_000_000),
            _create_segment_distribution("tier_e2", 150, 0.44, 12_000_000),
            _create_segment_distribution("tier_e3", 55, 0.4, 10_000_000),
            _create_segment_distribution("tier_e4", 22, 0.34, 8_000_000),
            _create_segment_distribution("tier_e5", 5, 0.3, 5_000_000),
        ],
    ),
    MSA(
        code="38300", name="Pittsburgh, PA", short_name="Pittsburgh",
        state_codes=["PA"], region=MSARegion.NORTHEAST,
        population_2023=2_300_000, enterprise_establishments=55_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=85, fiber_coverage_pct=75,
        priority_tier=3,
        tam_usd=550_000_000, sam_usd=467_500_000, current_arr_usd=47_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 2_300_000, 55_000, True, 85),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 340, 0.54, 10_000_000),
            _create_segment_distribution("tier_e2", 150, 0.48, 12_000_000),
            _create_segment_distribution("tier_e3", 55, 0.44, 10_000_000),
            _create_segment_distribution("tier_e4", 22, 0.38, 8_000_000),
            _create_segment_distribution("tier_e5", 5, 0.34, 5_000_000),
        ],
    ),
    MSA(
        code="12420", name="Austin-Round Rock-Georgetown, TX", short_name="Austin",
        state_codes=["TX"], region=MSARegion.SOUTH,
        population_2023=2_400_000, enterprise_establishments=55_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=60, fiber_coverage_pct=45,
        priority_tier=3,
        tam_usd=550_000_000, sam_usd=330_000_000, current_arr_usd=33_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 2_400_000, 55_000, True, 60),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 340, 0.5, 10_000_000),
            _create_segment_distribution("tier_e2", 150, 0.44, 11_000_000),
            _create_segment_distribution("tier_e3", 55, 0.4, 9_000_000),
            _create_segment_distribution("tier_e4", 22, 0.34, 7_000_000),
            _create_segment_distribution("tier_e5", 5, 0.3, 5_000_000),
        ],
    ),
    MSA(
        code="29820", name="Las Vegas-Henderson-Paradise, NV", short_name="Las Vegas",
        state_codes=["NV"], region=MSARegion.WEST,
        population_2023=2_300_000, enterprise_establishments=50_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=65, fiber_coverage_pct=50,
        priority_tier=3,
        tam_usd=500_000_000, sam_usd=325_000_000, current_arr_usd=33_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 2_300_000, 50_000, True, 65),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 310, 0.48, 9_000_000),
            _create_segment_distribution("tier_e2", 140, 0.42, 10_000_000),
            _create_segment_distribution("tier_e3", 50, 0.38, 9_000_000),
            _create_segment_distribution("tier_e4", 20, 0.32, 7_000_000),
            _create_segment_distribution("tier_e5", 5, 0.28, 5_000_000),
        ],
    ),
    MSA(
        code="17140", name="Cincinnati, OH-KY-IN", short_name="Cincinnati",
        state_codes=["OH", "KY", "IN"], region=MSARegion.MIDWEST,
        population_2023=2_200_000, enterprise_establishments=50_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=70, fiber_coverage_pct=55,
        priority_tier=3,
        tam_usd=500_000_000, sam_usd=350_000_000, current_arr_usd=35_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 2_200_000, 50_000, True, 70),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 310, 0.5, 9_000_000),
            _create_segment_distribution("tier_e2", 140, 0.44, 10_000_000),
            _create_segment_distribution("tier_e3", 50, 0.4, 9_000_000),
            _create_segment_distribution("tier_e4", 20, 0.34, 7_000_000),
            _create_segment_distribution("tier_e5", 5, 0.3, 5_000_000),
        ],
    ),
    MSA(
        code="28140", name="Kansas City, MO-KS", short_name="Kansas City",
        state_codes=["MO", "KS"], region=MSARegion.MIDWEST,
        population_2023=2_200_000, enterprise_establishments=50_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=65, fiber_coverage_pct=50,
        priority_tier=3,
        tam_usd=500_000_000, sam_usd=325_000_000, current_arr_usd=33_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 2_200_000, 50_000, True, 65),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 310, 0.48, 9_000_000),
            _create_segment_distribution("tier_e2", 140, 0.42, 10_000_000),
            _create_segment_distribution("tier_e3", 50, 0.38, 8_000_000),
            _create_segment_distribution("tier_e4", 20, 0.32, 7_000_000),
            _create_segment_distribution("tier_e5", 5, 0.28, 5_000_000),
        ],
    ),
    MSA(
        code="18140", name="Columbus, OH", short_name="Columbus",
        state_codes=["OH"], region=MSARegion.MIDWEST,
        population_2023=2_100_000, enterprise_establishments=50_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=75, fiber_coverage_pct=60,
        priority_tier=3,
        tam_usd=500_000_000, sam_usd=375_000_000, current_arr_usd=38_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 2_100_000, 50_000, True, 75),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 310, 0.52, 9_000_000),
            _create_segment_distribution("tier_e2", 140, 0.46, 11_000_000),
            _create_segment_distribution("tier_e3", 50, 0.42, 9_000_000),
            _create_segment_distribution("tier_e4", 20, 0.36, 7_000_000),
            _create_segment_distribution("tier_e5", 5, 0.32, 5_000_000),
        ],
    ),
    MSA(
        code="26900", name="Indianapolis-Carmel-Anderson, IN", short_name="Indianapolis",
        state_codes=["IN"], region=MSARegion.MIDWEST,
        population_2023=2_100_000, enterprise_establishments=48_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=70, fiber_coverage_pct=55,
        priority_tier=3,
        tam_usd=480_000_000, sam_usd=336_000_000, current_arr_usd=34_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 2_100_000, 48_000, True, 70),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 300, 0.5, 9_000_000),
            _create_segment_distribution("tier_e2", 135, 0.44, 10_000_000),
            _create_segment_distribution("tier_e3", 48, 0.4, 8_000_000),
            _create_segment_distribution("tier_e4", 19, 0.34, 7_000_000),
            _create_segment_distribution("tier_e5", 5, 0.3, 5_000_000),
        ],
    ),
    MSA(
        code="17460", name="Cleveland-Elyria, OH", short_name="Cleveland",
        state_codes=["OH"], region=MSARegion.MIDWEST,
        population_2023=2_000_000, enterprise_establishments=48_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=70, fiber_coverage_pct=55,
        priority_tier=3,
        tam_usd=480_000_000, sam_usd=336_000_000, current_arr_usd=34_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 2_000_000, 48_000, True, 70),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 300, 0.5, 9_000_000),
            _create_segment_distribution("tier_e2", 135, 0.44, 10_000_000),
            _create_segment_distribution("tier_e3", 48, 0.4, 8_000_000),
            _create_segment_distribution("tier_e4", 19, 0.34, 7_000_000),
            _create_segment_distribution("tier_e5", 5, 0.3, 5_000_000),
        ],
    ),
    MSA(
        code="41940", name="San Jose-Sunnyvale-Santa Clara, CA", short_name="San Jose",
        state_codes=["CA"], region=MSARegion.WEST,
        population_2023=1_950_000, enterprise_establishments=55_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=75, fiber_coverage_pct=65,
        priority_tier=3,
        tam_usd=550_000_000, sam_usd=412_500_000, current_arr_usd=41_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 1_950_000, 55_000, True, 75),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 340, 0.52, 10_000_000),
            _create_segment_distribution("tier_e2", 150, 0.46, 12_000_000),
            _create_segment_distribution("tier_e3", 55, 0.42, 10_000_000),
            _create_segment_distribution("tier_e4", 22, 0.36, 8_000_000),
            _create_segment_distribution("tier_e5", 5, 0.32, 5_000_000),
        ],
    ),
    MSA(
        code="34980", name="Nashville-Davidson--Murfreesboro--Franklin, TN", short_name="Nashville",
        state_codes=["TN"], region=MSARegion.SOUTH,
        population_2023=2_000_000, enterprise_establishments=48_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=70, fiber_coverage_pct=55,
        priority_tier=3,
        tam_usd=480_000_000, sam_usd=336_000_000, current_arr_usd=34_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 2_000_000, 48_000, True, 70),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 300, 0.5, 9_000_000),
            _create_segment_distribution("tier_e2", 135, 0.44, 10_000_000),
            _create_segment_distribution("tier_e3", 48, 0.4, 8_000_000),
            _create_segment_distribution("tier_e4", 19, 0.34, 7_000_000),
            _create_segment_distribution("tier_e5", 5, 0.3, 5_000_000),
        ],
    ),
    MSA(
        code="47260", name="Virginia Beach-Norfolk-Newport News, VA-NC", short_name="Virginia Beach",
        state_codes=["VA", "NC"], region=MSARegion.SOUTH,
        population_2023=1_800_000, enterprise_establishments=42_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=75, fiber_coverage_pct=60,
        priority_tier=3,
        tam_usd=420_000_000, sam_usd=315_000_000, current_arr_usd=32_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 1_800_000, 42_000, True, 75),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 260, 0.52, 8_000_000),
            _create_segment_distribution("tier_e2", 115, 0.46, 9_000_000),
            _create_segment_distribution("tier_e3", 42, 0.42, 8_000_000),
            _create_segment_distribution("tier_e4", 17, 0.36, 6_000_000),
            _create_segment_distribution("tier_e5", 4, 0.32, 4_000_000),
        ],
    ),
    MSA(
        code="39580", name="Raleigh-Cary, NC", short_name="Raleigh",
        state_codes=["NC"], region=MSARegion.SOUTH,
        population_2023=1_500_000, enterprise_establishments=38_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=75, fiber_coverage_pct=60,
        priority_tier=3,
        tam_usd=380_000_000, sam_usd=285_000_000, current_arr_usd=29_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 1_500_000, 38_000, True, 75),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 235, 0.52, 7_000_000),
            _create_segment_distribution("tier_e2", 105, 0.46, 8_000_000),
            _create_segment_distribution("tier_e3", 38, 0.42, 7_000_000),
            _create_segment_distribution("tier_e4", 15, 0.36, 6_000_000),
            _create_segment_distribution("tier_e5", 4, 0.32, 4_000_000),
        ],
    ),
    MSA(
        code="33340", name="Milwaukee-Waukesha, WI", short_name="Milwaukee",
        state_codes=["WI"], region=MSARegion.MIDWEST,
        population_2023=1_600_000, enterprise_establishments=40_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=70, fiber_coverage_pct=55,
        priority_tier=3,
        tam_usd=400_000_000, sam_usd=280_000_000, current_arr_usd=28_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 1_600_000, 40_000, True, 70),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 250, 0.5, 7_000_000),
            _create_segment_distribution("tier_e2", 110, 0.44, 8_000_000),
            _create_segment_distribution("tier_e3", 40, 0.4, 7_000_000),
            _create_segment_distribution("tier_e4", 16, 0.34, 5_000_000),
            _create_segment_distribution("tier_e5", 4, 0.3, 4_000_000),
        ],
    ),
    MSA(
        code="36420", name="Oklahoma City, OK", short_name="Oklahoma City",
        state_codes=["OK"], region=MSARegion.SOUTH,
        population_2023=1_450_000, enterprise_establishments=35_000,
        has_fiber=True, has_coax=False, infrastructure_type=InfrastructureType.FIBER,
        in_comcast_footprint=True, comcast_coverage_pct=55, fiber_coverage_pct=55,
        priority_tier=3,
        tam_usd=350_000_000, sam_usd=192_500_000, current_arr_usd=19_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 1_450_000, 35_000, True, 55),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 220, 0.46, 6_000_000),
            _create_segment_distribution("tier_e2", 95, 0.4, 7_000_000),
            _create_segment_distribution("tier_e3", 35, 0.36, 6_000_000),
            _create_segment_distribution("tier_e4", 14, 0.3, 5_000_000),
            _create_segment_distribution("tier_e5", 3, 0.26, 3_000_000),
        ],
    ),
    MSA(
        code="32820", name="Memphis, TN-MS-AR", short_name="Memphis",
        state_codes=["TN", "MS", "AR"], region=MSARegion.SOUTH,
        population_2023=1_340_000, enterprise_establishments=32_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=65, fiber_coverage_pct=50,
        priority_tier=3,
        tam_usd=320_000_000, sam_usd=208_000_000, current_arr_usd=21_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 1_340_000, 32_000, True, 65),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 200, 0.48, 6_000_000),
            _create_segment_distribution("tier_e2", 90, 0.42, 7_000_000),
            _create_segment_distribution("tier_e3", 32, 0.38, 6_000_000),
            _create_segment_distribution("tier_e4", 13, 0.32, 5_000_000),
            _create_segment_distribution("tier_e5", 3, 0.28, 3_000_000),
        ],
    ),
    MSA(
        code="31140", name="Louisville/Jefferson County, KY-IN", short_name="Louisville",
        state_codes=["KY", "IN"], region=MSARegion.SOUTH,
        population_2023=1_300_000, enterprise_establishments=32_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=70, fiber_coverage_pct=55,
        priority_tier=3,
        tam_usd=320_000_000, sam_usd=224_000_000, current_arr_usd=22_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 1_300_000, 32_000, True, 70),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 200, 0.5, 6_000_000),
            _create_segment_distribution("tier_e2", 90, 0.44, 7_000_000),
            _create_segment_distribution("tier_e3", 32, 0.4, 6_000_000),
            _create_segment_distribution("tier_e4", 13, 0.34, 5_000_000),
            _create_segment_distribution("tier_e5", 3, 0.3, 3_000_000),
        ],
    ),
    MSA(
        code="40060", name="Richmond, VA", short_name="Richmond",
        state_codes=["VA"], region=MSARegion.SOUTH,
        population_2023=1_300_000, enterprise_establishments=32_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=75, fiber_coverage_pct=60,
        priority_tier=3,
        tam_usd=320_000_000, sam_usd=240_000_000, current_arr_usd=24_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 1_300_000, 32_000, True, 75),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 200, 0.52, 6_000_000),
            _create_segment_distribution("tier_e2", 90, 0.46, 7_000_000),
            _create_segment_distribution("tier_e3", 32, 0.42, 6_000_000),
            _create_segment_distribution("tier_e4", 13, 0.36, 5_000_000),
            _create_segment_distribution("tier_e5", 3, 0.32, 3_000_000),
        ],
    ),
    MSA(
        code="35380", name="New Orleans-Metairie, LA", short_name="New Orleans",
        state_codes=["LA"], region=MSARegion.SOUTH,
        population_2023=1_270_000, enterprise_establishments=30_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=60, fiber_coverage_pct=45,
        priority_tier=3,
        tam_usd=300_000_000, sam_usd=180_000_000, current_arr_usd=18_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 1_270_000, 30_000, True, 60),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 185, 0.46, 5_000_000),
            _create_segment_distribution("tier_e2", 85, 0.4, 6_000_000),
            _create_segment_distribution("tier_e3", 30, 0.36, 5_000_000),
            _create_segment_distribution("tier_e4", 12, 0.3, 4_000_000),
            _create_segment_distribution("tier_e5", 3, 0.26, 3_000_000),
        ],
    ),
    MSA(
        code="41620", name="Salt Lake City, UT", short_name="Salt Lake City",
        state_codes=["UT"], region=MSARegion.WEST,
        population_2023=1_250_000, enterprise_establishments=35_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=75, fiber_coverage_pct=65,
        priority_tier=3,
        tam_usd=350_000_000, sam_usd=262_500_000, current_arr_usd=26_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 1_250_000, 35_000, True, 75),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 220, 0.52, 7_000_000),
            _create_segment_distribution("tier_e2", 95, 0.46, 8_000_000),
            _create_segment_distribution("tier_e3", 35, 0.42, 6_000_000),
            _create_segment_distribution("tier_e4", 14, 0.36, 5_000_000),
            _create_segment_distribution("tier_e5", 3, 0.32, 3_000_000),
        ],
    ),
    MSA(
        code="24860", name="Greenville-Anderson, SC", short_name="Greenville",
        state_codes=["SC"], region=MSARegion.SOUTH,
        population_2023=950_000, enterprise_establishments=22_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=70, fiber_coverage_pct=55,
        priority_tier=3,
        tam_usd=220_000_000, sam_usd=154_000_000, current_arr_usd=15_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 950_000, 22_000, True, 70),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 135, 0.48, 4_000_000),
            _create_segment_distribution("tier_e2", 60, 0.42, 5_000_000),
            _create_segment_distribution("tier_e3", 22, 0.38, 4_000_000),
            _create_segment_distribution("tier_e4", 9, 0.32, 3_000_000),
            _create_segment_distribution("tier_e5", 2, 0.28, 2_000_000),
        ],
    ),
    MSA(
        code="25540", name="Hartford-East Hartford-Middletown, CT", short_name="Hartford",
        state_codes=["CT"], region=MSARegion.NORTHEAST,
        population_2023=1_200_000, enterprise_establishments=30_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=85, fiber_coverage_pct=75,
        priority_tier=3,
        tam_usd=300_000_000, sam_usd=255_000_000, current_arr_usd=26_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 1_200_000, 30_000, True, 85),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 185, 0.54, 6_000_000),
            _create_segment_distribution("tier_e2", 85, 0.48, 7_000_000),
            _create_segment_distribution("tier_e3", 30, 0.44, 6_000_000),
            _create_segment_distribution("tier_e4", 12, 0.38, 5_000_000),
            _create_segment_distribution("tier_e5", 3, 0.34, 3_000_000),
        ],
    ),
    MSA(
        code="27260", name="Jacksonville, FL", short_name="Jacksonville",
        state_codes=["FL"], region=MSARegion.SOUTH,
        population_2023=1_600_000, enterprise_establishments=38_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=75, fiber_coverage_pct=60,
        priority_tier=3,
        tam_usd=380_000_000, sam_usd=285_000_000, current_arr_usd=29_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 1_600_000, 38_000, True, 75),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 235, 0.52, 7_000_000),
            _create_segment_distribution("tier_e2", 105, 0.46, 8_000_000),
            _create_segment_distribution("tier_e3", 38, 0.42, 7_000_000),
            _create_segment_distribution("tier_e4", 15, 0.36, 6_000_000),
            _create_segment_distribution("tier_e5", 4, 0.32, 4_000_000),
        ],
    ),
    MSA(
        code="13820", name="Birmingham-Hoover, AL", short_name="Birmingham",
        state_codes=["AL"], region=MSARegion.SOUTH,
        population_2023=1_100_000, enterprise_establishments=26_000,
        has_fiber=True, has_coax=True, infrastructure_type=InfrastructureType.FIBER_COAX,
        in_comcast_footprint=True, comcast_coverage_pct=65, fiber_coverage_pct=50,
        priority_tier=3,
        tam_usd=260_000_000, sam_usd=169_000_000, current_arr_usd=17_000_000, market_share_pct=10,
        sales_allocation=_create_sales_allocation(3, 1_100_000, 26_000, True, 65),
        segment_distribution=[
            _create_segment_distribution("tier_e1", 160, 0.48, 5_000_000),
            _create_segment_distribution("tier_e2", 70, 0.42, 6_000_000),
            _create_segment_distribution("tier_e3", 26, 0.38, 5_000_000),
            _create_segment_distribution("tier_e4", 10, 0.32, 4_000_000),
            _create_segment_distribution("tier_e5", 2, 0.28, 2_000_000),
        ],
    ),
]


class MSARegistry:
    """Registry for MSA data and lookups."""
    
    def __init__(self):
        self._msas = {msa.code: msa for msa in TOP_50_MSAS}
        self._by_name = {msa.short_name.lower(): msa for msa in TOP_50_MSAS}
        # Calculate priority scores
        for msa in TOP_50_MSAS:
            msa.calculate_priority_score()
    
    def get_all(self) -> List[MSA]:
        """Get all MSAs."""
        return TOP_50_MSAS
    
    def get_by_code(self, code: str) -> Optional[MSA]:
        """Get MSA by CBSA code."""
        return self._msas.get(code)
    
    def get_by_name(self, name: str) -> Optional[MSA]:
        """Get MSA by short name (case-insensitive)."""
        return self._by_name.get(name.lower())
    
    def get_by_region(self, region: MSARegion) -> List[MSA]:
        """Get MSAs in a region."""
        return [m for m in TOP_50_MSAS if m.region == region]
    
    def get_by_tier(self, tier: int) -> List[MSA]:
        """Get MSAs by priority tier."""
        return [m for m in TOP_50_MSAS if m.priority_tier == tier]
    
    def get_by_state(self, state_code: str) -> List[MSA]:
        """Get MSAs that include a state."""
        return [m for m in TOP_50_MSAS if state_code in m.state_codes]
    
    def get_high_coverage(self, min_coverage_pct: float = 75) -> List[MSA]:
        """Get MSAs with high Comcast coverage."""
        return [m for m in TOP_50_MSAS if m.comcast_coverage_pct >= min_coverage_pct]
    
    def get_with_fiber(self) -> List[MSA]:
        """Get MSAs with fiber infrastructure."""
        return [m for m in TOP_50_MSAS if m.has_fiber]
    
    def get_with_coax(self) -> List[MSA]:
        """Get MSAs with coax infrastructure."""
        return [m for m in TOP_50_MSAS if m.has_coax]
    
    def get_fiber_coax(self) -> List[MSA]:
        """Get MSAs with both fiber and coax."""
        return [m for m in TOP_50_MSAS if m.has_fiber and m.has_coax]
    
    def get_by_priority_score(self, min_score: float = 50) -> List[MSA]:
        """Get MSAs above a priority score threshold, sorted by score."""
        filtered = [m for m in TOP_50_MSAS if m.priority_score >= min_score]
        return sorted(filtered, key=lambda m: m.priority_score, reverse=True)
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary statistics, using CB Config enterprise_arr for total ARR."""
        # Try to get enterprise ARR from CB Config
        try:
            from src.cb_config.store import CBConfigStore
            cb_store = CBConfigStore()
            cb_config = cb_store.get_config()
            enterprise_arr = cb_config.company_metrics.enterprise_arr
        except Exception:
            enterprise_arr = None
        
        total_pop = sum(m.population_2023 for m in TOP_50_MSAS)
        total_establishments = sum(m.enterprise_establishments for m in TOP_50_MSAS)
        total_quota_headcount = sum(m.sales_allocation.total_quota_bearing_headcount for m in TOP_50_MSAS)
        total_quota = sum(m.sales_allocation.total_quota_usd for m in TOP_50_MSAS)
        
        # Sum up the hardcoded MSA ARR values for scaling
        base_msa_arr = sum(m.current_arr_usd for m in TOP_50_MSAS)
        
        # Use CB Config enterprise_arr if available, otherwise use base MSA ARR
        if enterprise_arr and enterprise_arr > 0 and base_msa_arr > 0:
            arr_scale = enterprise_arr / base_msa_arr
            total_arr = enterprise_arr
        else:
            arr_scale = 1.0
            total_arr = base_msa_arr
        
        by_region = {}
        for region in MSARegion:
            msas = self.get_by_region(region)
            region_base_arr = sum(m.current_arr_usd for m in msas)
            by_region[region.value] = {
                "count": len(msas),
                "population": sum(m.population_2023 for m in msas),
                "establishments": sum(m.enterprise_establishments for m in msas),
                "quota_headcount": sum(m.sales_allocation.total_quota_bearing_headcount for m in msas),
                "total_quota_usd": sum(m.sales_allocation.total_quota_usd for m in msas),
                "current_arr_usd": region_base_arr * arr_scale,
            }
        
        by_tier = {}
        for tier in [1, 2, 3]:
            msas = self.get_by_tier(tier)
            tier_base_arr = sum(m.current_arr_usd for m in msas)
            by_tier[f"tier_{tier}"] = {
                "count": len(msas),
                "population": sum(m.population_2023 for m in msas),
                "establishments": sum(m.enterprise_establishments for m in msas),
                "quota_headcount": sum(m.sales_allocation.total_quota_bearing_headcount for m in msas),
                "total_quota_usd": sum(m.sales_allocation.total_quota_usd for m in msas),
                "current_arr_usd": tier_base_arr * arr_scale,
            }
        
        by_infrastructure = {
            "fiber_coax": len(self.get_fiber_coax()),
            "fiber_only": len([m for m in TOP_50_MSAS if m.has_fiber and not m.has_coax]),
            "coax_only": len([m for m in TOP_50_MSAS if m.has_coax and not m.has_fiber]),
        }
        
        high_coverage = self.get_high_coverage(75)
        
        return {
            "total_msas": len(TOP_50_MSAS),
            "total_population": total_pop,
            "total_enterprise_establishments": total_establishments,
            "total_quota_bearing_headcount": total_quota_headcount,
            "total_quota_usd": total_quota,
            "total_current_arr_usd": total_arr,
            "by_region": by_region,
            "by_tier": by_tier,
            "by_infrastructure": by_infrastructure,
            "high_coverage_count": len(high_coverage),
            "avg_coverage_pct": sum(m.comcast_coverage_pct for m in TOP_50_MSAS) / len(TOP_50_MSAS),
            "avg_fiber_coverage_pct": sum(m.fiber_coverage_pct for m in TOP_50_MSAS) / len(TOP_50_MSAS),
        }
    
    def get_sales_capacity_summary(self) -> Dict[str, Any]:
        """Get sales capacity and headcount summary."""
        totals = {
            "sdr": 0, "bdr": 0, "inside_ae": 0, "inside_am": 0,
            "field_ae": 0, "field_am": 0, "strategic_ae": 0, "major_am": 0,
            "se": 0, "partner_mgr": 0, "sales_mgr": 0,
        }
        
        for msa in TOP_50_MSAS:
            alloc = msa.sales_allocation
            totals["sdr"] += alloc.sdr_count
            totals["bdr"] += alloc.bdr_count
            totals["inside_ae"] += alloc.inside_ae_count
            totals["inside_am"] += alloc.inside_am_count
            totals["field_ae"] += alloc.field_ae_count
            totals["field_am"] += alloc.field_am_count
            totals["strategic_ae"] += alloc.strategic_ae_count
            totals["major_am"] += alloc.major_am_count
            totals["se"] += alloc.se_count
            totals["partner_mgr"] += alloc.partner_mgr_count
            totals["sales_mgr"] += alloc.sales_mgr_count
        
        return {
            "by_role": totals,
            "total_headcount": sum(totals.values()),
            "total_quota_bearing": (
                totals["inside_ae"] + totals["inside_am"] +
                totals["field_ae"] + totals["field_am"] +
                totals["strategic_ae"] + totals["major_am"] +
                totals["partner_mgr"]
            ),
            "inside_sales_total": totals["sdr"] + totals["bdr"] + totals["inside_ae"] + totals["inside_am"],
            "field_sales_total": totals["field_ae"] + totals["field_am"] + totals["strategic_ae"] + totals["major_am"],
        }
    
    def get_segment_distribution_by_msa(self, segment_tier: str) -> List[Dict[str, Any]]:
        """Get distribution of a specific segment across all MSAs."""
        results = []
        for msa in TOP_50_MSAS:
            for dist in msa.segment_distribution:
                if dist.segment_tier == segment_tier:
                    results.append({
                        "msa_code": msa.code,
                        "msa_name": msa.short_name,
                        "region": msa.region.value,
                        "priority_tier": msa.priority_tier,
                        "total_accounts": dist.total_accounts,
                        "hq_accounts": dist.hq_accounts,
                        "branch_accounts": dist.branch_accounts,
                        "arr_usd": dist.arr_usd,
                        "avg_mrr_usd": dist.avg_mrr_usd,
                        "whitespace_accounts": dist.whitespace_accounts,
                        "expansion_opportunities": dist.expansion_opportunities,
                    })
        return sorted(results, key=lambda x: x["arr_usd"], reverse=True)


# Singleton instance
_registry: Optional[MSARegistry] = None


def get_msa_registry() -> MSARegistry:
    """Get the singleton MSA registry instance."""
    global _registry
    if _registry is None:
        _registry = MSARegistry()
    return _registry


def get_segment_sales_configs() -> List[SegmentSalesConfig]:
    """Get the segment sales configurations."""
    return DEFAULT_SEGMENT_SALES_CONFIGS
