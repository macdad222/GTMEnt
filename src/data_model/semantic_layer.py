"""KPI semantic layer: standardized metric definitions and calculations."""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Callable, Any
from pydantic import BaseModel, Field


class KPICategory(str, Enum):
    """Categories of KPIs aligned with the measurement model."""

    GROWTH = "growth"  # New logo, expansion
    RETENTION = "retention"  # Churn, NRR, GRR
    EFFICIENCY = "efficiency"  # Cycle time, quote-to-cash, CAC
    ATTACH = "attach"  # Product attach rates
    CUSTOMER_HEALTH = "customer_health"  # Usage, incidents, adoption
    PIPELINE = "pipeline"  # Coverage, velocity, win rate


class KPIDefinition(BaseModel):
    """
    Definition of a KPI with formula, source, and metadata.

    This is the "semantic layer" that standardizes how metrics are calculated.
    """

    id: str
    name: str
    description: str
    category: KPICategory
    unit: str  # e.g., "USD", "%", "days", "count"

    # Formula (human-readable)
    formula: str
    numerator: Optional[str] = None
    denominator: Optional[str] = None

    # Source systems
    source_systems: List[str] = Field(default_factory=list)  # e.g., ["billing", "crm"]

    # Segmentation support
    segment_by: List[str] = Field(default_factory=list)  # e.g., ["mrr_tier", "product_category"]

    # Targets
    target_value: Optional[float] = None
    target_direction: str = "higher_is_better"  # or "lower_is_better"

    # Metadata
    owner: Optional[str] = None
    refresh_frequency: str = "daily"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class KPIMetric(BaseModel):
    """A calculated KPI metric value."""

    kpi_id: str
    value: float
    unit: str
    period_start: datetime
    period_end: datetime

    # Segmentation
    segment: Optional[str] = None  # e.g., "tier_e3"
    segment_type: Optional[str] = None  # e.g., "mrr_tier"

    # Comparison
    prior_period_value: Optional[float] = None
    yoy_value: Optional[float] = None
    vs_target: Optional[float] = None  # Actual / Target

    calculated_at: datetime = Field(default_factory=datetime.utcnow)


class SemanticLayer:
    """
    KPI semantic layer: registry of metric definitions and calculation logic.

    Provides standardized KPI definitions that can be:
    - Calculated from the unified data model
    - Segmented by MRR tier, product category, etc.
    - Used in playbook generation and dashboards
    """

    def __init__(self):
        self._definitions: dict[str, KPIDefinition] = {}
        self._register_core_kpis()

    def _register_core_kpis(self) -> None:
        """Register core KPI definitions aligned with the measurement model."""

        # ── Growth ──
        self.register(
            KPIDefinition(
                id="new_logo_arr",
                name="New Logo ARR",
                description="Annual recurring revenue from new customers acquired in period",
                category=KPICategory.GROWTH,
                unit="USD",
                formula="SUM(mrr_usd * 12) for accounts with customer_since in period",
                source_systems=["billing", "crm"],
                segment_by=["mrr_tier", "product_category", "territory"],
                target_direction="higher_is_better",
            )
        )

        self.register(
            KPIDefinition(
                id="expansion_arr",
                name="Expansion ARR",
                description="ARR growth from existing customers (upsell, cross-sell)",
                category=KPICategory.GROWTH,
                unit="USD",
                formula="SUM(mrr_delta * 12) for existing accounts where mrr_delta > 0",
                source_systems=["billing"],
                segment_by=["mrr_tier", "product_category"],
                target_direction="higher_is_better",
            )
        )

        # ── Retention ──
        self.register(
            KPIDefinition(
                id="gross_revenue_retention",
                name="Gross Revenue Retention (GRR)",
                description="% of ARR retained excluding expansion",
                category=KPICategory.RETENTION,
                unit="%",
                formula="(Beginning ARR - Churn ARR - Contraction ARR) / Beginning ARR",
                numerator="Beginning ARR - Churn ARR - Contraction ARR",
                denominator="Beginning ARR",
                source_systems=["billing"],
                segment_by=["mrr_tier"],
                target_value=0.92,
                target_direction="higher_is_better",
            )
        )

        self.register(
            KPIDefinition(
                id="net_revenue_retention",
                name="Net Revenue Retention (NRR)",
                description="% of ARR retained including expansion",
                category=KPICategory.RETENTION,
                unit="%",
                formula="(Beginning ARR - Churn + Expansion) / Beginning ARR",
                source_systems=["billing"],
                segment_by=["mrr_tier"],
                target_value=1.10,
                target_direction="higher_is_better",
            )
        )

        self.register(
            KPIDefinition(
                id="gross_churn_rate",
                name="Gross Churn Rate",
                description="% of ARR lost to cancellations/downgrades",
                category=KPICategory.RETENTION,
                unit="%",
                formula="(Churn ARR + Contraction ARR) / Beginning ARR",
                source_systems=["billing"],
                segment_by=["mrr_tier", "product_category"],
                target_direction="lower_is_better",
            )
        )

        # ── Efficiency ──
        self.register(
            KPIDefinition(
                id="sales_cycle_days",
                name="Sales Cycle (Days)",
                description="Average days from opportunity creation to close",
                category=KPICategory.EFFICIENCY,
                unit="days",
                formula="AVG(close_date - created_date) for closed-won opportunities",
                source_systems=["crm"],
                segment_by=["mrr_tier", "product_category"],
                target_direction="lower_is_better",
            )
        )

        self.register(
            KPIDefinition(
                id="quote_to_cash_days",
                name="Quote-to-Cash (Days)",
                description="Average days from quote creation to first invoice",
                category=KPICategory.EFFICIENCY,
                unit="days",
                formula="AVG(first_invoice_date - quote_created_date)",
                source_systems=["cpq", "billing"],
                segment_by=["mrr_tier"],
                target_direction="lower_is_better",
            )
        )

        self.register(
            KPIDefinition(
                id="win_rate",
                name="Win Rate",
                description="% of closed opportunities that are won",
                category=KPICategory.EFFICIENCY,
                unit="%",
                formula="Closed-Won / (Closed-Won + Closed-Lost)",
                source_systems=["crm"],
                segment_by=["mrr_tier", "product_category", "territory"],
                target_direction="higher_is_better",
            )
        )

        # ── Attach ──
        self.register(
            KPIDefinition(
                id="sdwan_attach_rate",
                name="SD-WAN Attach Rate",
                description="% of connectivity customers with SD-WAN",
                category=KPICategory.ATTACH,
                unit="%",
                formula="Accounts with SD-WAN / Accounts with Connectivity",
                source_systems=["billing"],
                segment_by=["mrr_tier"],
                target_direction="higher_is_better",
            )
        )

        self.register(
            KPIDefinition(
                id="sase_attach_rate",
                name="SASE Attach Rate",
                description="% of SD-WAN customers with SASE/security",
                category=KPICategory.ATTACH,
                unit="%",
                formula="Accounts with SASE / Accounts with SD-WAN",
                source_systems=["billing"],
                segment_by=["mrr_tier"],
                target_direction="higher_is_better",
            )
        )

        # ── Customer Health ──
        self.register(
            KPIDefinition(
                id="avg_bandwidth_utilization",
                name="Avg Bandwidth Utilization",
                description="Average bandwidth utilization across services",
                category=KPICategory.CUSTOMER_HEALTH,
                unit="%",
                formula="AVG(bandwidth_utilization_pct) across service instances",
                source_systems=["telemetry"],
                segment_by=["mrr_tier", "product_category"],
            )
        )

        self.register(
            KPIDefinition(
                id="incident_rate",
                name="Incident Rate",
                description="SEV1/SEV2 incidents per 100 services per month",
                category=KPICategory.CUSTOMER_HEALTH,
                unit="count",
                formula="(SEV1 + SEV2 tickets) / (service_count / 100)",
                source_systems=["servicenow"],
                segment_by=["mrr_tier"],
                target_direction="lower_is_better",
            )
        )

        # ── Pipeline ──
        self.register(
            KPIDefinition(
                id="pipeline_coverage",
                name="Pipeline Coverage",
                description="Pipeline / Quota ratio",
                category=KPICategory.PIPELINE,
                unit="x",
                formula="Open Pipeline ARR / Quota ARR",
                source_systems=["crm"],
                segment_by=["mrr_tier", "territory"],
                target_value=3.0,
                target_direction="higher_is_better",
            )
        )

    def register(self, definition: KPIDefinition) -> None:
        """Register a KPI definition."""
        self._definitions[definition.id] = definition

    def get(self, kpi_id: str) -> Optional[KPIDefinition]:
        """Get a KPI definition by ID."""
        return self._definitions.get(kpi_id)

    def list_all(self) -> List[KPIDefinition]:
        """List all registered KPI definitions."""
        return list(self._definitions.values())

    def list_by_category(self, category: KPICategory) -> List[KPIDefinition]:
        """List KPI definitions by category."""
        return [d for d in self._definitions.values() if d.category == category]

    def get_growth_kpis(self) -> List[KPIDefinition]:
        """Get KPIs relevant to 15% growth target."""
        growth_ids = [
            "new_logo_arr",
            "expansion_arr",
            "net_revenue_retention",
            "gross_churn_rate",
            "win_rate",
            "sdwan_attach_rate",
            "sase_attach_rate",
        ]
        return [self._definitions[k] for k in growth_ids if k in self._definitions]

    def export_for_deck(self) -> List[dict]:
        """Export KPI definitions for slide deck generation."""
        return [
            {
                "id": d.id,
                "name": d.name,
                "description": d.description,
                "category": d.category.value,
                "unit": d.unit,
                "formula": d.formula,
                "target": d.target_value,
            }
            for d in self._definitions.values()
        ]

