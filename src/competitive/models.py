"""Models for Competitive Intelligence."""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import uuid


class CompetitorCategory(str, Enum):
    """Categories of competitors."""
    # Traditional connectivity providers
    TELCO = "telco"
    CABLE = "cable"
    FIBER = "fiber"
    
    # Cloud and data center
    CLOUD = "cloud"
    CLOUD_CONNECT = "cloud_connect"  # Cloud interconnection (Equinix, Megaport, etc.)
    DATA_CENTER = "data_center"
    
    # Security and networking
    SDWAN_SASE = "sdwan_sase"  # SD-WAN and SASE providers
    SECURITY = "security"
    
    # Multi-cloud networking specialists
    MULTI_CLOUD = "multi_cloud"
    
    # Managed services
    MSP = "msp"
    
    # Communications
    UCAAS = "ucaas"  # UCaaS/CCaaS providers
    
    OTHER = "other"


class Competitor(BaseModel):
    """A competitor company."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    ticker: Optional[str] = None  # Stock ticker if public
    category: CompetitorCategory = CompetitorCategory.TELCO
    business_url: str  # URL to their business/enterprise services page
    logo_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Scraped data
    last_scraped: Optional[datetime] = None
    scraped_content: Optional[Dict[str, Any]] = None
    scrape_error: Optional[str] = None


class ScrapedWebContent(BaseModel):
    """Content scraped from a competitor's website."""
    url: str
    title: str
    scraped_at: datetime
    
    # Extracted content
    main_text: str
    products: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    pricing_info: Optional[str] = None
    target_segments: List[str] = Field(default_factory=list)
    key_differentiators: List[str] = Field(default_factory=list)
    
    # Metadata
    meta_description: Optional[str] = None
    page_count: int = 1


class CompetitiveAnalysis(BaseModel):
    """LLM-generated competitive analysis."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Comparison details
    comcast_data: ScrapedWebContent
    competitor_ids: List[str]
    competitor_data: Dict[str, ScrapedWebContent]
    
    # LLM Analysis
    llm_provider: str
    llm_model: str
    
    # Analysis sections
    executive_summary: str
    strengths_weaknesses: Dict[str, List[str]]  # {strengths: [], weaknesses: []} for Comcast Business
    product_comparison: str
    pricing_insights: str
    market_positioning: str
    recommendations: List[str]
    opportunities: List[str]
    threats: List[str]
    
    # Full analysis text
    full_analysis: str


class ComparisonRequest(BaseModel):
    """Request to generate a competitive comparison."""
    competitor_ids: List[str]
    refresh_scrape: bool = False  # Force re-scrape even if data exists


class ComparisonResponse(BaseModel):
    """Response with competitive analysis."""
    analysis_id: str
    created_at: datetime
    competitors_analyzed: List[str]
    executive_summary: str
    recommendations: List[str]
    full_analysis: str

