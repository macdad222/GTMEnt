"""Models for Product Competitiveness and Roadmap Recommendations."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class MarketPosition(str, Enum):
    """Product market position."""
    LEADER = "leader"
    STRONG = "strong"
    GROWING = "growing"
    CHALLENGER = "challenger"
    EMERGING = "emerging"
    NOT_YET = "not_yet"


class InvestmentPriority(str, Enum):
    """Investment priority level."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    MAINTAIN = "maintain"


class ProductCategory(str, Enum):
    """Product category."""
    CONNECTIVITY = "connectivity"
    SECURE_NETWORKING = "secure_networking"
    CYBERSECURITY = "cybersecurity"
    VOICE_COLLAB = "voice_collab"
    DATA_CENTER = "data_center"
    MOBILE = "mobile"


class ProductPortfolio(BaseModel):
    """Comcast Business product in the portfolio."""
    id: str
    name: str
    category: ProductCategory
    description: str
    
    # Current state
    current_arr: float = 0.0  # Current ARR from this product
    current_penetration_pct: float = 0.0  # % of enterprise accounts with product
    yoy_growth_pct: float = 0.0  # Year-over-year growth
    
    # Market position
    market_position: MarketPosition = MarketPosition.GROWING
    market_rank: int = 3  # 1-5, where 1 is market leader
    
    # Competitive info
    key_competitors: List[str] = Field(default_factory=list)
    competitive_strengths: List[str] = Field(default_factory=list)
    competitive_gaps: List[str] = Field(default_factory=list)
    
    # Product state
    is_launched: bool = True
    launch_date: Optional[str] = None  # For upcoming products
    maturity: str = "mature"  # emerging, growing, mature, declining


class CompetitorProduct(BaseModel):
    """Competitor's product for comparison."""
    competitor: str
    product_name: str
    strengths: List[str] = Field(default_factory=list)
    market_share_pct: Optional[float] = None


class ProductCompetitiveness(BaseModel):
    """Competitive analysis for a product category."""
    category: ProductCategory
    category_label: str
    
    # CB positioning
    cb_products: List[str] = Field(default_factory=list)
    overall_position: MarketPosition = MarketPosition.GROWING
    market_share_pct: Optional[float] = None
    
    # Market data
    tam_billions: float = 0.0
    cagr_pct: float = 0.0
    
    # Competition
    market_leaders: List[str] = Field(default_factory=list)
    competitor_products: List[CompetitorProduct] = Field(default_factory=list)
    
    # Gap analysis
    feature_gaps: List[str] = Field(default_factory=list)
    coverage_gaps: List[str] = Field(default_factory=list)
    pricing_position: str = "competitive"  # premium, competitive, value, discount
    
    # Strategic assessment
    strategic_fit: str = ""  # High/Medium/Low with explanation
    growth_opportunity: str = ""
    risk_factors: List[str] = Field(default_factory=list)


class RoadmapRecommendation(BaseModel):
    """Strategic roadmap recommendation."""
    id: str
    title: str
    description: str
    
    # Categorization
    category: ProductCategory
    recommendation_type: str  # "invest", "build", "partner", "acquire", "divest"
    priority: InvestmentPriority
    
    # Impact
    revenue_impact_millions: float = 0.0
    margin_impact_pct: float = 0.0
    time_to_value_months: int = 12
    
    # Requirements
    estimated_investment_millions: float = 0.0
    requires_partnership: bool = False
    partner_candidates: List[str] = Field(default_factory=list)
    
    # Timeline
    phase: str = "2026"  # "2026", "2027", "2028", "2028+"
    dependencies: List[str] = Field(default_factory=list)
    
    # Strategic rationale
    rationale: str = ""
    success_metrics: List[str] = Field(default_factory=list)


class ProductRoadmapIntel(BaseModel):
    """LLM-generated product competitiveness and roadmap intelligence."""
    id: str = Field(default_factory=lambda: f"prod_intel_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    llm_provider: str = ""
    llm_model: str = ""
    
    # Executive summary
    executive_summary: str = ""
    
    # Portfolio assessment
    portfolio_health_score: float = 0.0  # 0-100
    portfolio_strengths: List[str] = Field(default_factory=list)
    portfolio_weaknesses: List[str] = Field(default_factory=list)
    
    # Product assessments
    product_assessments: List[ProductPortfolio] = Field(default_factory=list)
    
    # Competitive landscape by category
    competitive_analysis: List[ProductCompetitiveness] = Field(default_factory=list)
    
    # Strategic recommendations
    roadmap_recommendations: List[RoadmapRecommendation] = Field(default_factory=list)
    
    # Investment summary
    total_recommended_investment_millions: float = 0.0
    expected_revenue_impact_millions: float = 0.0
    expected_roi_pct: float = 0.0
    
    # Key themes
    strategic_themes: List[str] = Field(default_factory=list)
    market_trends: List[str] = Field(default_factory=list)
    
    # Risk assessment
    key_risks: List[str] = Field(default_factory=list)
    mitigation_strategies: List[str] = Field(default_factory=list)
    
    # Sources and methodology
    sources: List[str] = Field(default_factory=list)
    methodology_notes: str = ""


# Default product portfolio for Comcast Business
DEFAULT_PRODUCT_PORTFOLIO = [
    ProductPortfolio(
        id="broadband",
        name="Business Internet (Coax/Fiber)",
        category=ProductCategory.CONNECTIVITY,
        description="High-speed broadband for business via coax and fiber infrastructure",
        current_penetration_pct=85.0,
        yoy_growth_pct=8.0,
        market_position=MarketPosition.STRONG,
        market_rank=2,
        key_competitors=["Verizon Fios", "AT&T Fiber", "Spectrum Business", "Frontier"],
        competitive_strengths=["Extensive footprint", "Reliable network", "Strong SLAs"],
        competitive_gaps=["Limited fiber-to-the-prem in some areas", "Speed tier perception"],
        maturity="mature",
    ),
    ProductPortfolio(
        id="ethernet",
        name="Ethernet Dedicated Internet",
        category=ProductCategory.CONNECTIVITY,
        description="Dedicated ethernet services for enterprise connectivity",
        current_penetration_pct=35.0,
        yoy_growth_pct=12.0,
        market_position=MarketPosition.GROWING,
        market_rank=3,
        key_competitors=["Verizon Business", "Lumen", "AT&T Business", "Zayo"],
        competitive_strengths=["Competitive pricing", "Self-service portal", "Fast provisioning"],
        competitive_gaps=["Geographic coverage vs. Lumen", "Large enterprise presence"],
        maturity="mature",
    ),
    ProductPortfolio(
        id="fixed_wireless",
        name="Fixed Wireless Access",
        category=ProductCategory.CONNECTIVITY,
        description="CBRS and mmWave fixed wireless for hard-to-reach locations",
        current_penetration_pct=5.0,
        yoy_growth_pct=45.0,
        market_position=MarketPosition.EMERGING,
        market_rank=4,
        key_competitors=["T-Mobile Business", "Verizon 5G Business", "Starry"],
        competitive_strengths=["CBRS spectrum", "Network density for backhaul"],
        competitive_gaps=["Coverage footprint", "Speed consistency", "Enterprise perception"],
        maturity="emerging",
    ),
    ProductPortfolio(
        id="mobile_enterprise",
        name="Mobile Enterprise",
        category=ProductCategory.MOBILE,
        description="Enterprise mobile services (planned 2026 launch)",
        is_launched=False,
        launch_date="2026",
        current_penetration_pct=0.0,
        yoy_growth_pct=0.0,
        market_position=MarketPosition.NOT_YET,
        market_rank=5,
        key_competitors=["Verizon Wireless", "AT&T Mobility", "T-Mobile for Business"],
        competitive_strengths=["Bundle opportunity", "Converged billing", "Existing relationships"],
        competitive_gaps=["No current offering", "Late to market", "Network coverage"],
        maturity="emerging",
    ),
    ProductPortfolio(
        id="sdwan",
        name="SD-WAN",
        category=ProductCategory.SECURE_NETWORKING,
        description="Software-defined WAN for enterprise branch connectivity",
        current_penetration_pct=18.0,
        yoy_growth_pct=28.0,
        market_position=MarketPosition.GROWING,
        market_rank=4,
        key_competitors=["Cisco/Meraki", "Fortinet", "VMware VeloCloud", "Palo Alto Prisma"],
        competitive_strengths=["Managed service model", "Integrated with connectivity", "Single vendor"],
        competitive_gaps=["Feature depth vs. pure-play", "Multi-vendor support", "Global reach"],
        maturity="growing",
    ),
    ProductPortfolio(
        id="sase",
        name="SASE / Secure Access Service Edge",
        category=ProductCategory.SECURE_NETWORKING,
        description="Converged networking and security-as-a-service",
        current_penetration_pct=8.0,
        yoy_growth_pct=52.0,
        market_position=MarketPosition.CHALLENGER,
        market_rank=5,
        key_competitors=["Zscaler", "Palo Alto Prisma", "Cisco Umbrella", "Cloudflare"],
        competitive_strengths=["Bundle with connectivity", "Emerging capability"],
        competitive_gaps=["Feature maturity", "Brand recognition in security", "Partner ecosystem"],
        maturity="emerging",
    ),
    ProductPortfolio(
        id="managed_firewall",
        name="Managed Firewall",
        category=ProductCategory.SECURE_NETWORKING,
        description="Managed next-gen firewall services",
        current_penetration_pct=22.0,
        yoy_growth_pct=15.0,
        market_position=MarketPosition.GROWING,
        market_rank=4,
        key_competitors=["Palo Alto Networks", "Fortinet", "Cisco", "Check Point"],
        competitive_strengths=["Managed service simplicity", "Bundled pricing"],
        competitive_gaps=["Advanced threat capabilities", "SOAR integration"],
        maturity="mature",
    ),
    ProductPortfolio(
        id="security_edge",
        name="SecurityEdge",
        category=ProductCategory.CYBERSECURITY,
        description="DNS-layer security and threat protection",
        current_penetration_pct=25.0,
        yoy_growth_pct=20.0,
        market_position=MarketPosition.STRONG,
        market_rank=3,
        key_competitors=["Cisco Umbrella", "Cloudflare Gateway", "Infoblox"],
        competitive_strengths=["Easy deployment", "Integrated billing", "SMB-friendly"],
        competitive_gaps=["Enterprise feature depth", "Advanced analytics"],
        maturity="mature",
    ),
    ProductPortfolio(
        id="advanced_security",
        name="Advanced Threat Protection / DDoS / MDR",
        category=ProductCategory.CYBERSECURITY,
        description="Advanced security services including DDoS mitigation and MDR",
        current_penetration_pct=12.0,
        yoy_growth_pct=35.0,
        market_position=MarketPosition.CHALLENGER,
        market_rank=5,
        key_competitors=["CrowdStrike", "Palo Alto Cortex", "Microsoft Sentinel", "SentinelOne"],
        competitive_strengths=["Integrated with network", "Growing SOC capabilities"],
        competitive_gaps=["Brand in security", "Feature depth", "Threat intel"],
        maturity="growing",
    ),
    ProductPortfolio(
        id="ucaas",
        name="UCaaS / Business VoiceEdge",
        category=ProductCategory.VOICE_COLLAB,
        description="Unified communications as a service",
        current_penetration_pct=30.0,
        yoy_growth_pct=10.0,
        market_position=MarketPosition.STRONG,
        market_rank=3,
        key_competitors=["RingCentral", "Microsoft Teams Phone", "Zoom Phone", "8x8"],
        competitive_strengths=["Integrated billing", "Existing voice relationships", "Support"],
        competitive_gaps=["AI features", "Collaboration tools", "Video quality"],
        maturity="mature",
    ),
    ProductPortfolio(
        id="ccaas",
        name="CCaaS / Contact Center",
        category=ProductCategory.VOICE_COLLAB,
        description="Contact center as a service",
        current_penetration_pct=8.0,
        yoy_growth_pct=25.0,
        market_position=MarketPosition.CHALLENGER,
        market_rank=5,
        key_competitors=["Genesys", "Five9", "NICE", "Talkdesk"],
        competitive_strengths=["Bundle opportunity", "Existing voice customers"],
        competitive_gaps=["AI/ML capabilities", "WFM features", "Integrations"],
        maturity="growing",
    ),
    ProductPortfolio(
        id="sip_trunking",
        name="SIP Trunking",
        category=ProductCategory.VOICE_COLLAB,
        description="Enterprise SIP trunking services",
        current_penetration_pct=28.0,
        yoy_growth_pct=5.0,
        market_position=MarketPosition.STRONG,
        market_rank=2,
        key_competitors=["Lumen", "Verizon", "Bandwidth", "Twilio"],
        competitive_strengths=["Network quality", "Enterprise SLAs", "Porting expertise"],
        competitive_gaps=["Programmable features", "API ecosystem"],
        maturity="mature",
    ),
    ProductPortfolio(
        id="colocation",
        name="Data Center / Colocation",
        category=ProductCategory.DATA_CENTER,
        description="Colocation and cloud connectivity services",
        current_penetration_pct=6.0,
        yoy_growth_pct=18.0,
        market_position=MarketPosition.CHALLENGER,
        market_rank=5,
        key_competitors=["Equinix", "Digital Realty", "CoreSite", "QTS"],
        competitive_strengths=["Network integration", "Hybrid cloud connectivity"],
        competitive_gaps=["Footprint", "Scale", "Global presence"],
        maturity="growing",
    ),
]

