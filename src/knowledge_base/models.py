"""Data models for the knowledge base (sources, chunks, citations)."""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class SourceType(str, Enum):
    """Enumeration of approved public source types."""

    SEC_FILING = "sec_filing"
    COMCAST_BUSINESS_SITE = "comcast_business_site"
    PUBLIC_MARKET_REPORT = "public_market_report"
    GOVERNMENT_DATA = "government_data"  # FCC, BLS, Census, etc.


class Source(BaseModel):
    """A curated public source with provenance metadata."""

    id: str = Field(..., description="Unique identifier for the source")
    source_type: SourceType
    title: str
    url: str
    retrieved_at: datetime = Field(default_factory=datetime.utcnow)
    filing_date: Optional[datetime] = None  # For SEC filings
    fiscal_year: Optional[int] = None
    description: Optional[str] = None

    # Licensing / permissions
    is_public: bool = True
    license_required: bool = False


class SourceChunk(BaseModel):
    """A chunk of text from a source, ready for embedding and retrieval."""

    id: str
    source_id: str
    chunk_index: int
    content: str
    section: Optional[str] = None  # e.g., "Item 1 - Business", "Ethernet Network Services"
    metadata: dict = Field(default_factory=dict)


class Citation(BaseModel):
    """A citation to a source chunk, used in playbook / report outputs."""

    source_id: str
    source_title: str
    source_url: str
    chunk_id: Optional[str] = None
    section: Optional[str] = None
    retrieved_at: datetime
    excerpt: Optional[str] = None  # Short excerpt from the chunk

    def to_footnote(self) -> str:
        """Format as a footnote string for slide decks / PDFs."""
        date_str = self.retrieved_at.strftime("%Y-%m-%d")
        section_part = f", {self.section}" if self.section else ""
        return f"{self.source_title}{section_part}. Retrieved {date_str}. {self.source_url}"

