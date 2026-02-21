"""Job models for tracking async operations."""

from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import uuid


class JobStatus(str, Enum):
    """Status of a job."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobType(str, Enum):
    """Type of job."""
    DATA_IMPORT = "data_import"           # Fetching from external data source
    DATA_SUMMARY = "data_summary"         # LLM summarization of data
    SEGMENT_PLAYBOOK = "segment_playbook" # Generating segment playbook
    MSA_PLAYBOOK = "msa_playbook"         # Generating MSA-specific playbook
    STRATEGY_DECK = "strategy_deck"       # Generating enterprise strategy deck
    BATCH_IMPORT = "batch_import"         # Importing multiple sources
    
    # LLM Analysis Jobs (async)
    STRATEGY_REPORT = "strategy_report"   # Comprehensive strategy report
    COMPETITIVE_ANALYSIS = "competitive_analysis"  # Competitive intel analysis
    QA_INSIGHT = "qa_insight"             # Q&A insight generation
    SEGMENT_INTEL = "segment_intel"       # Segment market intelligence
    MSA_INTEL = "msa_intel"               # MSA market intelligence
    PRODUCT_ROADMAP = "product_roadmap"   # Product roadmap analysis
    COMPETITIVE_SCRAPE = "competitive_scrape"  # Competitor website scraping


class Job(BaseModel):
    """A trackable job in the system."""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_type: JobType
    status: JobStatus = JobStatus.PENDING
    
    # What this job is processing
    target_id: Optional[str] = None       # e.g., source_id, segment_id, msa_code
    target_name: Optional[str] = None     # Human-readable name
    
    # Progress tracking
    progress_pct: int = 0                 # 0-100
    progress_message: Optional[str] = None
    
    # Timing
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Results
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    
    # Relationships
    parent_job_id: Optional[str] = None   # For batch jobs
    child_job_ids: List[str] = Field(default_factory=list)
    
    def start(self):
        """Mark job as started."""
        self.status = JobStatus.IN_PROGRESS
        self.started_at = datetime.utcnow()
        self.progress_pct = 0
        
    def update_progress(self, pct: int, message: Optional[str] = None):
        """Update job progress."""
        self.progress_pct = min(100, max(0, pct))
        if message:
            self.progress_message = message
            
    def complete(self, result: Optional[Dict[str, Any]] = None):
        """Mark job as completed."""
        self.status = JobStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.progress_pct = 100
        self.result_data = result
        
    def fail(self, error: str):
        """Mark job as failed."""
        self.status = JobStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.error_message = error
        
    @property
    def duration_seconds(self) -> Optional[float]:
        """Get job duration in seconds."""
        if not self.started_at:
            return None
        end = self.completed_at or datetime.utcnow()
        return (end - self.started_at).total_seconds()
    
    @property
    def is_active(self) -> bool:
        """Check if job is still running."""
        return self.status in (JobStatus.PENDING, JobStatus.IN_PROGRESS)


class JobSummary(BaseModel):
    """Summary of job queue status."""
    
    total_jobs: int = 0
    pending: int = 0
    in_progress: int = 0
    completed: int = 0
    failed: int = 0
    
    # By type
    by_type: Dict[str, int] = Field(default_factory=dict)
    
    # Recent jobs
    recent_completed: List[Job] = Field(default_factory=list)
    active_jobs: List[Job] = Field(default_factory=list)

