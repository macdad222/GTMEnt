"""MRR-tier classification logic."""

from typing import List, Optional
from pydantic import BaseModel, Field

from src.data_model.models import Account, MRRTier


class TierBoundary(BaseModel):
    """Definition of an MRR tier boundary."""

    tier: MRRTier
    min_mrr: float
    max_mrr: Optional[float] = None  # None = no upper bound
    label: str
    description: str


class MRRTierClassifier:
    """
    Classifies accounts into MRR tiers.

    Enterprise defined as MRR >= $1,500/month.
    Tiers are configurable but default to plan-specified boundaries.
    """

    # Default tier boundaries (aligned with plan)
    DEFAULT_BOUNDARIES: List[TierBoundary] = [
        TierBoundary(
            tier=MRRTier.TIER_E1,
            min_mrr=1500,
            max_mrr=10000,
            label="E1: $1.5k–$10k",
            description="Entry enterprise: small multi-site or single large site",
        ),
        TierBoundary(
            tier=MRRTier.TIER_E2,
            min_mrr=10000,
            max_mrr=50000,
            label="E2: $10k–$50k",
            description="Mid-market enterprise: regional multi-site",
        ),
        TierBoundary(
            tier=MRRTier.TIER_E3,
            min_mrr=50000,
            max_mrr=250000,
            label="E3: $50k–$250k",
            description="Upper mid-market: national presence",
        ),
        TierBoundary(
            tier=MRRTier.TIER_E4,
            min_mrr=250000,
            max_mrr=1000000,
            label="E4: $250k–$1M",
            description="Large enterprise: significant national/global footprint",
        ),
        TierBoundary(
            tier=MRRTier.TIER_E5,
            min_mrr=1000000,
            max_mrr=None,
            label="E5: $1M+",
            description="Strategic enterprise: Fortune 500 / major accounts",
        ),
    ]

    ENTERPRISE_THRESHOLD = 1500.0  # $1,500/month

    def __init__(self, boundaries: Optional[List[TierBoundary]] = None):
        self.boundaries = boundaries or self.DEFAULT_BOUNDARIES
        # Sort by min_mrr ascending
        self.boundaries = sorted(self.boundaries, key=lambda b: b.min_mrr)

    def classify(self, mrr_usd: float) -> MRRTier:
        """
        Classify an MRR value into a tier.

        Args:
            mrr_usd: Monthly recurring revenue in USD

        Returns:
            The MRRTier for the given MRR
        """
        if mrr_usd < self.ENTERPRISE_THRESHOLD:
            return MRRTier.NON_ENTERPRISE

        for boundary in self.boundaries:
            if boundary.max_mrr is None:
                # Top tier (no upper bound)
                if mrr_usd >= boundary.min_mrr:
                    return boundary.tier
            else:
                if boundary.min_mrr <= mrr_usd < boundary.max_mrr:
                    return boundary.tier

        # Fallback (shouldn't happen with proper boundaries)
        return MRRTier.TIER_E1

    def classify_account(self, account: Account) -> Account:
        """
        Update an account's MRR tier classification.

        Returns a new Account with updated tier and is_enterprise flag.
        """
        tier = self.classify(account.mrr_usd)
        return account.model_copy(
            update={
                "mrr_tier": tier,
                "is_enterprise": tier != MRRTier.NON_ENTERPRISE,
            }
        )

    def get_tier_info(self, tier: MRRTier) -> Optional[TierBoundary]:
        """Get the boundary definition for a tier."""
        for boundary in self.boundaries:
            if boundary.tier == tier:
                return boundary
        return None

    def get_enterprise_accounts(self, accounts: List[Account]) -> List[Account]:
        """Filter to enterprise accounts only."""
        return [a for a in accounts if a.mrr_usd >= self.ENTERPRISE_THRESHOLD]

    def segment_accounts(self, accounts: List[Account]) -> dict[MRRTier, List[Account]]:
        """Group accounts by MRR tier."""
        result: dict[MRRTier, List[Account]] = {tier.tier: [] for tier in self.boundaries}
        result[MRRTier.NON_ENTERPRISE] = []

        for account in accounts:
            tier = self.classify(account.mrr_usd)
            result[tier].append(account)

        return result

