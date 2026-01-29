"""Public market data provider (MVP: curated public estimates)."""

from datetime import datetime
from typing import List

from .models import (
    MarketSegment,
    SolutionArea,
    Assumption,
    TAMEstimate,
    MarketTrend,
    TrendDirection,
)


class PublicMarketDataProvider:
    """
    Provides market data from curated public sources.

    MVP implementation uses manually curated estimates from public reports.
    Designed to be extensible: add connectors for licensed sources (IDC, Gartner, etc.)
    without changing the interface.
    """

    def __init__(self):
        # These are illustrative estimates based on public data patterns
        # In production, these would be ingested from curated public reports
        self._global_assumptions = self._build_global_assumptions()

    def _build_global_assumptions(self) -> List[Assumption]:
        """Build global assumptions used across TAM calculations."""
        return [
            Assumption(
                id="us_enterprise_count",
                description="Total US enterprises with 100+ employees",
                value="~120,000",
                source="US Census Bureau, Statistics of US Businesses",
                source_url="https://www.census.gov/programs-surveys/susb.html",
                methodology="Firms with 100+ employees, NAICS codes for target industries",
            ),
            Assumption(
                id="enterprise_it_spend_pct",
                description="Average enterprise IT spend as % of revenue",
                value="3.5–5%",
                source="Gartner IT Spending Forecast (public summary)",
                methodology="Varies by industry; connectivity/network is subset",
            ),
            Assumption(
                id="connectivity_share_of_it",
                description="Connectivity/network share of total IT spend",
                value="15–20%",
                source="Industry estimates (public)",
                methodology="Includes WAN, Internet, voice, security networking",
            ),
            Assumption(
                id="sdwan_sase_growth_rate",
                description="SD-WAN/SASE market CAGR 2024–2028",
                value="18–22%",
                source="Multiple public analyst summaries",
                methodology="Blended from IDC, Gartner, Dell'Oro public previews",
            ),
        ]

    def get_global_assumptions(self) -> List[Assumption]:
        """Return global assumptions."""
        return self._global_assumptions

    def get_tam_estimates(self, year: int = 2025) -> List[TAMEstimate]:
        """
        Return TAM estimates by segment and solution area.

        MVP: illustrative figures based on public data patterns.
        """
        estimates: List[TAMEstimate] = []

        # Enterprise connectivity market (total)
        estimates.append(
            TAMEstimate(
                id=f"tam-ent-total-conn-{year}",
                segment=MarketSegment.ENTERPRISE_TOTAL,
                solution_area=SolutionArea.CONNECTIVITY_INTERNET,
                tam_usd=28_000_000_000,  # $28B US enterprise connectivity
                sam_usd=18_000_000_000,  # SAM: addressable by Comcast footprint
                som_usd=3_500_000_000,  # SOM: realistic capture
                year=year,
                assumptions=self._global_assumptions[:2],
                methodology="Top-down: US enterprise count × avg network spend; validated vs public market reports.",
                confidence="medium",
            )
        )

        # SD-WAN market
        estimates.append(
            TAMEstimate(
                id=f"tam-ent-total-sdwan-{year}",
                segment=MarketSegment.ENTERPRISE_TOTAL,
                solution_area=SolutionArea.SD_WAN,
                tam_usd=5_500_000_000,  # $5.5B US SD-WAN
                sam_usd=3_200_000_000,
                year=year,
                assumptions=[self._global_assumptions[3]],
                methodology="Bottoms-up: enterprise sites × SD-WAN adoption rate × avg contract value.",
                confidence="medium",
            )
        )

        # SASE / Security
        estimates.append(
            TAMEstimate(
                id=f"tam-ent-total-sase-{year}",
                segment=MarketSegment.ENTERPRISE_TOTAL,
                solution_area=SolutionArea.SASE_SECURITY,
                tam_usd=8_000_000_000,  # $8B US SASE
                sam_usd=4_500_000_000,
                year=year,
                assumptions=[self._global_assumptions[3]],
                methodology="SASE = SD-WAN + cloud security bundle; faster growth than pure SD-WAN.",
                confidence="medium",
            )
        )

        # Managed Services
        estimates.append(
            TAMEstimate(
                id=f"tam-ent-total-managed-{year}",
                segment=MarketSegment.ENTERPRISE_TOTAL,
                solution_area=SolutionArea.MANAGED_SERVICES,
                tam_usd=22_000_000_000,  # $22B managed network services
                sam_usd=8_000_000_000,
                year=year,
                assumptions=[],
                methodology="Managed network + managed security; enterprises outsourcing operations.",
                confidence="low",
            )
        )

        # By-tier estimates (illustrative split)
        tier_splits = {
            MarketSegment.TIER_E1: 0.10,  # $1.5k–$10k: 10% of enterprise TAM
            MarketSegment.TIER_E2: 0.20,  # $10k–$50k: 20%
            MarketSegment.TIER_E3: 0.25,  # $50k–$250k: 25%
            MarketSegment.TIER_E4: 0.25,  # $250k–$1M: 25%
            MarketSegment.TIER_E5: 0.20,  # $1M+: 20%
        }

        base_connectivity_tam = 28_000_000_000
        for segment, pct in tier_splits.items():
            estimates.append(
                TAMEstimate(
                    id=f"tam-{segment.value}-conn-{year}",
                    segment=segment,
                    solution_area=SolutionArea.CONNECTIVITY_INTERNET,
                    tam_usd=base_connectivity_tam * pct,
                    year=year,
                    assumptions=[],
                    methodology=f"Segment split assumption: {segment.value} = {pct*100:.0f}% of enterprise connectivity TAM.",
                    confidence="low",
                )
            )

        return estimates

    def get_market_trends(self) -> List[MarketTrend]:
        """Return curated market trends."""
        return [
            MarketTrend(
                id="trend-sdwan-adoption",
                title="SD-WAN adoption accelerating in mid-market and enterprise",
                description="Enterprises replacing legacy MPLS with SD-WAN for cost savings and agility. Multi-cloud and hybrid work driving demand.",
                solution_area=SolutionArea.SD_WAN,
                direction=TrendDirection.UP,
                magnitude="18–22% CAGR through 2028",
                source="Public analyst summaries (IDC, Gartner)",
                implications="Opportunity to bundle connectivity + SD-WAN + SASE for higher attach and stickier relationships.",
            ),
            MarketTrend(
                id="trend-sase-convergence",
                title="SASE convergence: SD-WAN + cloud security as single service",
                description="Buyers increasingly want integrated network + security from one provider. Pure-play SD-WAN vendors partnering or being acquired.",
                solution_area=SolutionArea.SASE_SECURITY,
                direction=TrendDirection.UP,
                magnitude="25%+ CAGR",
                source="Public analyst summaries",
                implications="Position Comcast Business as integrated provider; avoid being commoditized on connectivity alone.",
            ),
            MarketTrend(
                id="trend-managed-services-growth",
                title="Enterprises outsourcing network operations",
                description="IT talent shortage and complexity driving demand for managed network and managed security services.",
                solution_area=SolutionArea.MANAGED_SERVICES,
                direction=TrendDirection.UP,
                magnitude="10–12% CAGR",
                source="Public market reports",
                implications="Wrap connectivity with managed services for higher margins and retention.",
            ),
            MarketTrend(
                id="trend-fiber-upgrade-cycle",
                title="Fiber upgrade cycle in enterprise",
                description="Bandwidth demands (cloud, video, IoT) driving fiber/Ethernet upgrades from legacy copper and T1/DS3.",
                solution_area=SolutionArea.ETHERNET_TRANSPORT,
                direction=TrendDirection.UP,
                magnitude="Moderate growth",
                source="FCC, public carrier reports",
                implications="Leverage on-net footprint to capture upgrade spend before competitors.",
            ),
            MarketTrend(
                id="trend-ai-ops-automation",
                title="AI-driven network operations and support",
                description="Carriers adopting AI for NOC automation, predictive maintenance, and customer support. Early movers gaining efficiency.",
                direction=TrendDirection.UP,
                magnitude="Emerging",
                source="Industry press, vendor announcements",
                implications="AI-enabled operating model can reduce cost-to-serve and improve customer experience—differentiator vs legacy carriers.",
            ),
        ]

