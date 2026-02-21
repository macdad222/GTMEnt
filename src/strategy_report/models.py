"""Models for comprehensive strategy reports."""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum


class ReportStatus(str, Enum):
    """Status of report generation."""
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class ReportSection(str, Enum):
    """Sections of the strategy report."""
    EXECUTIVE_SUMMARY = "executive_summary"
    MARKET_OVERVIEW = "market_overview"
    COMPETITIVE_LANDSCAPE = "competitive_landscape"
    CUSTOMER_SEGMENTATION = "customer_segmentation"
    PRODUCT_PORTFOLIO = "product_portfolio"
    GEOGRAPHIC_ANALYSIS = "geographic_analysis"
    GROWTH_STRATEGY = "growth_strategy"
    GO_TO_MARKET = "go_to_market"
    FINANCIAL_PROJECTIONS = "financial_projections"
    RISK_ASSESSMENT = "risk_assessment"
    IMPLEMENTATION_ROADMAP = "implementation_roadmap"
    APPENDIX = "appendix"


class KeyInsight(BaseModel):
    """A key insight or finding."""
    title: str
    description: str
    impact: str  # "high", "medium", "low"
    category: str
    supporting_data: Optional[str] = None


class StrategicRecommendation(BaseModel):
    """A strategic recommendation."""
    priority: int  # 1 = highest
    title: str
    description: str
    rationale: str
    expected_impact: str
    timeline: str  # "immediate", "short-term", "medium-term", "long-term"
    investment_required: Optional[str] = None
    success_metrics: List[str] = Field(default_factory=list)


class MarketSizingData(BaseModel):
    """Market sizing information."""
    total_addressable_market: float  # in billions
    serviceable_addressable_market: float
    serviceable_obtainable_market: float
    current_market_share: float  # percentage
    target_market_share: float
    cagr: float
    key_drivers: List[str] = Field(default_factory=list)


class CompetitorPositioning(BaseModel):
    """Competitor analysis summary."""
    competitor_name: str
    market_position: str  # "leader", "challenger", "follower", "niche"
    strengths: List[str]
    weaknesses: List[str]
    threat_level: str  # "high", "medium", "low"
    strategic_response: str


class SegmentStrategy(BaseModel):
    """Strategy for a customer segment."""
    segment_name: str
    segment_size: str
    growth_potential: str
    current_penetration: float
    target_penetration: float
    value_proposition: str
    key_tactics: List[str]
    resource_allocation: str  # percentage or description


class GeographicPriority(BaseModel):
    """Geographic market priority."""
    msa_name: str
    market_rank: int
    market_potential: str
    current_presence: str
    infrastructure_status: str
    recommended_investment: str
    key_actions: List[str]


class FinancialProjection(BaseModel):
    """Financial projection for a year."""
    year: int
    revenue_target: float
    growth_rate: float
    new_logo_contribution: float
    expansion_contribution: float
    key_assumptions: List[str]


class RiskItem(BaseModel):
    """Risk assessment item."""
    risk_category: str
    risk_description: str
    likelihood: str  # "high", "medium", "low"
    impact: str  # "high", "medium", "low"
    mitigation_strategy: str


class ImplementationMilestone(BaseModel):
    """Implementation roadmap milestone."""
    phase: str  # "Phase 1", "Phase 2", etc.
    timeframe: str
    objectives: List[str]
    key_initiatives: List[str]
    success_criteria: List[str]
    dependencies: List[str] = Field(default_factory=list)


class ReportSectionContent(BaseModel):
    """Content for a report section."""
    section_id: ReportSection
    section_title: str
    section_subtitle: Optional[str] = None
    narrative: str  # Main text content (markdown)
    key_points: List[str] = Field(default_factory=list)
    charts_data: Optional[Dict[str, Any]] = None  # Data for charts
    tables_data: Optional[List[Dict[str, Any]]] = None  # Data for tables
    footnotes: List[str] = Field(default_factory=list)


class StrategyReport(BaseModel):
    """Complete strategy report."""
    id: str = Field(default_factory=lambda: f"report-{datetime.now().strftime('%Y%m%d%H%M%S')}")
    title: str = "Enterprise Growth Strategy: Accelerating to 15% Annual Growth"
    subtitle: str = "Comcast Business Enterprise Segment Strategic Analysis"
    version: str = "1.0"
    status: ReportStatus = ReportStatus.PENDING
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    generated_by: str = "AI Strategy Assistant"
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    generation_time_seconds: Optional[float] = None
    
    # Executive Summary
    executive_summary: Optional[str] = None
    key_insights: List[KeyInsight] = Field(default_factory=list)
    strategic_recommendations: List[StrategicRecommendation] = Field(default_factory=list)
    
    # Detailed Sections
    sections: List[ReportSectionContent] = Field(default_factory=list)
    
    # Structured Data
    market_sizing: Optional[MarketSizingData] = None
    competitor_analysis: List[CompetitorPositioning] = Field(default_factory=list)
    segment_strategies: List[SegmentStrategy] = Field(default_factory=list)
    geographic_priorities: List[GeographicPriority] = Field(default_factory=list)
    financial_projections: List[FinancialProjection] = Field(default_factory=list)
    risk_assessment: List[RiskItem] = Field(default_factory=list)
    implementation_roadmap: List[ImplementationMilestone] = Field(default_factory=list)
    
    # Data Sources
    data_sources_used: List[str] = Field(default_factory=list)
    external_sources_cited: List[str] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    
    # Raw LLM response preserved for re-parsing
    raw_llm_response: Optional[str] = None
    
    # Error handling
    error_message: Optional[str] = None

