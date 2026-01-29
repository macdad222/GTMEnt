"""TAM calculator that combines public + internal data for sizing."""

from typing import List, Optional
from datetime import datetime

from .models import (
    MarketSegment,
    SolutionArea,
    TAMEstimate,
    MarketTrend,
    MarketModel,
    Assumption,
)
from .public_sources import PublicMarketDataProvider


class TAMCalculator:
    """
    Calculate and maintain TAM/SAM/SOM estimates.

    Combines:
    - Public market data (from PublicMarketDataProvider)
    - Internal data signals (when available) for SAM/SOM refinement
    - Explicit assumptions with full provenance

    Designed to be extensible for licensed data sources.
    """

    def __init__(self, public_provider: Optional[PublicMarketDataProvider] = None):
        self.public_provider = public_provider or PublicMarketDataProvider()

    def build_market_model(
        self,
        name: str = "Comcast Business Enterprise Market Model",
        year: int = 2025,
    ) -> MarketModel:
        """
        Build a complete market model with TAM estimates and trends.

        Returns a MarketModel object ready for playbook generation.
        """
        tam_estimates = self.public_provider.get_tam_estimates(year=year)
        trends = self.public_provider.get_market_trends()
        global_assumptions = self.public_provider.get_global_assumptions()

        return MarketModel(
            id=f"market-model-{year}-{datetime.utcnow().strftime('%Y%m%d')}",
            name=name,
            description=(
                f"Enterprise market model for {year}. "
                "Includes TAM/SAM/SOM by segment and solution area, "
                "market trends, and explicit assumptions. "
                "Public sources only (MVP); extensible for licensed data."
            ),
            tam_estimates=tam_estimates,
            trends=trends,
            global_assumptions=global_assumptions,
            version="1.0.0",
        )

    def refine_sam_with_internal_data(
        self,
        tam_estimate: TAMEstimate,
        footprint_coverage_pct: float,
        target_industry_pct: float,
    ) -> TAMEstimate:
        """
        Refine SAM using internal data signals (footprint, industry focus).

        Args:
            tam_estimate: Base TAM estimate from public sources
            footprint_coverage_pct: % of TAM addressable by Comcast on-net/near-net footprint
            target_industry_pct: % of TAM in target industries

        Returns:
            Updated TAMEstimate with refined SAM
        """
        refined_sam = tam_estimate.tam_usd * footprint_coverage_pct * target_industry_pct

        # Add assumptions
        new_assumptions = tam_estimate.assumptions + [
            Assumption(
                id=f"footprint-coverage-{tam_estimate.id}",
                description="Comcast footprint coverage of TAM",
                value=f"{footprint_coverage_pct * 100:.0f}%",
                source="Internal: Comcast on-net/near-net analysis",
                methodology="Buildings/sites within serviceable footprint ÷ total enterprise sites",
            ),
            Assumption(
                id=f"target-industry-{tam_estimate.id}",
                description="Target industry concentration",
                value=f"{target_industry_pct * 100:.0f}%",
                source="Internal: industry prioritization",
                methodology="Focus industries (healthcare, retail, finance, etc.) as % of TAM",
            ),
        ]

        return TAMEstimate(
            id=tam_estimate.id + "-refined",
            segment=tam_estimate.segment,
            solution_area=tam_estimate.solution_area,
            tam_usd=tam_estimate.tam_usd,
            sam_usd=refined_sam,
            som_usd=tam_estimate.som_usd,
            year=tam_estimate.year,
            assumptions=new_assumptions,
            methodology=tam_estimate.methodology + " SAM refined with internal footprint and industry data.",
            confidence="medium",
        )

    def project_growth(
        self,
        tam_estimate: TAMEstimate,
        cagr: float,
        years: int = 5,
    ) -> List[TAMEstimate]:
        """
        Project TAM forward using a CAGR.

        Args:
            tam_estimate: Base TAM estimate
            cagr: Compound annual growth rate (e.g., 0.15 for 15%)
            years: Number of years to project

        Returns:
            List of TAMEstimate objects for each projected year
        """
        projections: List[TAMEstimate] = [tam_estimate]

        for i in range(1, years + 1):
            projected_year = tam_estimate.year + i
            growth_factor = (1 + cagr) ** i

            projected = TAMEstimate(
                id=f"{tam_estimate.id}-proj-{projected_year}",
                segment=tam_estimate.segment,
                solution_area=tam_estimate.solution_area,
                tam_usd=tam_estimate.tam_usd * growth_factor,
                sam_usd=tam_estimate.sam_usd * growth_factor if tam_estimate.sam_usd else None,
                som_usd=tam_estimate.som_usd * growth_factor if tam_estimate.som_usd else None,
                year=projected_year,
                assumptions=tam_estimate.assumptions
                + [
                    Assumption(
                        id=f"cagr-{tam_estimate.id}-{projected_year}",
                        description="CAGR assumption for projection",
                        value=f"{cagr * 100:.1f}%",
                        source="Internal planning assumption",
                        methodology=f"Applied {cagr*100:.1f}% CAGR for {i} year(s) from base year {tam_estimate.year}",
                    )
                ],
                methodology=f"Projected from {tam_estimate.year} using {cagr*100:.1f}% CAGR.",
                confidence="low",
            )
            projections.append(projected)

        return projections

    def summarize_for_deck(self, model: MarketModel) -> dict:
        """
        Summarize market model for slide deck exhibit generation.

        Returns a dict suitable for templating into slides.
        """
        total_tam = sum(
            t.tam_usd
            for t in model.tam_estimates
            if t.segment == MarketSegment.ENTERPRISE_TOTAL
        )

        by_solution = {}
        for solution in SolutionArea:
            estimates = model.get_tam_by_solution(solution)
            if estimates:
                by_solution[solution.value] = {
                    "tam_usd": sum(e.tam_usd for e in estimates if e.segment == MarketSegment.ENTERPRISE_TOTAL),
                    "estimates": len(estimates),
                }

        by_segment = {}
        for segment in MarketSegment:
            if segment == MarketSegment.ENTERPRISE_TOTAL:
                continue
            estimates = model.get_tam_by_segment(segment)
            if estimates:
                by_segment[segment.value] = {
                    "tam_usd": sum(e.tam_usd for e in estimates),
                    "estimates": len(estimates),
                }

        return {
            "model_name": model.name,
            "version": model.version,
            "total_enterprise_tam_usd": total_tam,
            "by_solution": by_solution,
            "by_segment": by_segment,
            "trend_count": len(model.trends),
            "assumption_count": len(model.global_assumptions),
            "key_trends": [
                {"title": t.title, "direction": t.direction.value, "magnitude": t.magnitude}
                for t in model.trends[:5]
            ],
        }

