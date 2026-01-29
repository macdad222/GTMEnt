"""Market Intelligence module for TAM/SAM/SOM, trends, and market sizing."""

from .models import (
    MarketSegment,
    SolutionArea,
    TAMEstimate,
    MarketTrend,
    Assumption,
    MarketModel,
)
from .public_sources import PublicMarketDataProvider
from .tam_calculator import TAMCalculator

__all__ = [
    "MarketSegment",
    "SolutionArea",
    "TAMEstimate",
    "MarketTrend",
    "Assumption",
    "MarketModel",
    "PublicMarketDataProvider",
    "TAMCalculator",
]

