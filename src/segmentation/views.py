"""Segment views and summary statistics."""

from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime

from src.data_model.models import Account, MRRTier
from .mrr_tier import MRRTierClassifier, TierBoundary
from .scoring import ScoreResult, ScoreType


class SegmentSummary(BaseModel):
    """Summary statistics for a segment."""

    tier: MRRTier
    tier_label: str
    account_count: int = 0
    total_mrr_usd: float = 0.0
    total_arr_usd: float = 0.0
    avg_mrr_usd: float = 0.0

    # Score distributions
    avg_growth_potential: Optional[float] = None
    avg_churn_risk: Optional[float] = None
    avg_attach_propensity: Optional[float] = None

    # Opportunity sizing
    high_priority_accounts: int = 0  # Accounts with priority score > 0.7
    expansion_opportunity_usd: Optional[float] = None  # Estimated from headroom

    calculated_at: datetime = Field(default_factory=datetime.utcnow)


class SegmentView(BaseModel):
    """A view of a segment with accounts and summary."""

    tier: MRRTier
    tier_info: Optional[TierBoundary] = None
    summary: SegmentSummary
    accounts: List[Account] = Field(default_factory=list)
    scores: Dict[str, List[ScoreResult]] = Field(default_factory=dict)  # account_id -> scores


class SegmentViewBuilder:
    """Builds segment views with summaries and scores."""

    def __init__(self, classifier: Optional[MRRTierClassifier] = None):
        self.classifier = classifier or MRRTierClassifier()

    def build_segment_view(
        self,
        tier: MRRTier,
        accounts: List[Account],
        scores: Optional[Dict[str, List[ScoreResult]]] = None,
    ) -> SegmentView:
        """Build a complete segment view."""
        tier_info = self.classifier.get_tier_info(tier)
        tier_label = tier_info.label if tier_info else tier.value

        # Calculate summary
        account_count = len(accounts)
        total_mrr = sum(a.mrr_usd for a in accounts)
        avg_mrr = total_mrr / account_count if account_count > 0 else 0

        summary = SegmentSummary(
            tier=tier,
            tier_label=tier_label,
            account_count=account_count,
            total_mrr_usd=total_mrr,
            total_arr_usd=total_mrr * 12,
            avg_mrr_usd=avg_mrr,
        )

        # Add score averages if provided
        if scores:
            growth_scores = []
            churn_scores = []
            attach_scores = []
            priority_scores = []

            for account_scores in scores.values():
                for s in account_scores:
                    if s.score_type == ScoreType.GROWTH_POTENTIAL:
                        growth_scores.append(s.score)
                    elif s.score_type == ScoreType.CHURN_RISK:
                        churn_scores.append(s.score)
                    elif s.score_type == ScoreType.ATTACH_PROPENSITY:
                        attach_scores.append(s.score)
                    elif s.score_type == ScoreType.OVERALL_PRIORITY:
                        priority_scores.append(s.score)

            if growth_scores:
                summary.avg_growth_potential = sum(growth_scores) / len(growth_scores)
            if churn_scores:
                summary.avg_churn_risk = sum(churn_scores) / len(churn_scores)
            if attach_scores:
                summary.avg_attach_propensity = sum(attach_scores) / len(attach_scores)
            if priority_scores:
                summary.high_priority_accounts = sum(1 for s in priority_scores if s > 0.7)

            # Estimate expansion opportunity (headroom * avg attach propensity)
            if tier_info and summary.avg_attach_propensity:
                headroom_per_account = (tier_info.max_mrr or tier_info.min_mrr * 2) - avg_mrr
                summary.expansion_opportunity_usd = (
                    headroom_per_account * account_count * summary.avg_attach_propensity * 12
                )

        return SegmentView(
            tier=tier,
            tier_info=tier_info,
            summary=summary,
            accounts=accounts,
            scores=scores or {},
        )

    def build_all_segments(
        self,
        accounts: List[Account],
        scores: Optional[Dict[str, List[ScoreResult]]] = None,
    ) -> List[SegmentView]:
        """Build views for all enterprise segments."""
        # Classify and segment accounts
        classified = [self.classifier.classify_account(a) for a in accounts]
        segmented = self.classifier.segment_accounts(classified)

        views = []
        for tier in [MRRTier.TIER_E1, MRRTier.TIER_E2, MRRTier.TIER_E3, MRRTier.TIER_E4, MRRTier.TIER_E5]:
            tier_accounts = segmented.get(tier, [])
            tier_scores = {a.id: scores.get(a.id, []) for a in tier_accounts} if scores else None
            view = self.build_segment_view(tier, tier_accounts, tier_scores)
            views.append(view)

        return views

    def export_for_deck(self, views: List[SegmentView]) -> List[dict]:
        """Export segment views for slide deck generation."""
        return [
            {
                "tier": v.tier.value,
                "tier_label": v.summary.tier_label,
                "account_count": v.summary.account_count,
                "total_arr_usd": v.summary.total_arr_usd,
                "avg_mrr_usd": v.summary.avg_mrr_usd,
                "avg_growth_potential": v.summary.avg_growth_potential,
                "avg_churn_risk": v.summary.avg_churn_risk,
                "high_priority_accounts": v.summary.high_priority_accounts,
                "expansion_opportunity_usd": v.summary.expansion_opportunity_usd,
            }
            for v in views
        ]

