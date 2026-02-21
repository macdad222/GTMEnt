"""LLM-powered segment market research service."""

import json
import re
import uuid
from datetime import datetime
from typing import Optional

from .models import SegmentConfig, SegmentMarketIntel
from .store import get_cb_config_store
from src.admin.store import AdminConfigStore


class SegmentResearchService:
    """Service for generating LLM-powered market intelligence by segment."""
    
    def __init__(self):
        self._cb_store = get_cb_config_store()
        self._admin_store = AdminConfigStore()
    
    def _get_llm_client(self):
        """Get configured LLM client."""
        # Get active LLM provider
        active_provider = self._admin_store.get_active_llm_config()
        
        if not active_provider or not active_provider.api_key:
            raise ValueError("No active LLM provider configured. Please configure an API key in Admin Setup.")
        
        return active_provider
    
    def _call_llm(self, prompt: str, system_prompt: str) -> tuple[str, str, str]:
        """Call the configured LLM and return response, provider, model."""
        provider_config = self._get_llm_client()
        provider_name = provider_config.provider.value  # Get string value from enum
        
        if provider_name == "xai":
            import httpx
            
            model = provider_config.get_default_model()
            
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
                return data["choices"][0]["message"]["content"], provider_name, model
        
        elif provider_name == "openai":
            import httpx
            
            model = provider_config.get_default_model()
            
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
                return data["choices"][0]["message"]["content"], provider_name, model
        
        elif provider_name == "anthropic":
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
                print(f"Anthropic segment research response: {len(content_text)} chars, stop_reason={stop_reason}")
                if stop_reason == "max_tokens":
                    print("WARNING: Segment research response was truncated due to max_tokens limit")
                return content_text, provider_name, model
        
        raise ValueError(f"Unsupported LLM provider: {provider_name}")
    
    def _build_segment_prompt(self, segment: SegmentConfig) -> tuple[str, str]:
        """Build the prompt for segment market research."""
        
        system_prompt = """You are a senior strategy consultant with 25+ years of experience at McKinsey, BCG, and Bain, 
specializing in telecommunications, enterprise technology, and B2B go-to-market strategies.

You are researching market intelligence for Comcast Business, focusing on the enterprise segment 
(customers billing $1,500+/month). Your analysis should be:
- Data-driven with specific numbers and percentages
- Actionable with clear recommendations
- Grounded in real market dynamics
- Focused on growth opportunities

Comcast Business Context:
- Current enterprise revenue: ~$3B/year
- Current growth rate: 14%
- Target growth rate: 15% for 5 years
- Key services: Fiber/Ethernet, SD-WAN, SASE/Security, Managed Services, Voice/UCaaS
- Competitors: AT&T Business, Verizon Business, Lumen, Spectrum Enterprise, Frontier, plus pure-play vendors

Your output must be structured JSON that can be parsed programmatically."""

        user_prompt = f"""Analyze the following enterprise segment for Comcast Business and provide comprehensive market intelligence:

SEGMENT: {segment.label}
DESCRIPTION: {segment.description}
MRR RANGE: ${segment.mrr_min:,.0f} - ${f'{segment.mrr_max:,.0f}' if segment.mrr_max else 'unlimited'}/month
CURRENT ACCOUNTS: {segment.accounts:,}
CURRENT ARR: ${segment.arr:,.0f}
AVG MRR: ${segment.avg_mrr:,.0f}
TYPICAL INDUSTRIES: {', '.join(segment.typical_industries) if segment.typical_industries else 'Various'}
KEY PRODUCTS: {', '.join(segment.key_products) if segment.key_products else 'Full portfolio'}
SALES MOTION: {segment.sales_motion or 'Mixed'}

Provide your analysis as a JSON object with these fields:

{{
  "executive_summary": "2-3 paragraph executive summary of the segment opportunity, market dynamics, and strategic priorities",
  
  "tam_estimate": <number in USD - total addressable market for this segment nationally>,
  "tam_methodology": "Explain how you calculated the TAM",
  "sam_estimate": <number in USD - serviceable addressable market within Comcast footprint>,
  "growth_rate_cagr": "X-Y% - estimated CAGR for this segment",
  
  "total_market_customers": <integer - estimated total number of businesses/customers that fit this segment nationally (e.g., businesses in the MRR range $1,500-$10,000 for connectivity and telecom services)>,
  "total_market_revenue": <number in USD - total annual revenue from all providers serving this segment nationally (entire market, not just TAM)>,
  
  "buyer_personas": [
    {{
      "title": "Job title of key buyer",
      "responsibilities": "What they're responsible for",
      "pain_points": ["Pain point 1", "Pain point 2", "Pain point 3"],
      "decision_criteria": ["Criterion 1", "Criterion 2", "Criterion 3"]
    }}
  ],
  
  "competitive_landscape": "Detailed paragraph on competitive dynamics in this segment",
  "primary_competitors": ["Competitor 1", "Competitor 2", "Competitor 3"],
  "competitive_strengths": ["Comcast strength 1", "Comcast strength 2"],
  "competitive_weaknesses": ["Comcast weakness 1", "Comcast weakness 2"],
  
  "growth_strategies": [
    {{
      "name": "Strategy name",
      "description": "Detailed description",
      "impact": "high/medium/low",
      "complexity": "high/medium/low",
      "timeline": "X-Y months"
    }}
  ],
  
  "pricing_insights": "Paragraph on pricing dynamics and trends",
  "typical_deal_size": "$X-$Y range",
  "pricing_trends": ["Trend 1", "Trend 2"],
  
  "attach_opportunities": [
    {{
      "product": "Product/service name",
      "penetration_rate": "Current penetration %",
      "revenue_potential": "$ potential per account",
      "approach": "How to sell this"
    }}
  ],
  
  "key_takeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3", "Takeaway 4", "Takeaway 5"],
  
  "sources": ["Source 1 with date", "Source 2 with date"]
}}

Be specific with numbers. Use 2024-2025 market data. Focus on actionable insights for this specific segment."""

        return system_prompt, user_prompt
    
    def _parse_llm_response(self, response: str, segment_tier: str, provider: str, model: str) -> SegmentMarketIntel:
        """Parse LLM response into SegmentMarketIntel object."""
        
        # Try to extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if not json_match:
            raise ValueError("Could not find JSON in LLM response")
        
        try:
            data = json.loads(json_match.group())
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON: {e}")
        
        return SegmentMarketIntel(
            id=f"intel-{segment_tier}-{uuid.uuid4().hex[:8]}",
            segment_tier=segment_tier,
            generated_at=datetime.utcnow(),
            llm_provider=provider,
            llm_model=model,
            executive_summary=data.get("executive_summary", ""),
            tam_estimate=float(data.get("tam_estimate", 0)),
            tam_methodology=data.get("tam_methodology", ""),
            sam_estimate=float(data.get("sam_estimate", 0)),
            growth_rate_cagr=data.get("growth_rate_cagr", ""),
            total_market_customers=int(data.get("total_market_customers", 0)),
            total_market_revenue=float(data.get("total_market_revenue", 0)),
            buyer_personas=data.get("buyer_personas", []),
            competitive_landscape=data.get("competitive_landscape", ""),
            primary_competitors=data.get("primary_competitors", []),
            competitive_strengths=data.get("competitive_strengths", []),
            competitive_weaknesses=data.get("competitive_weaknesses", []),
            growth_strategies=data.get("growth_strategies", []),
            pricing_insights=data.get("pricing_insights", ""),
            typical_deal_size=data.get("typical_deal_size", ""),
            pricing_trends=data.get("pricing_trends", []),
            attach_opportunities=data.get("attach_opportunities", []),
            key_takeaways=data.get("key_takeaways", []),
            sources=data.get("sources", []),
        )
    
    def generate_segment_intel(self, segment_tier: str, force_refresh: bool = False) -> SegmentMarketIntel:
        """Generate market intelligence for a specific segment."""
        
        # Check for existing intel unless force refresh
        if not force_refresh:
            existing = self._cb_store.get_segment_intel(segment_tier)
            if existing:
                return existing
        
        # Get segment config
        segment = self._cb_store.get_segment(segment_tier)
        if not segment:
            raise ValueError(f"Segment {segment_tier} not found")
        
        # Build and execute prompt
        system_prompt, user_prompt = self._build_segment_prompt(segment)
        response, provider, model = self._call_llm(user_prompt, system_prompt)
        
        # Parse response
        intel = self._parse_llm_response(response, segment_tier, provider, model)
        
        # Save to store
        self._cb_store.save_segment_intel(intel)
        
        return intel
    
    def generate_all_segments_intel(self, force_refresh: bool = False) -> dict[str, SegmentMarketIntel]:
        """Generate market intelligence for all segments."""
        config = self._cb_store.get_config()
        results = {}
        
        for segment in config.segments:
            try:
                intel = self.generate_segment_intel(segment.tier, force_refresh)
                results[segment.tier] = intel
            except Exception as e:
                print(f"Error generating intel for {segment.tier}: {e}")
        
        return results
    
    def get_segment_intel(self, segment_tier: str) -> Optional[SegmentMarketIntel]:
        """Get existing segment intel."""
        return self._cb_store.get_segment_intel(segment_tier)
    
    def get_all_segment_intel(self) -> dict[str, SegmentMarketIntel]:
        """Get all existing segment intel."""
        return self._cb_store.get_all_segment_intel()


# Singleton instance
_service_instance: Optional[SegmentResearchService] = None


def get_segment_research_service() -> SegmentResearchService:
    """Get the singleton segment research service."""
    global _service_instance
    if _service_instance is None:
        _service_instance = SegmentResearchService()
    return _service_instance

