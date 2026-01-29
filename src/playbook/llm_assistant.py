"""LLM assistant for playbook content generation."""

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

from src.knowledge_base.models import Citation
from src.knowledge_base.vector_store import KnowledgeBaseVectorStore


class LLMGenerationRequest(BaseModel):
    """Request for LLM-assisted content generation."""

    prompt_template_id: str
    section_type: str
    context: dict = Field(default_factory=dict)
    max_tokens: int = 1000
    temperature: float = 0.7


class LLMGenerationResult(BaseModel):
    """Result from LLM generation."""

    content: str
    citations: List[Citation] = Field(default_factory=list)
    model: str
    prompt_id: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    confidence: float = 0.0  # 0-1, based on retrieval relevance


class LLMPlaybookAssistant:
    """
    LLM assistant for playbook content generation.

    Important design principles:
    - Non-deterministic: outputs are drafts that require human review
    - Grounded: uses RAG to retrieve from approved knowledge base
    - Cited: includes citations for retrieved content
    - Auditable: logs prompts, retrievals, and outputs
    """

    def __init__(
        self,
        knowledge_base: Optional[KnowledgeBaseVectorStore] = None,
        openai_api_key: Optional[str] = None,
    ):
        self.knowledge_base = knowledge_base
        self.openai_api_key = openai_api_key
        self._prompt_registry: dict[str, str] = self._build_prompt_registry()

    def _build_prompt_registry(self) -> dict[str, str]:
        """Build registry of approved prompt templates."""
        return {
            "executive_summary": """
You are a senior strategy consultant drafting an executive summary for Comcast Business Enterprise.

Context:
- Total Enterprise ARR: ${total_arr}
- Account count: {account_count}
- Growth target: {growth_target_pct}% annually
- Top segments by ARR: {top_segments}

Key market trends (from approved sources):
{market_trends}

Draft a concise executive summary (3-4 paragraphs) that:
1. States the strategic imperative
2. Summarizes the growth model
3. Highlights 3-5 key strategic moves
4. Notes the AI-enabled operating model shift

Use a professional, consulting-style tone. Be specific with numbers where available.
""",
            "segment_overview": """
You are drafting a segment overview for the {tier_label} segment of Comcast Business Enterprise.

Segment data:
- Account count: {account_count}
- Total ARR: ${total_arr}
- Average MRR: ${avg_mrr}
- Growth potential score: {growth_potential}
- Churn risk score: {churn_risk}

Write a concise overview (2-3 paragraphs) that:
1. Describes the segment's strategic importance
2. Highlights key characteristics
3. Notes primary opportunities and risks

Use a professional tone with specific metrics.
""",
            "icp_definition": """
Define the Ideal Customer Profile (ICP) for the {tier_label} segment.

Segment characteristics:
- MRR range: ${min_mrr} - ${max_mrr}
- Typical industries: {industries}
- Typical site count: {site_count_range}

Provide:
1. Firmographic criteria (size, industry, geography)
2. Technographic signals (current stack, needs)
3. Behavioral indicators (buying signals)
4. Prioritization criteria (how to rank within ICP)

Format as structured bullet points.
""",
            "acquisition_play": """
Draft an acquisition play for {tier_label} customers.

Context:
- Primary bundle: {primary_bundle}
- Key differentiators: {differentiators}
- Competitive landscape: {competitors}

Provide:
1. Play name and objective
2. Target profile (who)
3. Trigger/timing (when)
4. Motion/steps (how)
5. Messaging guidance (what to say)
6. Success metrics (how to measure)

Be specific and actionable.
""",
        }

    async def generate(
        self,
        request: LLMGenerationRequest,
    ) -> LLMGenerationResult:
        """
        Generate content using LLM with RAG grounding.

        This is a placeholder implementation. In production:
        - Use OpenAI API or similar
        - Implement proper RAG retrieval
        - Add logging and audit trails
        """
        # Get prompt template
        prompt_template = self._prompt_registry.get(request.prompt_template_id, "")
        if not prompt_template:
            return LLMGenerationResult(
                content="[Prompt template not found]",
                model="none",
                prompt_id=request.prompt_template_id,
            )

        # Format prompt with context
        try:
            prompt = prompt_template.format(**request.context)
        except KeyError as e:
            return LLMGenerationResult(
                content=f"[Missing context key: {e}]",
                model="none",
                prompt_id=request.prompt_template_id,
            )

        # Retrieve relevant context from knowledge base (RAG)
        citations: List[Citation] = []
        if self.knowledge_base:
            # Query knowledge base for relevant chunks
            query = f"{request.section_type} {' '.join(str(v) for v in request.context.values())}"
            results = self.knowledge_base.query(query, n_results=3)
            for chunk, score in results:
                citation = self.knowledge_base.create_citation(chunk)
                citations.append(citation)

        # TODO: Call OpenAI API in production
        # For MVP, return a placeholder indicating LLM would be called
        placeholder_content = (
            f"[LLM-assisted draft for {request.section_type}]\n\n"
            f"This section would be generated by the LLM using:\n"
            f"- Prompt template: {request.prompt_template_id}\n"
            f"- Context: {list(request.context.keys())}\n"
            f"- Retrieved citations: {len(citations)}\n\n"
            f"Human review required before publishing."
        )

        return LLMGenerationResult(
            content=placeholder_content,
            citations=citations,
            model="gpt-4-turbo-preview",  # Target model
            prompt_id=request.prompt_template_id,
            confidence=0.7,
        )

    def get_available_prompts(self) -> List[str]:
        """List available prompt template IDs."""
        return list(self._prompt_registry.keys())

