"""Account scoring: growth potential, churn risk, attach propensity."""

from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime

from src.data_model.models import Account, ProductCategory


class ScoreType(str, Enum):
    """Types of account scores."""

    GROWTH_POTENTIAL = "growth_potential"
    CHURN_RISK = "churn_risk"
    ATTACH_PROPENSITY = "attach_propensity"
    OVERALL_PRIORITY = "overall_priority"


class ScoreResult(BaseModel):
    """A scored value for an account."""

    account_id: str
    score_type: ScoreType
    score: float = Field(..., ge=0.0, le=1.0, description="Normalized score 0–1")
    percentile: Optional[float] = None  # Percentile rank within segment
    factors: List[str] = Field(default_factory=list, description="Contributing factors")
    calculated_at: datetime = Field(default_factory=datetime.utcnow)


class AccountScorer:
    """
    Score accounts on growth potential, churn risk, and attach propensity.

    These are AI-assisted, non-deterministic scores that:
    - Use heuristics in MVP (rule-based signals)
    - Can be enhanced with ML models later
    - Include human accountability (scores inform, don't decide)
    """

    def __init__(self):
        pass

    def score_growth_potential(
        self,
        account: Account,
        has_sdwan: bool = False,
        has_sase: bool = False,
        bandwidth_utilization_pct: Optional[float] = None,
        site_count: int = 1,
    ) -> ScoreResult:
        """
        Score growth potential (expansion/upsell opportunity).

        Signals:
        - Headroom: current MRR vs tier ceiling
        - Attach gaps: missing SD-WAN, SASE
        - Usage signals: high bandwidth utilization
        - Footprint: multi-site potential
        """
        score = 0.0
        factors: List[str] = []

        # Headroom within tier
        tier_ceilings = {
            "tier_e1": 10000,
            "tier_e2": 50000,
            "tier_e3": 250000,
            "tier_e4": 1000000,
            "tier_e5": 5000000,  # Soft ceiling for scoring
        }
        ceiling = tier_ceilings.get(account.mrr_tier.value, 10000)
        headroom_pct = 1 - (account.mrr_usd / ceiling) if ceiling > 0 else 0
        if headroom_pct > 0.5:
            score += 0.2
            factors.append(f"high_headroom_{headroom_pct:.0%}")
        elif headroom_pct > 0.2:
            score += 0.1
            factors.append(f"moderate_headroom_{headroom_pct:.0%}")

        # Attach gaps (Connectivity → SD-WAN → SASE)
        if not has_sdwan:
            score += 0.25
            factors.append("sdwan_attach_opportunity")
        if has_sdwan and not has_sase:
            score += 0.20
            factors.append("sase_attach_opportunity")

        # Bandwidth utilization (high = expansion signal)
        if bandwidth_utilization_pct is not None:
            if bandwidth_utilization_pct > 0.80:
                score += 0.15
                factors.append(f"high_bandwidth_util_{bandwidth_utilization_pct:.0%}")
            elif bandwidth_utilization_pct > 0.60:
                score += 0.08
                factors.append(f"moderate_bandwidth_util_{bandwidth_utilization_pct:.0%}")

        # Multi-site (more sites = more expansion potential)
        if site_count >= 10:
            score += 0.15
            factors.append(f"large_footprint_{site_count}_sites")
        elif site_count >= 3:
            score += 0.08
            factors.append(f"multi_site_{site_count}_sites")

        # Normalize
        score = min(score, 1.0)

        return ScoreResult(
            account_id=account.id,
            score_type=ScoreType.GROWTH_POTENTIAL,
            score=score,
            factors=factors,
        )

    def score_churn_risk(
        self,
        account: Account,
        months_since_last_expansion: Optional[int] = None,
        recent_sev1_incidents: int = 0,
        nps_score: Optional[float] = None,
        contract_months_remaining: Optional[int] = None,
    ) -> ScoreResult:
        """
        Score churn risk.

        Signals:
        - Tenure without expansion (stagnant)
        - Incident frequency
        - NPS / satisfaction
        - Contract expiration proximity
        """
        score = 0.0
        factors: List[str] = []

        # Stagnant (no expansion in 12+ months)
        if months_since_last_expansion is not None:
            if months_since_last_expansion > 18:
                score += 0.25
                factors.append(f"stagnant_{months_since_last_expansion}mo_no_expansion")
            elif months_since_last_expansion > 12:
                score += 0.15
                factors.append(f"declining_engagement_{months_since_last_expansion}mo")

        # Incidents
        if recent_sev1_incidents >= 3:
            score += 0.30
            factors.append(f"high_incidents_{recent_sev1_incidents}_sev1")
        elif recent_sev1_incidents >= 1:
            score += 0.15
            factors.append(f"recent_incident_{recent_sev1_incidents}_sev1")

        # NPS
        if nps_score is not None:
            if nps_score < 0:
                score += 0.25
                factors.append(f"detractor_nps_{nps_score:.0f}")
            elif nps_score < 30:
                score += 0.10
                factors.append(f"passive_nps_{nps_score:.0f}")

        # Contract expiration
        if contract_months_remaining is not None:
            if contract_months_remaining <= 3:
                score += 0.20
                factors.append(f"expiring_soon_{contract_months_remaining}mo")
            elif contract_months_remaining <= 6:
                score += 0.10
                factors.append(f"upcoming_renewal_{contract_months_remaining}mo")

        # Normalize
        score = min(score, 1.0)

        return ScoreResult(
            account_id=account.id,
            score_type=ScoreType.CHURN_RISK,
            score=score,
            factors=factors,
        )

    def score_attach_propensity(
        self,
        account: Account,
        current_products: List[ProductCategory],
    ) -> ScoreResult:
        """
        Score propensity to attach additional products.

        Focus: Connectivity → SD-WAN → SASE bundle path.
        """
        score = 0.0
        factors: List[str] = []

        has_connectivity = ProductCategory.CONNECTIVITY_INTERNET in current_products
        has_sdwan = ProductCategory.SD_WAN in current_products
        has_sase = ProductCategory.SASE_SECURITY in current_products
        has_managed = ProductCategory.MANAGED_SERVICES in current_products

        # Primary attach path: Connectivity → SD-WAN → SASE
        if has_connectivity and not has_sdwan:
            score += 0.35
            factors.append("sdwan_next_in_journey")

        if has_sdwan and not has_sase:
            score += 0.35
            factors.append("sase_next_in_journey")

        if has_connectivity and not has_managed:
            score += 0.15
            factors.append("managed_services_opportunity")

        # Already bundled = lower propensity (already attached)
        if has_connectivity and has_sdwan and has_sase:
            score = 0.1  # Low score, already well-attached
            factors = ["fully_bundled"]

        # Enterprise tier bonus (higher tiers more likely to buy bundles)
        if account.mrr_tier.value in ("tier_e3", "tier_e4", "tier_e5"):
            score += 0.10
            factors.append("enterprise_buyer_profile")

        # Normalize
        score = min(score, 1.0)

        return ScoreResult(
            account_id=account.id,
            score_type=ScoreType.ATTACH_PROPENSITY,
            score=score,
            factors=factors,
        )

    def score_overall_priority(
        self,
        growth_score: ScoreResult,
        churn_score: ScoreResult,
        attach_score: ScoreResult,
    ) -> ScoreResult:
        """
        Calculate overall priority score.

        Weights:
        - Growth potential: 40%
        - Attach propensity: 35%
        - Inverse churn risk: 25% (low churn = higher priority)
        """
        growth_weight = 0.40
        attach_weight = 0.35
        churn_weight = 0.25  # Inverse

        score = (
            growth_score.score * growth_weight
            + attach_score.score * attach_weight
            + (1 - churn_score.score) * churn_weight
        )

        factors = [
            f"growth_{growth_score.score:.2f}",
            f"attach_{attach_score.score:.2f}",
            f"churn_risk_{churn_score.score:.2f}",
        ]

        return ScoreResult(
            account_id=growth_score.account_id,
            score_type=ScoreType.OVERALL_PRIORITY,
            score=score,
            factors=factors,
        )

