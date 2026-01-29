"""Playbook generator: orchestrates template + data + LLM to produce playbooks."""

from typing import Optional, List, Dict, Any
from datetime import datetime
import hashlib

from .models import Playbook, PlaybookSection, PlaybookVersion, ApprovalStatus
from .templates import PlaybookTemplate, TemplateRegistry, SectionTemplate
from .llm_assistant import LLMPlaybookAssistant

from src.knowledge_base.models import Citation
from src.market_intel.models import MarketModel, Assumption
from src.segmentation.views import SegmentView


class PlaybookGenerator:
    """
    Generates playbooks by combining:
    - Template structure
    - Data from segmentation, market intel, KPIs
    - LLM-assisted narrative drafting

    Important: LLM outputs are non-deterministic drafts that require human review.
    """

    def __init__(
        self,
        template_registry: Optional[TemplateRegistry] = None,
        llm_assistant: Optional[LLMPlaybookAssistant] = None,
    ):
        self.templates = template_registry or TemplateRegistry()
        self.llm = llm_assistant  # Can be None for template-only generation

    def _generate_id(self, *components: str) -> str:
        """Generate a deterministic ID."""
        combined = "|".join(str(c) for c in components)
        return hashlib.sha256(combined.encode()).hexdigest()[:12]

    def generate_enterprise_strategy(
        self,
        market_model: MarketModel,
        segment_views: List[SegmentView],
        growth_target_pct: float = 0.15,
        owner_id: Optional[str] = None,
        owner_name: Optional[str] = None,
    ) -> Playbook:
        """
        Generate an enterprise strategy playbook.

        Args:
            market_model: TAM/trends data
            segment_views: Segment data with scores
            growth_target_pct: Target growth rate (default 15%)
            owner_id: Owner user ID
            owner_name: Owner name

        Returns:
            A Playbook in draft status
        """
        template = self.templates.get("enterprise_strategy")
        if not template:
            raise ValueError("Enterprise strategy template not found")

        playbook_id = self._generate_id("enterprise_strategy", datetime.utcnow().isoformat())

        sections: List[PlaybookSection] = []

        for section_template in template.sections:
            section = self._generate_section(
                section_template=section_template,
                market_model=market_model,
                segment_views=segment_views,
                growth_target_pct=growth_target_pct,
            )
            sections.append(section)

        return Playbook(
            id=playbook_id,
            name=f"Enterprise Strategy {datetime.utcnow().year}",
            description=f"Strategic playbook targeting {growth_target_pct*100:.0f}% enterprise growth",
            playbook_type="enterprise_strategy",
            sections=sections,
            owner_id=owner_id,
            owner_name=owner_name,
            status=ApprovalStatus.DRAFT,
        )

    def generate_segment_playbook(
        self,
        segment_view: SegmentView,
        market_model: Optional[MarketModel] = None,
        owner_id: Optional[str] = None,
        owner_name: Optional[str] = None,
    ) -> Playbook:
        """
        Generate a segment-specific playbook.

        Args:
            segment_view: Segment data with accounts and scores
            market_model: Optional market context
            owner_id: Owner user ID
            owner_name: Owner name

        Returns:
            A Playbook in draft status
        """
        template = self.templates.get("segment_playbook")
        if not template:
            raise ValueError("Segment playbook template not found")

        tier = segment_view.tier.value
        playbook_id = self._generate_id("segment_playbook", tier, datetime.utcnow().isoformat())

        sections: List[PlaybookSection] = []

        for section_template in template.sections:
            section = self._generate_segment_section(
                section_template=section_template,
                segment_view=segment_view,
                market_model=market_model,
            )
            sections.append(section)

        tier_label = segment_view.tier_info.label if segment_view.tier_info else tier

        return Playbook(
            id=playbook_id,
            name=f"Segment Playbook: {tier_label}",
            description=f"GTM playbook for {tier_label} segment",
            playbook_type="segment_playbook",
            segment=tier,
            sections=sections,
            owner_id=owner_id,
            owner_name=owner_name,
            status=ApprovalStatus.DRAFT,
        )

    def _generate_section(
        self,
        section_template: SectionTemplate,
        market_model: MarketModel,
        segment_views: List[SegmentView],
        growth_target_pct: float,
    ) -> PlaybookSection:
        """Generate a single section for enterprise strategy."""
        section_id = self._generate_id(section_template.section_type, datetime.utcnow().isoformat())

        # Build section content based on type
        narrative = ""
        key_points: List[str] = []
        exhibits: List[Dict[str, Any]] = []
        citations: List[Citation] = []
        assumptions: List[Assumption] = []

        if section_template.section_type == "executive_summary":
            total_arr = sum(sv.summary.total_arr_usd for sv in segment_views)
            narrative = (
                f"Comcast Business Enterprise represents ${total_arr/1e9:.1f}B in ARR across "
                f"{sum(sv.summary.account_count for sv in segment_views):,} accounts. "
                f"To achieve {growth_target_pct*100:.0f}% annual growth, we must focus on: "
                f"(1) accelerating SD-WAN/SASE attach, (2) reducing churn in mid-market tiers, "
                f"(3) scaling AI-assisted sales and support."
            )
            key_points = [
                f"Target: {growth_target_pct*100:.0f}% YoY enterprise growth for 5 years",
                "Primary levers: attach (SD-WAN/SASE), expansion, churn reduction",
                "AI-enabled operating model to scale without linear headcount growth",
            ]

        elif section_template.section_type == "market_overview":
            tam_summary = market_model.tam_estimates[0] if market_model.tam_estimates else None
            if tam_summary:
                narrative = (
                    f"The US enterprise connectivity and security market represents a "
                    f"${tam_summary.tam_usd/1e9:.0f}B+ TAM. Key trends include SD-WAN/SASE convergence "
                    f"(18-22% CAGR), managed services growth, and AI-driven operations."
                )
                assumptions.extend(market_model.global_assumptions)

            key_points = [t.title for t in market_model.trends[:5]]

            exhibits.append({
                "type": "tam_waterfall",
                "title": "Enterprise Market TAM by Solution",
                "data": [
                    {"solution": e.solution_area.value, "tam_usd": e.tam_usd}
                    for e in market_model.tam_estimates
                    if e.segment.value == "enterprise_total"
                ],
            })

        elif section_template.section_type == "segment_analysis":
            narrative = "Enterprise segments by MRR tier show distinct growth and risk profiles."
            for sv in segment_views:
                key_points.append(
                    f"{sv.summary.tier_label}: {sv.summary.account_count:,} accounts, "
                    f"${sv.summary.total_arr_usd/1e6:.1f}M ARR"
                )

            exhibits.append({
                "type": "segment_revenue_chart",
                "title": "ARR by Segment",
                "data": [
                    {"tier": sv.tier.value, "arr_usd": sv.summary.total_arr_usd}
                    for sv in segment_views
                ],
            })

        elif section_template.section_type == "growth_model":
            narrative = (
                f"Achieving {growth_target_pct*100:.0f}% growth requires a balanced approach: "
                f"~40% from new logos, ~40% from expansion/attach, ~20% from churn reduction."
            )
            key_points = [
                "New logo ARR: target high-potential accounts with Connectivity + SD-WAN bundle",
                "Expansion ARR: trigger-based plays for SD-WAN → SASE attach",
                "Churn reduction: proactive intervention for at-risk accounts",
                "Pricing uplift: capture value in renewals",
            ]

        elif section_template.section_type == "operating_model":
            narrative = (
                "The AI-enabled operating model transforms GTM, Delivery, and Support. "
                "AI agents assist (not replace) humans across the first 10 growth-acceleration workflows."
            )
            key_points = [
                "GTM: Account planning, proposal generation, quote building with guardrails",
                "Delivery: Order validation, provisioning status, scheduling",
                "Support: Voice triage with transactions, case routing, config changes",
                "Governance: Human accountability, policy guardrails, audit trails",
            ]

        elif section_template.section_type == "roadmap":
            narrative = (
                "Implementation follows a phased approach: Phase 0 (definition), "
                "Phase 1 (MVP), Phase 2 (agent scaling), Phase 3 (continuous learning)."
            )
            key_points = [
                "Phase 0 (2-4 weeks): Data mapping, KPI definitions, knowledge base curation",
                "Phase 1 (6-10 weeks): Strategy deck generator, segment playbooks, first 10 workflows",
                "Phase 2 (8-12 weeks): Agent scaling, execution integration, cost-to-serve optimization",
                "Phase 3 (ongoing): Experiment framework, playbook versioning, performance tracking",
            ]

        elif section_template.section_type == "appendix":
            narrative = "This appendix contains data sources, assumptions, and methodology details."
            assumptions.extend(market_model.global_assumptions)

        return PlaybookSection(
            id=section_id,
            title=section_template.title,
            section_type=section_template.section_type,
            order=section_template.order,
            narrative=narrative,
            key_points=key_points,
            exhibits=exhibits,
            citations=citations,
            assumptions=assumptions,
            llm_generated=False,
            human_edited=False,
        )

    def _generate_segment_section(
        self,
        section_template: SectionTemplate,
        segment_view: SegmentView,
        market_model: Optional[MarketModel],
    ) -> PlaybookSection:
        """Generate a single section for a segment playbook."""
        section_id = self._generate_id(
            section_template.section_type,
            segment_view.tier.value,
            datetime.utcnow().isoformat(),
        )

        narrative = ""
        key_points: List[str] = []
        exhibits: List[Dict[str, Any]] = []
        summary = segment_view.summary
        tier_label = summary.tier_label

        if section_template.section_type == "segment_overview":
            narrative = (
                f"The {tier_label} segment includes {summary.account_count:,} accounts "
                f"representing ${summary.total_arr_usd/1e6:.1f}M in ARR. "
                f"Average MRR is ${summary.avg_mrr_usd:,.0f}."
            )
            if summary.avg_growth_potential:
                key_points.append(f"Avg growth potential score: {summary.avg_growth_potential:.2f}")
            if summary.avg_churn_risk:
                key_points.append(f"Avg churn risk score: {summary.avg_churn_risk:.2f}")
            if summary.high_priority_accounts:
                key_points.append(f"High-priority accounts: {summary.high_priority_accounts}")

        elif section_template.section_type == "icp":
            narrative = f"The ideal customer in {tier_label} has the following characteristics:"
            key_points = [
                f"MRR range: ${segment_view.tier_info.min_mrr:,.0f} - ${segment_view.tier_info.max_mrr or 'unlimited':,}" if segment_view.tier_info else "See tier definition",
                "Multi-site footprint with network-dependent operations",
                "IT decision-maker with security and reliability priorities",
                "Growth trajectory indicating expansion potential",
            ]

        elif section_template.section_type == "solution_bundles":
            narrative = "The recommended solution path for this segment is Connectivity → SD-WAN → SASE."
            key_points = [
                "Primary bundle: Dedicated Internet + SD-WAN",
                "Upsell: SASE/security wrap",
                "Cross-sell: Managed services for operations",
                "Value prop: Reliability, security, simplified operations",
            ]

        elif section_template.section_type == "acquisition_plays":
            narrative = "Acquisition plays focus on high-intent prospects with attach potential."
            key_points = [
                "Play 1: Competitive displacement (legacy MPLS → SD-WAN)",
                "Play 2: Digital-first prospecting with AI-assisted outreach",
                "Play 3: Partner-led referral with co-sell support",
            ]

        elif section_template.section_type == "expansion_plays":
            narrative = "Expansion triggers include bandwidth utilization, contract renewals, and new sites."
            key_points = [
                "Trigger: High bandwidth utilization → upgrade offer",
                "Trigger: Renewal window → SD-WAN/SASE bundle",
                "Trigger: New site added → expansion quote",
                "Motion: Quarterly business review with expansion recommendations",
            ]

        elif section_template.section_type == "retention_plays":
            narrative = "Retention plays focus on early intervention for at-risk accounts."
            key_points = [
                "Signal: Declining usage or engagement → proactive outreach",
                "Signal: Recent incidents → executive review and remediation",
                "Signal: Approaching contract end without renewal → save motion",
                "Motion: Health score monitoring with automated alerts",
            ]

        elif section_template.section_type == "channel_capacity":
            narrative = "Channel mix and capacity model for this segment."
            key_points = [
                "Primary channel: Direct enterprise sales",
                "Supporting: Partner/agent for new logo sourcing",
                "Digital: AI-assisted prospecting and proposal generation",
                "Rep productivity target: $X ARR per rep per quarter",
            ]

        elif section_template.section_type == "kpis":
            narrative = "Key metrics to track segment performance and playbook effectiveness."
            key_points = [
                "Leading: Pipeline coverage, attach rate, quote velocity",
                "Lagging: New logo ARR, expansion ARR, NRR, churn rate",
                "Operational: Sales cycle days, quote-to-cash days, incident rate",
            ]

        return PlaybookSection(
            id=section_id,
            title=section_template.title,
            section_type=section_template.section_type,
            order=section_template.order,
            narrative=narrative,
            key_points=key_points,
            exhibits=exhibits,
            citations=[],
            assumptions=[],
            llm_generated=False,
            human_edited=False,
        )

    def create_version(
        self,
        playbook: Playbook,
        version: str,
        change_summary: str,
        created_by_id: Optional[str] = None,
        created_by_name: Optional[str] = None,
    ) -> PlaybookVersion:
        """Create a versioned snapshot of a playbook."""
        version_id = self._generate_id(playbook.id, version, datetime.utcnow().isoformat())

        return PlaybookVersion(
            id=version_id,
            playbook_id=playbook.id,
            version=version,
            playbook_snapshot=playbook.model_copy(deep=True),
            change_summary=change_summary,
            changed_sections=[s.section_type for s in playbook.sections],
            status=ApprovalStatus.PENDING_REVIEW,
            created_by_id=created_by_id,
            created_by_name=created_by_name,
        )

