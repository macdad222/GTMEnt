"""Data models for experiment tracking and lift measurement."""

from datetime import datetime, date
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ExperimentStatus(str, Enum):
    """Experiment lifecycle status."""

    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MetricType(str, Enum):
    """Type of metric being measured."""

    CONVERSION = "conversion"  # Rate-based (e.g., win rate)
    CONTINUOUS = "continuous"  # Value-based (e.g., ARR)
    COUNT = "count"  # Count-based (e.g., deals closed)
    DURATION = "duration"  # Time-based (e.g., cycle days)


class ExperimentVariant(BaseModel):
    """A variant (treatment or control) in an experiment."""

    id: str
    name: str
    description: str
    is_control: bool = False

    # Assignment
    target_allocation_pct: float = 0.5  # Target % of population
    actual_allocation_pct: Optional[float] = None

    # Playbook reference (if applicable)
    playbook_id: Optional[str] = None
    playbook_version: Optional[str] = None


class Experiment(BaseModel):
    """
    An A/B experiment comparing playbook variants.

    Used to measure lift from different plays, messaging, or motions.
    """

    id: str
    name: str
    description: str
    hypothesis: str  # What we expect to see

    # Targeting
    segment: Optional[str] = None  # MRR tier
    solution_area: Optional[str] = None

    # Variants
    variants: List[ExperimentVariant] = Field(default_factory=list)

    # Metrics
    primary_metric: str  # KPI ID (e.g., "win_rate", "sdwan_attach_rate")
    secondary_metrics: List[str] = Field(default_factory=list)

    # Timeline
    status: ExperimentStatus = ExperimentStatus.DRAFT
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    min_sample_size: int = 100  # Per variant

    # Metadata
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class MetricObservation(BaseModel):
    """A single metric observation for an experiment variant."""

    id: str
    experiment_id: str
    variant_id: str
    metric_id: str

    # Value
    metric_type: MetricType
    value: float
    count: int = 1  # Number of observations aggregated

    # Context
    account_id: Optional[str] = None
    opportunity_id: Optional[str] = None

    observed_at: datetime = Field(default_factory=datetime.utcnow)


class LiftResult(BaseModel):
    """Result of a lift analysis comparing variants."""

    experiment_id: str
    metric_id: str

    # Control
    control_variant_id: str
    control_value: float
    control_sample_size: int

    # Treatment
    treatment_variant_id: str
    treatment_value: float
    treatment_sample_size: int

    # Lift calculation
    absolute_lift: float  # Treatment - Control
    relative_lift_pct: float  # (Treatment - Control) / Control * 100
    confidence_level: float  # 0-1

    # Statistical significance
    is_significant: bool
    p_value: Optional[float] = None

    # Interpretation
    recommendation: str  # "adopt", "reject", "continue_testing"
    notes: Optional[str] = None

    calculated_at: datetime = Field(default_factory=datetime.utcnow)


class GrowthContribution(BaseModel):
    """Attribution of growth to specific plays/experiments."""

    period_start: date
    period_end: date

    # Baseline
    baseline_arr: float
    target_growth_pct: float  # 15%
    target_arr: float

    # Actual
    actual_arr: float
    actual_growth_pct: float

    # Attribution
    new_logo_contribution: float
    expansion_contribution: float
    churn_reduction_contribution: float

    # By experiment
    experiment_contributions: List[Dict[str, Any]] = Field(default_factory=list)

    calculated_at: datetime = Field(default_factory=datetime.utcnow)

