"""Strategy Report Service - Generates BCG/Bain-style comprehensive analysis."""

import json
import os
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path
import asyncio
import httpx

from .models import (
    StrategyReport, ReportStatus, ReportSection, ReportSectionContent,
    KeyInsight, StrategicRecommendation, MarketSizingData,
    CompetitorPositioning, SegmentStrategy, GeographicPriority,
    FinancialProjection, RiskItem, ImplementationMilestone
)
from src.admin.store import AdminConfigStore
from src.admin.models import LLMProvider
from src.cb_config.store import CBConfigStore
from src.competitive.service import CompetitiveIntelService
from src.market_intel.market_research_service import MarketResearchService
from src.segments.msa_model import get_msa_registry, MSA
from src.segments.msa_research_service import get_msa_research_service, MSAMarketIntel


class StrategyReportService:
    """Service for generating comprehensive strategy reports."""
    
    _instance: Optional["StrategyReportService"] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        
        self._data_dir = Path(os.environ.get("DATA_DIR", "./data"))
        self._reports_file = self._data_dir / "strategy_reports.json"
        self._data_dir.mkdir(parents=True, exist_ok=True)
        
        self._reports: Dict[str, StrategyReport] = self._load_reports()
        
        # Initialize dependent services
        self.admin_store = AdminConfigStore()
        self.cb_config_store = CBConfigStore()
        self.competitive_service = CompetitiveIntelService()
        self.market_research_service = MarketResearchService()
        self.msa_registry = get_msa_registry()
        self.msa_research_service = get_msa_research_service()
    
    def _load_reports(self) -> Dict[str, StrategyReport]:
        """Load reports from persistent storage."""
        if self._reports_file.exists():
            try:
                with open(self._reports_file, "r") as f:
                    data = json.load(f)
                return {k: StrategyReport(**v) for k, v in data.items()}
            except Exception as e:
                print(f"Error loading strategy reports: {e}")
        return {}
    
    def _save_reports(self) -> None:
        """Save reports to persistent storage."""
        try:
            with open(self._reports_file, "w") as f:
                json.dump(
                    {k: v.model_dump(mode="json") for k, v in self._reports.items()},
                    f, indent=2, default=str
                )
        except Exception as e:
            print(f"Error saving strategy reports: {e}")
    
    def get_all_reports(self) -> List[StrategyReport]:
        """Get all generated reports."""
        return sorted(self._reports.values(), key=lambda r: r.created_at, reverse=True)
    
    def get_report(self, report_id: str) -> Optional[StrategyReport]:
        """Get a specific report by ID."""
        return self._reports.get(report_id)
    
    def get_latest_report(self) -> Optional[StrategyReport]:
        """Get the most recent completed report."""
        completed = [r for r in self._reports.values() if r.status == ReportStatus.COMPLETED]
        if completed:
            return max(completed, key=lambda r: r.completed_at or r.created_at)
        return None
    
    async def generate_report(self, report_id: Optional[str] = None) -> StrategyReport:
        """Generate a new comprehensive strategy report.
        
        Args:
            report_id: Optional pre-created report ID. If not provided, a new one is created.
        """
        if report_id:
            report = StrategyReport(id=report_id, status=ReportStatus.GENERATING)
        else:
            report = StrategyReport(status=ReportStatus.GENERATING)
        
        self._reports[report.id] = report
        self._save_reports()
        
        # Generate content synchronously (caller handles async/background)
        await self._generate_report_content(report.id)
        
        return self._reports.get(report.id, report)
    
    async def _generate_report_content(self, report_id: str):
        """Generate the full report content using LLM."""
        report = self._reports.get(report_id)
        if not report:
            return
        
        start_time = datetime.now()
        
        try:
            # Get LLM configuration
            llm_config = self.admin_store.get_active_llm_config()
            if not llm_config:
                raise ValueError("No LLM provider configured. Please set up an LLM in Admin Setup.")
            
            # Gather all data from the platform
            context_data = await self._gather_comprehensive_data()
            
            # Generate the report using LLM
            report_content = await self._call_llm_for_report(
                context_data, llm_config
            )
            
            # Parse and structure the response
            self._parse_llm_response(report, report_content)
            
            report.status = ReportStatus.COMPLETED
            report.llm_provider = llm_config.provider.value
            report.llm_model = llm_config.model_name
            report.data_sources_used = list(context_data.keys())
            
        except Exception as e:
            report.status = ReportStatus.FAILED
            report.error_message = str(e)
            print(f"Error generating strategy report: {e}")
            import traceback
            traceback.print_exc()
        
        finally:
            report.completed_at = datetime.now()
            report.generation_time_seconds = (report.completed_at - start_time).total_seconds()
            self._reports[report_id] = report
            self._save_reports()
    
    async def _gather_comprehensive_data(self) -> Dict[str, Any]:
        """Gather all data from platform services."""
        data = {}
        
        # 1. Company Configuration & Metrics
        try:
            cb_config = self.cb_config_store.get_config()
            data["company_metrics"] = cb_config.company_metrics.model_dump(mode="json")
            data["segments"] = [s.model_dump(mode="json") for s in cb_config.segments]
            data["growth_trajectory"] = [g.model_dump(mode="json") for g in cb_config.growth_trajectory]
            data["products"] = [p.model_dump(mode="json") for p in cb_config.products]
            data["sales_capacity"] = cb_config.sales_capacity.model_dump(mode="json")
            data["primary_markets"] = cb_config.primary_markets
            data["key_competitors"] = cb_config.key_competitors
        except Exception as e:
            print(f"Error gathering CB config: {e}")
            data["company_metrics"] = {}
        
        # 2. Competitive Intelligence - GET ALL COMPETITORS AND ANALYSES
        try:
            competitors = self.competitive_service.get_competitors(active_only=True)
            data["competitors"] = []
            # Include ALL competitors, not just top 15
            for comp in competitors:
                comp_data = {
                    "name": comp.name,
                    "category": comp.category.value,
                    "business_url": comp.business_url,
                    "description": getattr(comp, 'description', ''),
                    "key_products": getattr(comp, 'key_products', []),
                    "strengths": getattr(comp, 'strengths', []),
                    "weaknesses": getattr(comp, 'weaknesses', []),
                }
                data["competitors"].append(comp_data)
            
            # Get ALL competitive analyses
            analyses = self.competitive_service.get_analyses(limit=50)  # Get all analyses
            if analyses:
                data["competitive_analyses"] = []
                for analysis in analyses:
                    data["competitive_analyses"].append({
                        "competitor_ids": getattr(analysis, 'competitor_ids', []),
                        "executive_summary": analysis.executive_summary,
                        "strengths_weaknesses": analysis.strengths_weaknesses,
                        "market_positioning": analysis.market_positioning,
                        "product_comparison": getattr(analysis, 'product_comparison', ''),
                        "recommendations": analysis.recommendations if analysis.recommendations else [],
                        "opportunities": analysis.opportunities if analysis.opportunities else [],
                        "threats": analysis.threats if analysis.threats else [],
                        "key_differentiators": getattr(analysis, 'key_differentiators', []),
                    })
        except Exception as e:
            print(f"Error gathering competitive intel: {e}")
            data["competitors"] = []
            data["competitive_analyses"] = []
        
        # 3. Market Intelligence
        try:
            market_research = self.market_research_service.get_latest_research()
            if market_research:
                data["market_intelligence"] = market_research
            else:
                data["market_intelligence"] = {}
        except Exception as e:
            print(f"Error gathering market intel: {e}")
            data["market_intelligence"] = {}
        
        # 4. MSA Geographic Data - GET ALL MSAs WITH FULL INTEL
        try:
            msas = self.msa_registry.get_all()
            data["msa_markets"] = []
            # Sort by priority_score descending - include ALL MSAs
            sorted_msas = sorted(msas, key=lambda m: m.priority_score, reverse=True)
            for msa in sorted_msas:
                msa_data = {
                    "code": msa.code,
                    "name": msa.name,
                    "short_name": msa.short_name,
                    "region": msa.region.value,
                    "population_2023": msa.population_2023,
                    "enterprise_establishments": msa.enterprise_establishments,
                    "infrastructure_type": msa.infrastructure_type.value,
                    "has_fiber": msa.has_fiber,
                    "has_coax": msa.has_coax,
                    "comcast_coverage_pct": msa.comcast_coverage_pct,
                    "fiber_coverage_pct": getattr(msa, 'fiber_coverage_pct', 0),
                    "priority_tier": msa.priority_tier,
                    "priority_score": msa.priority_score,
                    "current_arr_usd": getattr(msa, 'current_arr_usd', 0),
                    "tam_usd": getattr(msa, 'tam_usd', 0),
                    "sam_usd": getattr(msa, 'sam_usd', 0),
                    "market_share_pct": getattr(msa, 'market_share_pct', 0),
                    "total_accounts": getattr(msa, 'total_accounts', 0),
                }
                # Get FULL market intel if available
                intel = self.msa_research_service.get_cached_intel(msa.code)
                if intel:
                    msa_data["market_intel"] = {
                        "executive_summary": getattr(intel, 'executive_summary', ''),
                        "market_overview": intel.market_overview,
                        "market_dynamics": getattr(intel, 'market_dynamics', ''),
                        "competitive_landscape": intel.competitive_landscape,
                        "key_competitors": getattr(intel, 'key_competitors', []),
                        "product_opportunities": [p.model_dump(mode="json") for p in intel.product_opportunities],
                        "sales_recommendations": [s.model_dump(mode="json") for s in intel.sales_recommendations],
                        "segment_opportunities": getattr(intel, 'segment_opportunities', {}),
                        "key_insights": getattr(intel, 'key_insights', []),
                        "strategic_priorities": getattr(intel, 'strategic_priorities', []),
                    }
                data["msa_markets"].append(msa_data)
        except Exception as e:
            print(f"Error gathering MSA data: {e}")
            data["msa_markets"] = []
        
        # 5. Segment Summary
        try:
            segment_summaries = []
            config = self.cb_config_store.get_config()
            for segment in config.segments:
                segment_summaries.append({
                    "tier": segment.tier,
                    "label": segment.label,
                    "arr": segment.arr,
                    "accounts": segment.accounts,
                    "avg_mrr": segment.avg_mrr,
                    "mrr_min": segment.mrr_min,
                    "mrr_max": segment.mrr_max,
                    "growth_potential": segment.growth_potential,
                    "churn_risk": segment.churn_risk,
                    "attach_opportunity": segment.attach_opportunity,
                    "description": segment.description,
                    "typical_industries": segment.typical_industries,
                    "key_products": segment.key_products,
                    "sales_motion": segment.sales_motion,
                })
            data["segment_summaries"] = segment_summaries
        except Exception as e:
            print(f"Error gathering segment summaries: {e}")
            data["segment_summaries"] = []
        
        # 6. Segment Market Intelligence (LLM-generated insights per segment)
        try:
            segment_intel = []
            for segment in data.get("segment_summaries", []):
                tier = segment.get("tier")
                # Try to get cached segment intel from cb_config_store
                cached_intel = self.cb_config_store.get_segment_intel(tier) if hasattr(self.cb_config_store, 'get_segment_intel') else None
                if cached_intel:
                    segment_intel.append({
                        "tier": tier,
                        "label": segment.get("label"),
                        "executive_summary": getattr(cached_intel, 'executive_summary', ''),
                        "tam_estimate": getattr(cached_intel, 'tam_estimate', 0),
                        "sam_estimate": getattr(cached_intel, 'sam_estimate', 0),
                        "total_market_customers": getattr(cached_intel, 'total_market_customers', 0),
                        "total_market_revenue": getattr(cached_intel, 'total_market_revenue', 0),
                        "growth_strategies": [s.model_dump(mode="json") if hasattr(s, 'model_dump') else s for s in getattr(cached_intel, 'growth_strategies', [])],
                        "buyer_personas": [p.model_dump(mode="json") if hasattr(p, 'model_dump') else p for p in getattr(cached_intel, 'buyer_personas', [])],
                        "competitive_landscape": getattr(cached_intel, 'competitive_landscape', ''),
                        "pricing_insights": getattr(cached_intel, 'pricing_insights', ''),
                        "key_takeaways": getattr(cached_intel, 'key_takeaways', []),
                    })
            data["segment_intel"] = segment_intel
        except Exception as e:
            print(f"Error gathering segment intel: {e}")
            data["segment_intel"] = []
        
        # 7. Product Portfolio Details (with full analysis)
        try:
            product_details = []
            for product in data.get("products", []):
                product_details.append({
                    "id": product.get("id"),
                    "name": product.get("name"),
                    "category": product.get("category"),
                    "description": product.get("description"),
                    "current_arr": product.get("current_arr", 0),
                    "current_penetration_pct": product.get("current_penetration_pct", 0),
                    "yoy_growth_pct": product.get("yoy_growth_pct", 0),
                    "market_position": product.get("market_position", ""),
                    "market_rank": product.get("market_rank", 0),
                    "key_competitors": product.get("key_competitors", []),
                    "competitive_strengths": product.get("competitive_strengths", []),
                    "competitive_gaps": product.get("competitive_gaps", []),
                    "is_launched": product.get("is_launched", True),
                    "maturity": product.get("maturity", ""),
                    "target_penetration_pct": product.get("target_penetration_pct", 0),
                    "target_arr_growth_pct": product.get("target_arr_growth_pct", 0),
                })
            data["product_portfolio_details"] = product_details
        except Exception as e:
            print(f"Error gathering product details: {e}")
            data["product_portfolio_details"] = []
        
        return data
    
    async def _call_llm_for_report(self, context_data: Dict[str, Any], llm_config) -> str:
        """Call LLM with comprehensive prompt to generate the report."""
        
        system_prompt = self._build_master_system_prompt()
        user_prompt = self._build_user_prompt(context_data)
        
        provider = llm_config.provider
        model = llm_config.model_name
        api_key = llm_config.api_key
        
        async with httpx.AsyncClient(timeout=600.0) as client:
            if provider == LLMProvider.XAI:
                response = await client.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.7,
                        "max_tokens": 16000,
                    },
                )
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
            
            elif provider == LLMProvider.OPENAI:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.7,
                        "max_tokens": 16000,
                    },
                )
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
            
            elif provider == LLMProvider.ANTHROPIC:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "max_tokens": 16000,
                        "messages": [
                            {"role": "user", "content": system_prompt + "\n\n" + user_prompt}
                        ],
                    },
                )
                response.raise_for_status()
                return response.json()["content"][0]["text"]
            
            else:
                raise ValueError(f"Unsupported LLM provider: {provider}")
    
    def _build_master_system_prompt(self) -> str:
        """Build the ultimate strategy consultant system prompt."""
        return """You are the greatest strategic consultant in the history of business. You combine:

🏆 **THE LEGACY OF LEGENDS**
- The analytical rigor of Marvin Bower (founder of modern McKinsey)
- The strategic frameworks of Bruce Henderson (founder of BCG, creator of the Growth-Share Matrix)
- The competitive strategy brilliance of Michael Porter (Five Forces, Value Chain)
- The transformation expertise of Bill Bain (founder of Bain & Company)
- The innovation thinking of Clayton Christensen (Disruption Theory)
- The execution discipline of Ram Charan (Execution Framework)

🎯 **YOUR MISSION**
Create a comprehensive strategy report that would be considered the finest work ever produced by any consulting firm. This is the most important strategic document in Comcast Business's history - a roadmap to accelerate enterprise growth from 14% to 15% annually, unlocking billions in additional revenue.

📊 **REPORT STRUCTURE**
Your report MUST include these sections, each marked with clear headers:

## EXECUTIVE SUMMARY
A powerful 2-3 paragraph synthesis that a CEO can read in 2 minutes and understand the entire strategy. Include the "so what" and clear call to action.

## KEY INSIGHTS
Exactly 5 breakthrough insights that reframe how leadership should think about the business. Each should be surprising yet defensible.

## STRATEGIC RECOMMENDATIONS  
Exactly 5 prioritized recommendations with clear rationale, expected impact, and timeline. These should be bold yet achievable.

## MARKET OVERVIEW
- Total Addressable Market analysis with specific numbers
- Market growth drivers and headwinds
- Macro trends affecting enterprise connectivity

## COMPETITIVE LANDSCAPE
- Competitive positioning map for ALL competitors in the data
- For EACH competitor: detailed strengths, weaknesses, key offerings, threat level
- Create a table comparing Comcast Business vs ALL major competitors
- Comcast Business's competitive advantages and gaps by product category
- Strategic responses required for each competitive threat

## CUSTOMER SEGMENTATION STRATEGY
- DETAILED analysis of EACH enterprise segment (E1 through E5)
- For EACH segment: TAM, SAM, growth rate, buyer personas, key products, sales motion
- Growth potential score and penetration opportunities per segment
- Tailored value propositions by segment with specific messaging
- Resource allocation recommendations with $ amounts
- Create a segment prioritization matrix

## PRODUCT PORTFOLIO ANALYSIS
- Analysis of EACH product in the portfolio
- For EACH product: current performance, market position, growth trajectory
- Product-level competitive analysis vs named competitors
- Product prioritization matrix (BCG-style)
- Specific roadmap recommendations for each product category
- Bundle/attach opportunities between products

## GEOGRAPHIC STRATEGY
- Analysis of EVERY MSA in the data provided
- For EACH MSA: market size, coverage, priority score, key opportunities
- MSA prioritization tier list with rationale
- Market-specific investment recommendations (headcount, marketing spend)
- Regional go-to-market adjustments
- Create MSA priority table with all markets

## GROWTH STRATEGY
- The path from 14% to 15% growth (and beyond)
- New logo vs. expansion balance
- Pricing and packaging optimization
- Channel strategy evolution

## GO-TO-MARKET TRANSFORMATION
- Sales capacity and coverage model
- AI/digital enablement opportunities
- Customer success and retention playbook

## FINANCIAL PROJECTIONS
- 3-year revenue trajectory (2026-2028)
- Key assumptions and sensitivities
- Investment requirements and ROI

## RISK ASSESSMENT
- Top 5 strategic risks
- Mitigation strategies
- Scenario planning considerations

## IMPLEMENTATION ROADMAP
- Phased approach (100-day, 1-year, 3-year)
- Key milestones and success metrics
- Governance and accountability structure

## APPENDIX NOTES
- Key assumptions made
- Data sources referenced
- Areas requiring further analysis

📝 **FORMATTING REQUIREMENTS**
- Use Markdown formatting throughout
- Use bullet points and numbered lists liberally
- Include specific numbers and percentages where possible
- Bold key phrases and findings
- Use tables where appropriate (markdown tables)
- Write with confidence and authority
- Make it visually scannable for executives

💡 **CRITICAL SUCCESS FACTORS**
1. Every recommendation must be actionable and specific
2. Use real numbers from the data provided
3. Connect insights to Comcast Business's specific situation
4. Be bold - this strategy should be transformational
5. Ground everything in competitive reality
6. Think like an owner, not a consultant

You have access to comprehensive data about Comcast Business. Use it extensively. Where gaps exist, leverage your knowledge of the telecommunications industry, enterprise B2B markets, and competitive dynamics to provide informed analysis.

THIS IS YOUR MASTERPIECE. Make it worthy of a $10 million consulting engagement."""

    def _build_user_prompt(self, context_data: Dict[str, Any]) -> str:
        """Build the user prompt with all context data."""
        
        prompt_parts = [
            "# COMCAST BUSINESS ENTERPRISE STRATEGY ANALYSIS",
            "",
            "Generate a comprehensive BCG/Bain-quality strategy report using the following data.",
            "This report will guide Comcast Business's enterprise segment from $3B ARR at 14% growth to 15%+ growth.",
            "",
            "---",
            "",
            "## COMPANY DATA & METRICS",
            "```json",
            json.dumps(context_data.get("company_metrics", {}), indent=2),
            "```",
            "",
            "## CUSTOMER SEGMENTS",
            "```json",
            json.dumps(context_data.get("segments", []), indent=2),
            "```",
            "",
            "## SEGMENT MARKET INTELLIGENCE",
            "```json",
            json.dumps(context_data.get("segment_intelligence", []), indent=2),
            "```",
            "",
            "## PRODUCT PORTFOLIO",
            "```json",
            json.dumps(context_data.get("products", []), indent=2),
            "```",
            "",
            "## SALES CAPACITY & CONFIGURATION",
            "```json",
            json.dumps(context_data.get("sales_capacity", {}), indent=2),
            "```",
            "",
            "## ALL COMPETITORS (Analyze EACH one)",
            "```json",
            json.dumps(context_data.get("competitors", []), indent=2),
            "```",
            "",
            "## COMPETITIVE ANALYSES (Use ALL of these)",
            "```json",
            json.dumps(context_data.get("competitive_analyses", []), indent=2),
            "```",
            "",
            "## MARKET INTELLIGENCE",
            "```json",
            json.dumps(context_data.get("market_intelligence", {}), indent=2),
            "```",
            "",
            "## ALL MSA GEOGRAPHIC MARKETS (Analyze EVERY market)",
            "```json",
            json.dumps(context_data.get("msa_markets", []), indent=2),
            "```",
            "",
            "## SEGMENT MARKET INTELLIGENCE (LLM-generated insights per segment)",
            "```json",
            json.dumps(context_data.get("segment_intel", []), indent=2),
            "```",
            "",
            "## PRODUCT PORTFOLIO DETAILS (Analyze EACH product)",
            "```json",
            json.dumps(context_data.get("product_portfolio_details", []), indent=2),
            "```",
            "",
            "## GROWTH TRAJECTORY",
            "```json",
            json.dumps(context_data.get("growth_trajectory", []), indent=2),
            "```",
            "",
            "---",
            "",
            "## CRITICAL REQUIREMENTS",
            "1. Your report MUST include detailed analysis for EVERY competitor in the data",
            "2. Your report MUST include analysis for EVERY MSA market provided",
            "3. Your report MUST include analysis for EVERY product in the portfolio",
            "4. Your report MUST include specific strategies for EACH customer segment",
            "5. Use tables to present comparisons (competitors, MSAs, products)",
            "6. Be extremely specific with numbers, percentages, and $ amounts",
            "",
            "Now generate the complete strategy report following the structure in your instructions.",
            "Be specific, use real numbers, and create something truly exceptional.",
            "Remember: This is the most important strategic document Comcast Business will ever receive.",
        ]
        
        return "\n".join(prompt_parts)
    
    def _parse_llm_response(self, report: StrategyReport, content: str) -> None:
        """Parse LLM response and populate report structure."""
        
        # Store the full response as executive summary initially
        # We'll extract sections from markdown
        
        sections_map = {
            "EXECUTIVE SUMMARY": ReportSection.EXECUTIVE_SUMMARY,
            "KEY INSIGHTS": ReportSection.EXECUTIVE_SUMMARY,
            "STRATEGIC RECOMMENDATIONS": ReportSection.EXECUTIVE_SUMMARY,
            "MARKET OVERVIEW": ReportSection.MARKET_OVERVIEW,
            "COMPETITIVE LANDSCAPE": ReportSection.COMPETITIVE_LANDSCAPE,
            "CUSTOMER SEGMENTATION": ReportSection.CUSTOMER_SEGMENTATION,
            "PRODUCT PORTFOLIO": ReportSection.PRODUCT_PORTFOLIO,
            "GEOGRAPHIC STRATEGY": ReportSection.GEOGRAPHIC_ANALYSIS,
            "GROWTH STRATEGY": ReportSection.GROWTH_STRATEGY,
            "GO-TO-MARKET": ReportSection.GO_TO_MARKET,
            "FINANCIAL PROJECTIONS": ReportSection.FINANCIAL_PROJECTIONS,
            "RISK ASSESSMENT": ReportSection.RISK_ASSESSMENT,
            "IMPLEMENTATION ROADMAP": ReportSection.IMPLEMENTATION_ROADMAP,
            "APPENDIX": ReportSection.APPENDIX,
        }
        
        # Extract executive summary (first major section)
        if "## EXECUTIVE SUMMARY" in content:
            start = content.find("## EXECUTIVE SUMMARY")
            end = content.find("\n## ", start + 1)
            if end == -1:
                end = len(content)
            report.executive_summary = content[start:end].replace("## EXECUTIVE SUMMARY", "").strip()
        else:
            # Use first 2000 chars as summary
            report.executive_summary = content[:2000]
        
        # Parse sections
        report.sections = []
        
        lines = content.split("\n")
        current_section = None
        current_content = []
        
        for line in lines:
            if line.startswith("## "):
                # Save previous section
                if current_section and current_content:
                    section_text = "\n".join(current_content).strip()
                    # Find matching section type
                    section_type = None
                    for key, sect in sections_map.items():
                        if key in current_section.upper():
                            section_type = sect
                            break
                    
                    if section_type:
                        report.sections.append(ReportSectionContent(
                            section_id=section_type,
                            section_title=current_section.replace("## ", ""),
                            narrative=section_text,
                        ))
                
                current_section = line
                current_content = []
            else:
                current_content.append(line)
        
        # Don't forget the last section
        if current_section and current_content:
            section_text = "\n".join(current_content).strip()
            section_type = None
            for key, sect in sections_map.items():
                if key in current_section.upper():
                    section_type = sect
                    break
            
            if section_type:
                report.sections.append(ReportSectionContent(
                    section_id=section_type,
                    section_title=current_section.replace("## ", ""),
                    narrative=section_text,
                ))
        
        # Extract key insights if present
        self._extract_key_insights(report, content)
        
        # Extract strategic recommendations if present
        self._extract_recommendations(report, content)
    
    def _extract_key_insights(self, report: StrategyReport, content: str) -> None:
        """Extract key insights from content."""
        if "## KEY INSIGHTS" in content:
            start = content.find("## KEY INSIGHTS")
            end = content.find("\n## ", start + 1)
            if end == -1:
                end = start + 3000
            
            insights_text = content[start:end]
            
            # Parse numbered insights
            import re
            insight_pattern = r'\d+\.\s*\*\*([^*]+)\*\*[:\s]*([^\n]+(?:\n(?!\d+\.).*)*)'
            matches = re.findall(insight_pattern, insights_text)
            
            for i, (title, desc) in enumerate(matches[:5]):
                report.key_insights.append(KeyInsight(
                    title=title.strip(),
                    description=desc.strip(),
                    impact="high" if i < 2 else "medium",
                    category="strategic"
                ))
    
    def _extract_recommendations(self, report: StrategyReport, content: str) -> None:
        """Extract strategic recommendations from content."""
        if "## STRATEGIC RECOMMENDATIONS" in content:
            start = content.find("## STRATEGIC RECOMMENDATIONS")
            end = content.find("\n## ", start + 1)
            if end == -1:
                end = start + 3000
            
            recs_text = content[start:end]
            
            # Parse numbered recommendations
            import re
            rec_pattern = r'\d+\.\s*\*\*([^*]+)\*\*[:\s]*([^\n]+(?:\n(?!\d+\.).*)*)'
            matches = re.findall(rec_pattern, recs_text)
            
            timelines = ["immediate", "short-term", "medium-term", "long-term", "long-term"]
            
            for i, (title, desc) in enumerate(matches[:5]):
                report.strategic_recommendations.append(StrategicRecommendation(
                    priority=i + 1,
                    title=title.strip(),
                    description=desc.strip(),
                    rationale="Based on comprehensive analysis",
                    expected_impact="High" if i < 2 else "Medium",
                    timeline=timelines[i] if i < len(timelines) else "medium-term"
                ))
    
    def delete_report(self, report_id: str) -> bool:
        """Delete a report."""
        if report_id in self._reports:
            del self._reports[report_id]
            self._save_reports()
            return True
        return False

