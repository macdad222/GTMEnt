"""Playbook data models with versioning and approval workflow."""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from src.knowledge_base.models import Citation
from src.market_intel.models import Assumption


class ApprovalStatus(str, Enum):
    """Playbook approval status."""

    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class PlaybookSection(BaseModel):
    """
    A section within a playbook.

    Each section has structured content with citations and assumptions.
    """

    id: str
    title: str
    section_type: str  # e.g., "executive_summary", "icp", "plays", "kpis"
    order: int = 0

    # Content
    narrative: str = ""  # Main text content
    key_points: List[str] = Field(default_factory=list)  # Bullet points
    exhibits: List[Dict[str, Any]] = Field(default_factory=list)  # Charts/tables data

    # Evidence
    citations: List[Citation] = Field(default_factory=list)
    assumptions: List[Assumption] = Field(default_factory=list)

    # LLM assistance metadata
    llm_generated: bool = False
    llm_model: Optional[str] = None
    llm_prompt_id: Optional[str] = None
    human_edited: bool = False

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Playbook(BaseModel):
    """
    A complete playbook for a segment or topic.

    BCG/Altman-style consulting deck structure with:
    - Structured sections
    - Evidence panels (citations + assumptions)
    - Export to PPT/PDF
    """

    id: str
    name: str
    description: str
    playbook_type: str  # e.g., "segment_playbook", "enterprise_strategy", "gtm_motion"

    # Targeting
    segment: Optional[str] = None  # e.g., "tier_e3"
    solution_area: Optional[str] = None

    # Content
    sections: List[PlaybookSection] = Field(default_factory=list)

    # Metadata
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    status: ApprovalStatus = ApprovalStatus.DRAFT

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = None

    def get_section(self, section_type: str) -> Optional[PlaybookSection]:
        """Get a section by type."""
        for section in self.sections:
            if section.section_type == section_type:
                return section
        return None

    def get_all_citations(self) -> List[Citation]:
        """Get all citations across sections."""
        citations = []
        for section in self.sections:
            citations.extend(section.citations)
        return citations

    def get_all_assumptions(self) -> List[Assumption]:
        """Get all assumptions across sections."""
        assumptions = []
        for section in self.sections:
            assumptions.extend(section.assumptions)
        return assumptions


class PlaybookVersion(BaseModel):
    """A versioned snapshot of a playbook."""

    id: str
    playbook_id: str
    version: str  # e.g., "1.0.0", "1.1.0"
    playbook_snapshot: Playbook

    # Change tracking
    change_summary: str = ""
    changed_sections: List[str] = Field(default_factory=list)

    # Approval
    status: ApprovalStatus = ApprovalStatus.DRAFT
    reviewer_id: Optional[str] = None
    reviewer_name: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by_id: Optional[str] = None
    created_by_name: Optional[str] = None


class PlaybookApprovalRequest(BaseModel):
    """Request to approve/reject a playbook version."""

    version_id: str
    action: str  # "approve" or "reject"
    reviewer_id: str
    reviewer_name: str
    notes: Optional[str] = None
    requested_at: datetime = Field(default_factory=datetime.utcnow)

