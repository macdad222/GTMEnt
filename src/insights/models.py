"""Models for Questions and Insights."""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class InsightStatus(str, Enum):
    """Status of an insight question."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    INCORPORATED = "incorporated"  # User has marked this for use in other analyses


class InsightCategory(str, Enum):
    """Categories for organizing insights."""
    MARKET_STRATEGY = "market_strategy"
    COMPETITIVE = "competitive"
    PRODUCT = "product"
    SALES = "sales"
    CUSTOMER_SEGMENT = "customer_segment"
    MSA_GEOGRAPHY = "msa_geography"
    PRICING = "pricing"
    GROWTH = "growth"
    OPERATIONS = "operations"
    GENERAL = "general"


class DataSourceUsed(BaseModel):
    """Record of a data source used in generating the insight."""
    source_type: str  # e.g., "cb_config", "competitive_intel", "market_research", "segment_intel"
    source_name: str  # Human-readable name
    data_timestamp: Optional[str] = None


class InsightQuestion(BaseModel):
    """A strategic question asked by the user with LLM-generated insight."""
    id: str = Field(default_factory=lambda: f"insight-{datetime.now().strftime('%Y%m%d%H%M%S%f')}")
    
    # Question details
    question: str
    category: InsightCategory = InsightCategory.GENERAL
    
    # Response details
    response: Optional[str] = None
    executive_summary: Optional[str] = None  # Brief 2-3 sentence summary
    key_recommendations: List[str] = Field(default_factory=list)
    
    # Metadata
    status: InsightStatus = InsightStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    processing_time_seconds: Optional[float] = None
    
    # Data context
    data_sources_used: List[DataSourceUsed] = Field(default_factory=list)
    
    # User actions
    is_incorporated: bool = False  # If True, this insight is used in other LLM analyses
    incorporation_note: Optional[str] = None  # User's note on how to use this insight
    is_starred: bool = False  # User marked as important
    
    # LLM metadata
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    tokens_used: Optional[int] = None
    
    # Error handling
    error_message: Optional[str] = None


class InsightQuestionCreate(BaseModel):
    """Request to create a new insight question."""
    question: str
    category: Optional[InsightCategory] = InsightCategory.GENERAL


class InsightQuestionUpdate(BaseModel):
    """Request to update an insight (incorporate, star, etc.)."""
    is_incorporated: Optional[bool] = None
    incorporation_note: Optional[str] = None
    is_starred: Optional[bool] = None
    category: Optional[InsightCategory] = None


class InsightsStore(BaseModel):
    """Persistent store for all insights."""
    insights: List[InsightQuestion] = Field(default_factory=list)
    last_updated: datetime = Field(default_factory=datetime.now)

