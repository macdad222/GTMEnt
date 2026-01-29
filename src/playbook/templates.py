"""Playbook templates: structured outlines for consistent playbooks."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SectionTemplate(BaseModel):
    """Template for a playbook section."""

    section_type: str
    title: str
    order: int
    description: str
    required: bool = True

    # Content guidance
    key_questions: List[str] = Field(default_factory=list)  # Questions section should answer
    suggested_exhibits: List[str] = Field(default_factory=list)  # e.g., "market_size_chart"
    llm_prompt_template: Optional[str] = None  # Prompt template for LLM assistance


class PlaybookTemplate(BaseModel):
    """Template defining the structure of a playbook type."""

    id: str
    name: str
    description: str
    playbook_type: str

    sections: List[SectionTemplate] = Field(default_factory=list)

    # Metadata
    target_audience: List[str] = Field(default_factory=list)  # e.g., ["exec", "segment_leader"]
    estimated_pages: int = 20


class TemplateRegistry:
    """Registry of playbook templates."""

    def __init__(self):
        self._templates: Dict[str, PlaybookTemplate] = {}
        self._register_default_templates()

    def _register_default_templates(self) -> None:
        """Register default playbook templates."""

        # ── Enterprise Strategy Deck ──
        self.register(
            PlaybookTemplate(
                id="enterprise_strategy",
                name="Enterprise Strategy Deck",
                description="BCG/Altman-style enterprise-wide strategy with TAM, trends, and growth model",
                playbook_type="enterprise_strategy",
                target_audience=["exec", "gm", "segment_leader"],
                estimated_pages=30,
                sections=[
                    SectionTemplate(
                        section_type="executive_summary",
                        title="Executive Summary",
                        order=1,
                        description="High-level summary of enterprise strategy and key recommendations",
                        key_questions=[
                            "What is the growth target and how will we achieve it?",
                            "What are the 3-5 biggest strategic moves?",
                            "What is the investment required and expected ROI?",
                        ],
                        llm_prompt_template="Generate a concise executive summary for Comcast Business Enterprise strategy targeting {growth_target} growth...",
                    ),
                    SectionTemplate(
                        section_type="market_overview",
                        title="Market Overview & TAM",
                        order=2,
                        description="Market size, trends, and competitive landscape",
                        key_questions=[
                            "What is the TAM/SAM/SOM by segment and solution?",
                            "What are the key market trends?",
                            "Who are the main competitors and what is our positioning?",
                        ],
                        suggested_exhibits=["tam_waterfall", "market_trends_chart", "competitive_matrix"],
                    ),
                    SectionTemplate(
                        section_type="segment_analysis",
                        title="Segment Analysis",
                        order=3,
                        description="Deep dive on enterprise segments by MRR tier",
                        key_questions=[
                            "How is our revenue distributed across segments?",
                            "Which segments have the highest growth potential?",
                            "Where are the biggest churn risks?",
                        ],
                        suggested_exhibits=["segment_revenue_chart", "segment_growth_matrix"],
                    ),
                    SectionTemplate(
                        section_type="growth_model",
                        title="Growth Model",
                        order=4,
                        description="Decomposition of 15% growth target into levers",
                        key_questions=[
                            "How much comes from new logos vs expansion vs reduced churn?",
                            "What is the attach rate target (SD-WAN, SASE)?",
                            "What channel mix shift is required?",
                        ],
                        suggested_exhibits=["growth_waterfall", "lever_sensitivity_chart"],
                    ),
                    SectionTemplate(
                        section_type="operating_model",
                        title="AI-Enabled Operating Model",
                        order=5,
                        description="How GTM/Delivery/Support change with AI agents",
                        key_questions=[
                            "Which workflows get automated vs assisted vs unchanged?",
                            "What is the agent portfolio?",
                            "What are the governance guardrails?",
                        ],
                        suggested_exhibits=["agent_portfolio_table", "workflow_automation_matrix"],
                    ),
                    SectionTemplate(
                        section_type="roadmap",
                        title="Implementation Roadmap",
                        order=6,
                        description="Phased plan with milestones and KPIs",
                        key_questions=[
                            "What are the Phase 0/1/2/3 milestones?",
                            "What are the quick wins vs structural changes?",
                            "How do we measure success?",
                        ],
                        suggested_exhibits=["roadmap_gantt", "kpi_dashboard_mockup"],
                    ),
                    SectionTemplate(
                        section_type="appendix",
                        title="Appendix: Data & Assumptions",
                        order=99,
                        description="Detailed data tables, assumptions, and citations",
                        required=True,
                        key_questions=[
                            "What data sources were used?",
                            "What are the key assumptions?",
                            "What are the limitations?",
                        ],
                    ),
                ],
            )
        )

        # ── Segment Playbook ──
        self.register(
            PlaybookTemplate(
                id="segment_playbook",
                name="Segment Playbook",
                description="Playbook for a specific MRR tier segment with ICP, plays, and KPIs",
                playbook_type="segment_playbook",
                target_audience=["segment_leader", "sales_leader", "marketing"],
                estimated_pages=15,
                sections=[
                    SectionTemplate(
                        section_type="segment_overview",
                        title="Segment Overview",
                        order=1,
                        description="Size, composition, and strategic importance of segment",
                        key_questions=[
                            "How many accounts and what is total ARR?",
                            "What is the growth rate and churn rate?",
                            "Why does this segment matter?",
                        ],
                    ),
                    SectionTemplate(
                        section_type="icp",
                        title="Ideal Customer Profile (ICP)",
                        order=2,
                        description="Target customer characteristics and prioritization criteria",
                        key_questions=[
                            "What firmographics define the ICP?",
                            "What technographics/needs signal fit?",
                            "How do we prioritize within the ICP?",
                        ],
                    ),
                    SectionTemplate(
                        section_type="solution_bundles",
                        title="Solution Bundles & Messaging",
                        order=3,
                        description="Recommended product bundles and value propositions",
                        key_questions=[
                            "What is the primary bundle for this segment?",
                            "What is the attach path (Connectivity → SD-WAN → SASE)?",
                            "What messaging resonates?",
                        ],
                    ),
                    SectionTemplate(
                        section_type="acquisition_plays",
                        title="Acquisition Plays",
                        order=4,
                        description="Plays for acquiring new logos in this segment",
                        key_questions=[
                            "What are the top 3 acquisition motions?",
                            "What channels work best?",
                            "What offers/incentives drive conversion?",
                        ],
                    ),
                    SectionTemplate(
                        section_type="expansion_plays",
                        title="Expansion Plays",
                        order=5,
                        description="Plays for growing existing customers",
                        key_questions=[
                            "What triggers indicate expansion readiness?",
                            "What is the upsell/cross-sell motion?",
                            "How do we orchestrate expansion reviews?",
                        ],
                    ),
                    SectionTemplate(
                        section_type="retention_plays",
                        title="Retention Plays",
                        order=6,
                        description="Plays for reducing churn",
                        key_questions=[
                            "What are the early warning signals?",
                            "What intervention motions work?",
                            "How do we prioritize at-risk accounts?",
                        ],
                    ),
                    SectionTemplate(
                        section_type="channel_capacity",
                        title="Channel & Capacity Model",
                        order=7,
                        description="Sales channel mix and rep/agent capacity",
                        key_questions=[
                            "What is the channel mix (direct, partner, digital, AI)?",
                            "What is the rep productivity target?",
                            "Where do AI agents assist vs automate?",
                        ],
                    ),
                    SectionTemplate(
                        section_type="kpis",
                        title="Segment KPIs & Scorecards",
                        order=8,
                        description="Key metrics to track segment health and playbook effectiveness",
                        key_questions=[
                            "What are the leading indicators?",
                            "What are the lagging indicators?",
                            "How do we track playbook ROI?",
                        ],
                    ),
                ],
            )
        )

    def register(self, template: PlaybookTemplate) -> None:
        """Register a template."""
        self._templates[template.id] = template

    def get(self, template_id: str) -> Optional[PlaybookTemplate]:
        """Get a template by ID."""
        return self._templates.get(template_id)

    def list_all(self) -> List[PlaybookTemplate]:
        """List all templates."""
        return list(self._templates.values())

