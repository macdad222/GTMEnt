"""Data models for market intelligence (TAM, trends, assumptions)."""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class MarketSegment(str, Enum):
    """Enterprise MRR tier segments (aligned with plan)."""

    TIER_E1 = "tier_e1"  # $1.5k–$10k
    TIER_E2 = "tier_e2"  # $10k–$50k
    TIER_E3 = "tier_e3"  # $50k–$250k
    TIER_E4 = "tier_e4"  # $250k–$1M
    TIER_E5 = "tier_e5"  # $1M+
    ENTERPRISE_TOTAL = "enterprise_total"


class SolutionArea(str, Enum):
    """Solution/service taxonomy (aligned with Comcast Business portfolio)."""

    CONNECTIVITY_INTERNET = "connectivity_internet"  # Dedicated Internet, broadband
    ETHERNET_TRANSPORT = "ethernet_transport"  # ENS, EPL, EVPL, wavelength
    SD_WAN = "sd_wan"
    SASE_SECURITY = "sase_security"
    CLOUD_CONNECTIVITY = "cloud_connectivity"  # Direct2Cloud
    MANAGED_SERVICES = "managed_services"
    VOICE_UC = "voice_uc"
    MOBILE_WIRELESS = "mobile_wireless"
    TOTAL = "total"


class Assumption(BaseModel):
    """An explicit assumption used in a TAM/trend calculation."""

    id: str
    description: str
    value: str  # e.g., "5.2%", "$42B", "2.1M businesses"
    source: Optional[str] = None  # Citation or "internal estimate"
    source_url: Optional[str] = None
    as_of_date: Optional[datetime] = None
    methodology: Optional[str] = None  # How the value was derived


class TAMEstimate(BaseModel):
    """A TAM/SAM/SOM estimate with full provenance."""

    id: str
    segment: MarketSegment
    solution_area: SolutionArea
    tam_usd: float = Field(..., description="Total Addressable Market in USD")
    sam_usd: Optional[float] = Field(None, description="Serviceable Addressable Market in USD")
    som_usd: Optional[float] = Field(None, description="Serviceable Obtainable Market in USD")
    year: int
    assumptions: List[Assumption] = Field(default_factory=list)
    methodology: str = Field(..., description="Description of how TAM was calculated")
    confidence: str = Field("medium", description="low / medium / high")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TrendDirection(str, Enum):
    """Trend direction indicator."""

    UP = "up"
    DOWN = "down"
    FLAT = "flat"


class MarketTrend(BaseModel):
    """A market trend observation with citation."""

    id: str
    title: str
    description: str
    segment: Optional[MarketSegment] = None
    solution_area: Optional[SolutionArea] = None
    direction: TrendDirection
    magnitude: Optional[str] = None  # e.g., "14% CAGR", "moderate growth"
    source: str
    source_url: Optional[str] = None
    as_of_date: Optional[datetime] = None
    implications: Optional[str] = None  # What this means for Comcast Business


class MarketModel(BaseModel):
    """Aggregate market model containing TAM estimates and trends."""

    id: str
    name: str
    description: str
    tam_estimates: List[TAMEstimate] = Field(default_factory=list)
    trends: List[MarketTrend] = Field(default_factory=list)
    global_assumptions: List[Assumption] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"

    def get_tam_by_segment(self, segment: MarketSegment) -> List[TAMEstimate]:
        """Filter TAM estimates by segment."""
        return [t for t in self.tam_estimates if t.segment == segment]

    def get_tam_by_solution(self, solution_area: SolutionArea) -> List[TAMEstimate]:
        """Filter TAM estimates by solution area."""
        return [t for t in self.tam_estimates if t.solution_area == solution_area]

    def get_trends_for_segment(self, segment: MarketSegment) -> List[MarketTrend]:
        """Filter trends by segment."""
        return [t for t in self.trends if t.segment == segment or t.segment is None]

