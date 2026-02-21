"""Service for Questions and Insights with LLM integration."""

import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from .models import (
    InsightQuestion,
    InsightQuestionCreate,
    InsightQuestionUpdate,
    InsightStatus,
    InsightCategory,
    InsightsStore,
    DataSourceUsed,
)
from src.db_utils import db_load, db_save


class InsightsService:
    """Service for managing strategic Q&A insights with LLM."""
    
    _instance: Optional["InsightsService"] = None
    DB_KEY = "insights"
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._store = self._load_store()
    
    def _load_store(self) -> InsightsStore:
        """Load insights from database."""
        data = db_load(self.DB_KEY)
        if data:
            try:
                return InsightsStore(**data)
            except Exception as e:
                print(f"Error loading insights: {e}")
        return InsightsStore()
    
    def _save_store(self) -> None:
        """Save insights to database."""
        self._store.last_updated = datetime.now()
        try:
            db_save(self.DB_KEY, self._store.model_dump(mode="json"))
        except Exception as e:
            print(f"Error saving insights: {e}")
    
    def _gather_platform_context(self) -> tuple[str, List[DataSourceUsed]]:
        """Gather all relevant data from the platform for context."""
        context_parts = []
        sources_used = []
        
        # 1. CB Configuration Data
        try:
            from ..cb_config.store import CBConfigStore
            cb_store = CBConfigStore()
            config = cb_store.get_config()
            
            context_parts.append("""
## COMCAST BUSINESS CONFIGURATION DATA

### Company Metrics
- Enterprise ARR: ${:,.0f}
- Enterprise Accounts: {:,}
- Growth Target: {}%
- Current Growth Rate: {}%
- Net Revenue Retention: {}%
- Gross Revenue Churn: {}%
- Average MRR: ${:,.0f}
- CAC Ratio: {}x
- Customer LTV: ${:,.0f}

### Sales Bookings Targets (MRR Sold)
- 2026 Target: ${:,.0f}
- 2027 Target: ${:,.0f}
- 2028 Target: ${:,.0f}
""".format(
                config.company_metrics.enterprise_arr,
                config.company_metrics.enterprise_accounts,
                config.company_metrics.growth_target_pct,
                config.company_metrics.growth_rate_actual,
                config.company_metrics.net_revenue_retention,
                config.company_metrics.gross_revenue_churn,
                config.company_metrics.avg_mrr,
                config.company_metrics.cac_ratio,
                config.company_metrics.customer_lifetime_value,
                config.company_metrics.bookings_target_2026_mrr,
                config.company_metrics.bookings_target_2027_mrr,
                config.company_metrics.bookings_target_2028_mrr,
            ))
            
            # Segments
            context_parts.append("\n### Customer Segments")
            for seg in config.segments:
                context_parts.append(f"""
**{seg.label}** ({seg.tier})
- Description: {seg.description}
- MRR Range: ${seg.mrr_min:,.0f} - ${seg.mrr_max:,.0f}
- Accounts: {seg.accounts:,}
- ARR: ${seg.arr:,.0f}
- Growth Potential: {seg.growth_potential*100:.0f}%
- Churn Risk: {seg.churn_risk*100:.0f}%
- Sales Motion: {seg.sales_motion}
- Key Products: {', '.join(seg.key_products)}
- Industries: {', '.join(seg.typical_industries)}
""")
            
            # Products
            context_parts.append("\n### Product Portfolio")
            for prod in config.products:
                context_parts.append(f"""
**{prod.name}** ({prod.category.value})
- Current ARR: ${prod.current_arr:,.0f}
- YoY Growth: {prod.yoy_growth_pct}%
- Market Position: {prod.market_position} (Rank #{prod.market_rank})
- Maturity: {prod.maturity}
- Key Competitors: {', '.join(prod.key_competitors[:5])}
- Strengths: {'; '.join(prod.competitive_strengths[:3])}
- Gaps: {'; '.join(prod.competitive_gaps[:3])}
""")
            
            # Sales Capacity
            if config.sales_capacity and config.sales_capacity.national:
                nat = config.sales_capacity.national
                context_parts.append(f"""
### Sales Capacity (National)
- Fiscal Year: {nat.fiscal_year}
- Avg Ramp Time: {nat.avg_ramp_time_months} months
- Avg Quota Attainment: {nat.avg_quota_attainment_pct}%
- Attrition Rate: {nat.attrition_rate_pct}%
- New Logo Quota: {nat.new_logo_quota_pct}%
- Expansion Quota: {nat.expansion_quota_pct}%
- Rule of 78 Factor: {nat.rule_of_78_factor}x

Rep Quotas (MRR):
""")
                for rep in nat.rep_quotas:
                    context_parts.append(f"- {rep.rep_type_label}: {rep.count} reps @ ${rep.quota_per_rep_mrr:,.0f}/rep MRR")
            
            sources_used.append(DataSourceUsed(
                source_type="cb_config",
                source_name="Comcast Business Configuration",
                data_timestamp=str(config.updated_at)
            ))
            
            # Segment Intel
            intel = cb_store.get_all_segment_intel()
            if intel:
                context_parts.append("\n### Segment Market Intelligence (AI-Generated)")
                for tier, seg_intel in intel.items():
                    context_parts.append(f"""
**{tier} Intelligence** (Generated: {seg_intel.generated_at})
- Market Size: ${seg_intel.total_market_size/1e9:.1f}B TAM
- Total Customers: {seg_intel.total_customers:,}
- Growth Drivers: {'; '.join(seg_intel.growth_drivers[:3])}
- Competitive Threats: {'; '.join(seg_intel.competitive_threats[:3])}
- Recommended Actions: {'; '.join(seg_intel.recommended_actions[:3])}
""")
                sources_used.append(DataSourceUsed(
                    source_type="segment_intel",
                    source_name="Segment Market Intelligence",
                    data_timestamp=str(datetime.now())
                ))
        except Exception as e:
            print(f"Error loading CB config context: {e}")
        
        # 2. Competitive Intelligence
        try:
            from ..competitive.service import CompetitiveIntelService
            comp_service = CompetitiveIntelService()
            competitors = comp_service.get_all_competitors()
            
            context_parts.append("\n## COMPETITIVE INTELLIGENCE\n")
            
            # Group by category
            by_category: Dict[str, list] = {}
            for comp in competitors:
                cat = comp.category.value
                if cat not in by_category:
                    by_category[cat] = []
                by_category[cat].append(comp)
            
            for cat, comps in by_category.items():
                context_parts.append(f"\n### {cat.replace('_', ' ').title()} Competitors")
                for comp in comps[:5]:  # Limit to top 5 per category
                    scraped = "Data available" if comp.scraped_data else "No data"
                    context_parts.append(f"- **{comp.name}** ({comp.ticker or 'Private'}): {comp.business_url} [{scraped}]")
                    if comp.scraped_data:
                        sd = comp.scraped_data
                        if sd.products:
                            context_parts.append(f"  Products: {', '.join(sd.products[:5])}")
                        if sd.features:
                            context_parts.append(f"  Features: {', '.join(sd.features[:3])}")
            
            sources_used.append(DataSourceUsed(
                source_type="competitive_intel",
                source_name="Competitive Intelligence Database",
                data_timestamp=str(datetime.now())
            ))
        except Exception as e:
            print(f"Error loading competitive context: {e}")
        
        # 3. Market Research Data
        try:
            market_research_file = self._data_dir / "market_research" / "research_data.json"
            if market_research_file.exists():
                with open(market_research_file, "r") as f:
                    market_data = json.load(f)
                
                context_parts.append("\n## MARKET RESEARCH DATA\n")
                
                if "tam_data" in market_data:
                    tam = market_data["tam_data"]
                    context_parts.append(f"""
### Total Addressable Market
- Total Enterprise Connectivity TAM: ${tam.get('total_tam_billions', 0):.1f}B
- Serviceable Market: ${tam.get('sam_billions', 0):.1f}B
- Comcast Obtainable: ${tam.get('som_billions', 0):.1f}B
""")
                
                if "trends" in market_data:
                    context_parts.append("\n### Market Trends")
                    for trend in market_data["trends"][:5]:
                        context_parts.append(f"- {trend.get('title', 'N/A')}: {trend.get('description', '')[:100]}")
                
                sources_used.append(DataSourceUsed(
                    source_type="market_research",
                    source_name="Market Research Database",
                    data_timestamp=market_data.get("last_updated", str(datetime.now()))
                ))
        except Exception as e:
            print(f"Error loading market research context: {e}")
        
        # 4. MSA Data
        try:
            from ..msa.service import MSAService
            msa_service = MSAService()
            msas = msa_service.get_all_msas()
            
            if msas:
                context_parts.append("\n## MSA MARKET DATA\n")
                context_parts.append("### Key Metropolitan Statistical Areas")
                for msa in msas[:10]:  # Top 10 MSAs
                    context_parts.append(f"""
**{msa.name}** ({msa.msa_code})
- Population: {msa.population:,}
- Enterprise Accounts: {msa.enterprise_accounts:,}
- Enterprise ARR: ${msa.enterprise_arr:,.0f}
- Fiber Coverage: {msa.fiber_coverage_pct}%
- Coax Coverage: {msa.coax_coverage_pct}%
- Priority Tier: {msa.priority_tier}
""")
                
                sources_used.append(DataSourceUsed(
                    source_type="msa_data",
                    source_name="MSA Market Database",
                    data_timestamp=str(datetime.now())
                ))
        except Exception as e:
            print(f"Error loading MSA context: {e}")
        
        # 5. Incorporated Insights (from previous Q&A)
        incorporated = self.get_incorporated_insights()
        if incorporated:
            context_parts.append("\n## PREVIOUSLY VALIDATED STRATEGIC INSIGHTS\n")
            context_parts.append("These insights have been reviewed and approved by leadership for use in analysis:\n")
            for insight in incorporated:
                context_parts.append(f"""
**Question:** {insight.question}
**Key Finding:** {insight.executive_summary or insight.response[:500] if insight.response else 'N/A'}
**Recommendations:** {'; '.join(insight.key_recommendations[:3])}
**Note from Leadership:** {insight.incorporation_note or 'N/A'}
---
""")
            sources_used.append(DataSourceUsed(
                source_type="incorporated_insights",
                source_name="Validated Strategic Insights",
                data_timestamp=str(datetime.now())
            ))
        
        return "\n".join(context_parts), sources_used
    
    def _build_system_prompt(self) -> str:
        """Build the system prompt for the strategic advisor persona."""
        return """You are an elite strategic advisor to Comcast Business, combining the expertise of:

1. **Go-to-Market Strategist**: You have 25+ years of experience scaling enterprise technology and telecommunications businesses. You've led GTM transformations at companies like Cisco, Salesforce, and AWS. You understand sales motions, channel strategies, and how to optimize for different customer segments.

2. **Product Expert**: You deeply understand the enterprise connectivity, networking, cybersecurity, UCaaS, and cloud services landscape. You know the competitive dynamics, technology trends, and what drives enterprise buying decisions.

3. **Management Consulting Partner**: You bring the analytical rigor and strategic frameworks of McKinsey, BCG, and Bain. You structure problems clearly, use data to drive insights, and create actionable recommendations that executives can implement.

Your analysis should be:
- **Thorough**: Leave no stone unturned. Consider all angles and implications.
- **Data-Driven**: Reference specific numbers, percentages, and metrics from the provided context.
- **Actionable**: Every insight should connect to specific actions Comcast Business can take.
- **Executive-Ready**: Write as if this will be presented to the CEO and Board.
- **Honest**: If there are risks or challenges, address them directly with mitigation strategies.

When responding:
1. Start with an **Executive Summary** (2-3 sentences capturing the key insight)
2. Provide **Detailed Analysis** with supporting data and reasoning
3. End with **Key Recommendations** (3-5 specific, actionable items)

Use markdown formatting for clarity. Include relevant metrics and comparisons where applicable.

Remember: This analysis may directly influence multi-billion dollar decisions. Treat every question as the most important strategic work you've ever done."""
    
    async def create_insight(
        self, 
        request: InsightQuestionCreate, 
        insight_id: Optional[str] = None
    ) -> InsightQuestion:
        """Create a new insight question and generate response.
        
        Args:
            request: The insight question request
            insight_id: Optional pre-created insight ID for async operations
        """
        # Check if insight already exists (from async background task)
        existing_insight = None
        if insight_id:
            for i in self._store.insights:
                if i.id == insight_id:
                    existing_insight = i
                    break
        
        if existing_insight:
            insight = existing_insight
        else:
            # Create the insight record
            insight = InsightQuestion(
                question=request.question,
                category=request.category or InsightCategory.GENERAL,
                status=InsightStatus.PROCESSING,
            )
            
            # Add to store immediately so user sees it's processing
            self._store.insights.insert(0, insight)
            self._save_store()
        
        # Generate the response
        start_time = time.time()
        
        try:
            # Gather platform context
            context, sources_used = self._gather_platform_context()
            insight.data_sources_used = sources_used
            
            # Get LLM configuration
            from ..admin.store import AdminConfigStore
            admin_store = AdminConfigStore()
            
            active_provider = None
            api_key = None
            model = None
            
            # Get active LLM config
            active_llm = admin_store.get_active_llm_config()
            if active_llm and active_llm.api_key:
                active_provider = active_llm.provider.value
                api_key = active_llm.api_key
                model = active_llm.get_default_model()
            
            if not active_provider or not api_key:
                raise ValueError("No active LLM provider configured. Please add an API key in Admin Setup.")
            
            insight.llm_provider = active_provider
            insight.llm_model = model
            
            # Build the prompt
            system_prompt = self._build_system_prompt()
            user_prompt = f"""## PLATFORM DATA CONTEXT

{context}

---

## STRATEGIC QUESTION

{request.question}

---

Please provide a comprehensive, executive-ready analysis addressing this question. Use the platform data provided above to support your analysis with specific metrics and insights."""
            
            # Call LLM based on provider
            response_text = await self._call_llm(active_provider, api_key, model, system_prompt, user_prompt)
            
            # Parse response for executive summary and recommendations
            insight.response = response_text
            insight.executive_summary = self._extract_executive_summary(response_text)
            insight.key_recommendations = self._extract_recommendations(response_text)
            
            insight.status = InsightStatus.COMPLETED
            insight.completed_at = datetime.now()
            insight.processing_time_seconds = time.time() - start_time
            
        except Exception as e:
            insight.status = InsightStatus.FAILED
            insight.error_message = str(e)
            insight.completed_at = datetime.now()
            insight.processing_time_seconds = time.time() - start_time
        
        # Update and save
        self._store.insights[0] = insight
        self._save_store()
        
        return insight
    
    async def _call_llm(self, provider: str, api_key: str, model: str, system_prompt: str, user_prompt: str) -> str:
        """Call the appropriate LLM provider."""
        import httpx
        
        if provider == "xai":
            # Grok API
            async with httpx.AsyncClient(timeout=600.0) as client:
                response = await client.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model or "grok-3-latest",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 25000,
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        
        elif provider == "openai":
            async with httpx.AsyncClient(timeout=600.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model or "gpt-4-turbo-preview",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 25000,
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        
        elif provider == "anthropic":
            async with httpx.AsyncClient(timeout=600.0) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "system": system_prompt,
                        "messages": [
                            {"role": "user", "content": user_prompt}
                        ],
                        "max_tokens": 25000,
                    }
                )
                if response.status_code != 200:
                    print(f"Anthropic API error {response.status_code}: {response.text[:500]}")
                response.raise_for_status()
                data = response.json()
                stop_reason = data.get("stop_reason", "unknown")
                content_text = data["content"][0]["text"]
                print(f"Anthropic insights response: {len(content_text)} chars, stop_reason={stop_reason}")
                if stop_reason == "max_tokens":
                    print("WARNING: Insights response was truncated due to max_tokens limit")
                return content_text
        
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
    
    def _extract_executive_summary(self, response: str) -> Optional[str]:
        """Extract executive summary from response."""
        # Look for Executive Summary section
        import re
        
        patterns = [
            r"(?:##?\s*)?Executive Summary[:\s]*\n+(.*?)(?:\n\n|\n##|\n\*\*|$)",
            r"(?:##?\s*)?Summary[:\s]*\n+(.*?)(?:\n\n|\n##|\n\*\*|$)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, response, re.IGNORECASE | re.DOTALL)
            if match:
                summary = match.group(1).strip()
                # Clean up and limit length
                summary = re.sub(r'\n+', ' ', summary)
                return summary[:500] if len(summary) > 500 else summary
        
        # Fallback: first paragraph
        first_para = response.split('\n\n')[0]
        return first_para[:500] if len(first_para) > 500 else first_para
    
    def _extract_recommendations(self, response: str) -> List[str]:
        """Extract key recommendations from response."""
        import re
        
        recommendations = []
        
        # Look for recommendations section
        patterns = [
            r"(?:##?\s*)?(?:Key )?Recommendations?[:\s]*\n+(.*?)(?:\n\n##|\n\n\*\*|$)",
            r"(?:##?\s*)?Action Items?[:\s]*\n+(.*?)(?:\n\n##|\n\n\*\*|$)",
            r"(?:##?\s*)?Next Steps?[:\s]*\n+(.*?)(?:\n\n##|\n\n\*\*|$)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, response, re.IGNORECASE | re.DOTALL)
            if match:
                section = match.group(1)
                # Extract numbered or bulleted items
                items = re.findall(r'(?:^|\n)\s*(?:\d+[\.\)]\s*|\-\s*|\*\s*)(.+?)(?=\n|$)', section)
                if items:
                    recommendations = [item.strip() for item in items[:5]]
                    break
        
        return recommendations
    
    def get_all_insights(self) -> List[InsightQuestion]:
        """Get all insights, sorted by creation date (newest first)."""
        return sorted(self._store.insights, key=lambda x: x.created_at, reverse=True)
    
    def get_insight(self, insight_id: str) -> Optional[InsightQuestion]:
        """Get a specific insight by ID."""
        for insight in self._store.insights:
            if insight.id == insight_id:
                return insight
        return None
    
    def update_insight(self, insight_id: str, update: InsightQuestionUpdate) -> Optional[InsightQuestion]:
        """Update an insight (incorporate, star, etc.)."""
        for i, insight in enumerate(self._store.insights):
            if insight.id == insight_id:
                if update.is_incorporated is not None:
                    insight.is_incorporated = update.is_incorporated
                    if update.is_incorporated:
                        insight.status = InsightStatus.INCORPORATED
                if update.incorporation_note is not None:
                    insight.incorporation_note = update.incorporation_note
                if update.is_starred is not None:
                    insight.is_starred = update.is_starred
                if update.category is not None:
                    insight.category = update.category
                
                self._store.insights[i] = insight
                self._save_store()
                return insight
        return None
    
    def delete_insight(self, insight_id: str) -> bool:
        """Delete an insight."""
        for i, insight in enumerate(self._store.insights):
            if insight.id == insight_id:
                del self._store.insights[i]
                self._save_store()
                return True
        return False
    
    def mark_insight_failed(self, insight_id: str, error_message: str) -> bool:
        """Mark an insight as failed due to an error."""
        for insight in self._store.insights:
            if insight.id == insight_id:
                insight.status = InsightStatus.FAILED
                insight.response = f"Error: {error_message}"
                self._save_store()
                return True
        return False
    
    def get_incorporated_insights(self) -> List[InsightQuestion]:
        """Get all incorporated insights (used in other analyses)."""
        return [i for i in self._store.insights if i.is_incorporated]
    
    def get_starred_insights(self) -> List[InsightQuestion]:
        """Get all starred insights."""
        return [i for i in self._store.insights if i.is_starred]
    
    def get_insights_by_category(self, category: InsightCategory) -> List[InsightQuestion]:
        """Get insights by category."""
        return [i for i in self._store.insights if i.category == category]

