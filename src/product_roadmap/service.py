"""Service for LLM-driven product competitiveness and roadmap analysis."""

import json
import os
import re
from datetime import datetime
from typing import Optional
from pathlib import Path

from .models import (
    ProductPortfolio,
    ProductCompetitiveness,
    RoadmapRecommendation,
    ProductRoadmapIntel,
    ProductCategory,
    MarketPosition,
    InvestmentPriority,
    CompetitorProduct,
    DEFAULT_PRODUCT_PORTFOLIO,
)


class ProductRoadmapService:
    """Service to generate product competitiveness and roadmap analysis using LLM."""
    
    _instance: Optional["ProductRoadmapService"] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        
        from src.db_utils import db_load, db_save
        self._db_load = db_load
        self._db_save = db_save
        
        self._intel: Optional[ProductRoadmapIntel] = self._load_intel()
    
    def _load_intel(self) -> Optional[ProductRoadmapIntel]:
        """Load cached intel from database."""
        data = self._db_load("product_roadmap_intel")
        if data:
            try:
                return ProductRoadmapIntel(**data)
            except Exception as e:
                print(f"Error loading product roadmap intel: {e}")
        return None
    
    def _save_intel(self, intel: ProductRoadmapIntel) -> None:
        """Save intel to database."""
        try:
            self._db_save("product_roadmap_intel", intel.model_dump(mode="json"))
            self._intel = intel
        except Exception as e:
            print(f"Error saving product roadmap intel: {e}")
    
    def get_intel(self) -> Optional[ProductRoadmapIntel]:
        """Get the current product roadmap intel."""
        return self._intel
    
    def get_default_portfolio(self) -> list[ProductPortfolio]:
        """Get the default product portfolio."""
        return DEFAULT_PRODUCT_PORTFOLIO
    
    def _get_llm_client(self):
        """Get the configured LLM client."""
        from src.admin.store import AdminConfigStore
        
        admin_store = AdminConfigStore()
        provider_config = admin_store.get_active_llm_config()
        
        if provider_config and provider_config.api_key:
            return provider_config
        
        raise ValueError("No LLM provider configured. Please set up an LLM provider in Admin Setup.")
    
    def _call_llm(self, prompt: str, system_prompt: str) -> tuple[str, str, str]:
        """Call the configured LLM and return response, provider, model."""
        provider_config = self._get_llm_client()
        
        if provider_config.provider == "xai":
            import httpx
            
            model = provider_config.get_default_model() or "grok-4-1-fast-reasoning"
            
            with httpx.Client(timeout=600.0) as client:
                response = client.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {provider_config.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        "max_tokens": 25000,
                        "temperature": 0.7,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"], provider_config.provider.value, model
        
        elif provider_config.provider == "openai":
            import httpx
            
            model = provider_config.get_default_model() or "gpt-4o"
            
            with httpx.Client(timeout=600.0) as client:
                response = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {provider_config.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        "max_tokens": 25000,
                        "temperature": 0.7,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"], provider_config.provider.value, model
        
        elif provider_config.provider == "anthropic":
            import httpx
            
            model = provider_config.get_default_model()
            
            with httpx.Client(timeout=600.0) as client:
                response = client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": provider_config.api_key,
                        "Content-Type": "application/json",
                        "anthropic-version": "2023-06-01",
                    },
                    json={
                        "model": model,
                        "max_tokens": 25000,
                        "system": system_prompt,
                        "messages": [
                            {"role": "user", "content": prompt},
                        ],
                    },
                )
                if response.status_code != 200:
                    print(f"Anthropic API error {response.status_code}: {response.text[:500]}")
                response.raise_for_status()
                data = response.json()
                stop_reason = data.get("stop_reason", "unknown")
                content_text = data["content"][0]["text"]
                print(f"Anthropic product roadmap response: {len(content_text)} chars, stop_reason={stop_reason}")
                if stop_reason == "max_tokens":
                    print("WARNING: Product roadmap response was truncated due to max_tokens limit")
                return content_text, provider_config.provider.value, model
        
        else:
            raise ValueError(f"Unsupported LLM provider: {provider_config.provider}")
    
    def generate_intel(self, force_refresh: bool = False) -> ProductRoadmapIntel:
        """Generate comprehensive product competitiveness and roadmap analysis."""
        
        # Check if we have cached intel and force_refresh is False
        if self._intel and not force_refresh:
            return self._intel
        
        # Build portfolio summary for prompt
        portfolio_summary = []
        for prod in DEFAULT_PRODUCT_PORTFOLIO:
            portfolio_summary.append(f"""
- **{prod.name}** ({prod.category.value})
  - Penetration: {prod.current_penetration_pct}% | YoY Growth: {prod.yoy_growth_pct}%
  - Market Position: {prod.market_position.value} (Rank #{prod.market_rank})
  - Competitors: {', '.join(prod.key_competitors[:3])}
  - Strengths: {', '.join(prod.competitive_strengths[:2])}
  - Gaps: {', '.join(prod.competitive_gaps[:2])}
  - Status: {'Launched' if prod.is_launched else f'Planned {prod.launch_date}'}
""")
        
        system_prompt = """You are a senior strategy consultant specializing in B2B telecommunications, 
enterprise networking, and cybersecurity markets. You provide BCG/McKinsey-quality strategic analysis 
with specific, actionable recommendations backed by market data.

You are analyzing Comcast Business's enterprise product portfolio to develop a comprehensive 
competitiveness assessment and strategic roadmap for 2026-2028.

Focus on:
1. Honest assessment of where CB is strong vs. where it needs investment
2. Specific competitive dynamics and market share opportunities
3. Concrete recommendations with investment sizing and expected returns
4. Realistic timelines and dependencies
5. Risk factors and mitigation strategies

Be specific with numbers, competitors, and market data. Avoid generic recommendations."""

        user_prompt = f"""
Generate a comprehensive Product Competitiveness and Roadmap Analysis for Comcast Business Enterprise.

## Current Portfolio Assessment:
{chr(10).join(portfolio_summary)}

## Market Context (2025-2028):
- Enterprise networking market: $85B TAM, 8% CAGR
- SD-WAN/SASE market: $15B TAM, 25% CAGR  
- Business security services: $45B TAM, 12% CAGR
- UCaaS/CCaaS market: $60B TAM, 14% CAGR
- Business mobile: $120B TAM, 5% CAGR

## Key Strategic Questions:
1. Where should CB double down for maximum competitive advantage?
2. What product gaps must be closed to compete with Verizon/AT&T/Lumen?
3. Which categories offer the best growth opportunity given CB's assets?
4. What partnerships or acquisitions should be considered?
5. How should CB position for the 2026 mobile enterprise launch?

Please provide your analysis in the following JSON structure:

```json
{{
  "executive_summary": "3-4 paragraph strategic summary of portfolio health and key recommendations",
  
  "portfolio_health_score": 72,
  "portfolio_strengths": ["strength 1", "strength 2", "strength 3"],
  "portfolio_weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  
  "competitive_analysis": [
    {{
      "category": "connectivity",
      "category_label": "Connectivity & Internet",
      "cb_products": ["Business Internet", "Ethernet", "Fixed Wireless"],
      "overall_position": "strong",
      "market_share_pct": 12.5,
      "tam_billions": 35.0,
      "cagr_pct": 6.0,
      "market_leaders": ["Verizon", "AT&T", "Lumen"],
      "feature_gaps": ["gap 1", "gap 2"],
      "coverage_gaps": ["gap 1"],
      "pricing_position": "competitive",
      "strategic_fit": "High - Core to CB value proposition",
      "growth_opportunity": "Moderate growth through fiber expansion and fixed wireless",
      "risk_factors": ["risk 1", "risk 2"]
    }}
  ],
  
  "roadmap_recommendations": [
    {{
      "id": "rec_1",
      "title": "Accelerate SASE Platform Investment",
      "description": "Build comprehensive SASE platform to compete with Zscaler and Palo Alto",
      "category": "secure_networking",
      "recommendation_type": "invest",
      "priority": "critical",
      "revenue_impact_millions": 250.0,
      "margin_impact_pct": 45.0,
      "time_to_value_months": 18,
      "estimated_investment_millions": 80.0,
      "requires_partnership": true,
      "partner_candidates": ["Cloudflare", "Netskope"],
      "phase": "2026",
      "dependencies": ["SD-WAN platform maturity"],
      "rationale": "SASE is converging SD-WAN and security. CB must have competitive offering to retain enterprise customers migrating from legacy networks.",
      "success_metrics": ["SASE attach rate >25%", "$200M ARR by 2028", "NPS >40"]
    }}
  ],
  
  "total_recommended_investment_millions": 350.0,
  "expected_revenue_impact_millions": 800.0,
  "expected_roi_pct": 128.0,
  
  "strategic_themes": [
    "theme 1",
    "theme 2",
    "theme 3"
  ],
  
  "market_trends": [
    "trend 1",
    "trend 2",
    "trend 3"
  ],
  
  "key_risks": [
    "risk 1",
    "risk 2"
  ],
  
  "mitigation_strategies": [
    "strategy 1",
    "strategy 2"
  ],
  
  "sources": [
    "Gartner Magic Quadrant for SD-WAN 2025",
    "Forrester Wave: SASE 2025",
    "IDC Enterprise Networking Forecast 2025-2028"
  ],
  
  "methodology_notes": "Analysis based on public market data, competitive intelligence, and industry benchmarks. Investment figures are estimates requiring detailed business case development."
}}
```

Provide 4-6 competitive analyses (one per major category) and 8-12 roadmap recommendations spanning 2026-2028.
Be specific and actionable. This will be used by senior executives to make investment decisions.
"""

        # Call LLM
        response_text, provider, model = self._call_llm(user_prompt, system_prompt)
        
        # Parse JSON from response
        intel = self._parse_intel_response(response_text, provider, model)
        
        # Save to file
        self._save_intel(intel)
        
        return intel
    
    def _parse_intel_response(self, response_text: str, provider: str, model: str) -> ProductRoadmapIntel:
        """Parse LLM response into ProductRoadmapIntel model."""
        
        # Extract JSON from response
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find raw JSON
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
            else:
                raise ValueError("Could not extract JSON from LLM response")
        
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            print(f"Attempted to parse: {json_str[:500]}...")
            raise ValueError(f"Failed to parse LLM response as JSON: {e}")
        
        # Build competitive analysis
        competitive_analysis = []
        for ca in data.get("competitive_analysis", []):
            try:
                category = ProductCategory(ca.get("category", "connectivity"))
            except ValueError:
                category = ProductCategory.CONNECTIVITY
            
            try:
                position = MarketPosition(ca.get("overall_position", "growing"))
            except ValueError:
                position = MarketPosition.GROWING
            
            competitive_analysis.append(ProductCompetitiveness(
                category=category,
                category_label=ca.get("category_label", ""),
                cb_products=ca.get("cb_products", []),
                overall_position=position,
                market_share_pct=ca.get("market_share_pct"),
                tam_billions=ca.get("tam_billions", 0.0),
                cagr_pct=ca.get("cagr_pct", 0.0),
                market_leaders=ca.get("market_leaders", []),
                feature_gaps=ca.get("feature_gaps", []),
                coverage_gaps=ca.get("coverage_gaps", []),
                pricing_position=ca.get("pricing_position", "competitive"),
                strategic_fit=ca.get("strategic_fit", ""),
                growth_opportunity=ca.get("growth_opportunity", ""),
                risk_factors=ca.get("risk_factors", []),
            ))
        
        # Build roadmap recommendations
        roadmap_recommendations = []
        for rec in data.get("roadmap_recommendations", []):
            try:
                category = ProductCategory(rec.get("category", "connectivity"))
            except ValueError:
                category = ProductCategory.CONNECTIVITY
            
            try:
                priority = InvestmentPriority(rec.get("priority", "medium"))
            except ValueError:
                priority = InvestmentPriority.MEDIUM
            
            roadmap_recommendations.append(RoadmapRecommendation(
                id=rec.get("id", f"rec_{len(roadmap_recommendations)}"),
                title=rec.get("title", ""),
                description=rec.get("description", ""),
                category=category,
                recommendation_type=rec.get("recommendation_type", "invest"),
                priority=priority,
                revenue_impact_millions=rec.get("revenue_impact_millions", 0.0),
                margin_impact_pct=rec.get("margin_impact_pct", 0.0),
                time_to_value_months=rec.get("time_to_value_months", 12),
                estimated_investment_millions=rec.get("estimated_investment_millions", 0.0),
                requires_partnership=rec.get("requires_partnership", False),
                partner_candidates=rec.get("partner_candidates", []),
                phase=rec.get("phase", "2026"),
                dependencies=rec.get("dependencies", []),
                rationale=rec.get("rationale", ""),
                success_metrics=rec.get("success_metrics", []),
            ))
        
        # Build the intel object
        intel = ProductRoadmapIntel(
            generated_at=datetime.utcnow(),
            llm_provider=provider,
            llm_model=model,
            executive_summary=data.get("executive_summary", ""),
            portfolio_health_score=data.get("portfolio_health_score", 0.0),
            portfolio_strengths=data.get("portfolio_strengths", []),
            portfolio_weaknesses=data.get("portfolio_weaknesses", []),
            product_assessments=DEFAULT_PRODUCT_PORTFOLIO,
            competitive_analysis=competitive_analysis,
            roadmap_recommendations=roadmap_recommendations,
            total_recommended_investment_millions=data.get("total_recommended_investment_millions", 0.0),
            expected_revenue_impact_millions=data.get("expected_revenue_impact_millions", 0.0),
            expected_roi_pct=data.get("expected_roi_pct", 0.0),
            strategic_themes=data.get("strategic_themes", []),
            market_trends=data.get("market_trends", []),
            key_risks=data.get("key_risks", []),
            mitigation_strategies=data.get("mitigation_strategies", []),
            sources=data.get("sources", []),
            methodology_notes=data.get("methodology_notes", ""),
        )
        
        return intel
    
    def delete_intel(self) -> bool:
        """Delete the cached intel."""
        if self._intel_file.exists():
            self._intel_file.unlink()
            self._intel = None
            return True
        return False


def get_product_roadmap_service() -> ProductRoadmapService:
    """Get the singleton product roadmap service instance."""
    return ProductRoadmapService()

