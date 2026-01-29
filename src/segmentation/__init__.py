"""Segmentation engine: MRR-tier classification and scoring."""

from .mrr_tier import MRRTierClassifier
from .scoring import AccountScorer, ScoreResult
from .views import SegmentView, SegmentSummary

__all__ = [
    "MRRTierClassifier",
    "AccountScorer",
    "ScoreResult",
    "SegmentView",
    "SegmentSummary",
]

