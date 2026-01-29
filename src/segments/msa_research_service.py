"""LLM-powered MSA market research and sales resource planning service."""

import json
import re
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from src.admin.store import AdminConfigStore


class ProductOpportunity(BaseModel):
    """Market opportunity for a specific product category."""
    product_category: str
    tam_usd: float = 0  # Total addressable market
    sam_usd: float = 0  # Serviceable addressable market
    current_penetration_pct: float = 0
    growth_rate_cagr: str = ""
    competitive_intensity: str = ""  # low, medium, high
    key_competitors: List[str] = Field(default_factory=list)
    recommended_focus: str = ""  # primary, secondary, emerging, opportunistic


class SalesResourceRecommendation(BaseModel):
    """LLM-generated sales resource recommendation for an MSA."""
    # Inside Sales
    recommended_sdr_count: int = 0
    recommended_bdr_count: int = 0
    recommended_inside_ae_count: int = 0
    recommended_inside_am_count: int = 0
    
    # Field Sales
    recommended_field_ae_count: int = 0
    recommended_field_am_count: int = 0
    recommended_strategic_ae_count: int = 0
    recommended_major_am_count: int = 0
    
    # Specialists
    recommended_se_count: int = 0
    recommended_partner_mgr_count: int = 0
    recommended_sales_mgr_count: int = 0
    
    # Quotas
    recommended_total_quota_usd: float = 0
    recommended_new_logo_quota_usd: float = 0
    recommended_expansion_quota_usd: float = 0
    
    # Rationale
    headcount_rationale: str = ""
    quota_methodology: str = ""
    territory_structure: str = ""


class MSAMarketIntel(BaseModel):
    """LLM-generated market intelligence for an MSA."""
    id: str
    msa_code: str
    msa_name: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    llm_provider: str = ""
    llm_model: str = ""
    
    # Executive Summary
    executive_summary: str = ""
    market_dynamics: str = ""
    
    # Market Sizing
    total_enterprise_tam_usd: float = 0
    total_enterprise_sam_usd: float = 0
    tam_methodology: str = ""
    
    # Product Opportunities (full CB portfolio)
    product_opportunities: List[ProductOpportunity] = Field(default_factory=list)
    
    # Connectivity specifics
    broadband_opportunity: str = ""
    ethernet_opportunity: str = ""
    fixed_wireless_opportunity: str = ""
    mobile_enterprise_opportunity: str = ""  # Coming soon
    
    # Secure Networking
    sdwan_sase_opportunity: str = ""
    cybersecurity_opportunity: str = ""
    
    # Voice & Collaboration
    ucaas_ccaas_opportunity: str = ""
    
    # Competitive Landscape
    competitive_overview: str = ""
    primary_competitors: List[str] = Field(default_factory=list)
    cb_competitive_position: str = ""
    competitive_strengths: List[str] = Field(default_factory=list)
    competitive_gaps: List[str] = Field(default_factory=list)
    
    # Sales Resource Planning
    sales_resource_recommendation: SalesResourceRecommendation = Field(
        default_factory=SalesResourceRecommendation
    )
    recommended_sales_motion_mix: Dict[str, float] = Field(default_factory=dict)
    
    # Growth Strategy
    growth_priorities: List[Dict[str, Any]] = Field(default_factory=list)
    quick_wins: List[str] = Field(default_factory=list)
    long_term_plays: List[str] = Field(default_factory=list)
    
    # Industry Verticals in MSA
    top_verticals: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Sources
    sources: List[str] = Field(default_factory=list)
    data_freshness: str = ""


class MSAResearchService:
    """Service for generating LLM-powered MSA market intelligence."""
    
    def __init__(self):
        self._admin_store = AdminConfigStore()
        self._intel_cache: Dict[str, MSAMarketIntel] = {}
    
    def _get_llm_client(self):
        """Get configured LLM client."""
        active_provider = self._admin_store.get_active_llm_config()
        
        if not active_provider or not active_provider.api_key:
            raise ValueError("No active LLM provider configured. Please configure an API key in Admin Setup.")
        
        return active_provider
    
    def _call_llm(self, prompt: str, system_prompt: str) -> tuple[str, str, str]:
        """Call the configured LLM and return response, provider, model."""
        provider_config = self._get_llm_client()
        
        if provider_config.provider == "xai":
            import httpx
            
            model = provider_config.get_default_model() or "grok-4-1-fast-reasoning"
            
            with httpx.Client(timeout=300.0) as client:
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
                        "max_tokens": 10000,
                        "temperature": 0.7,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"], provider_config.provider.value, model
        
        elif provider_config.provider == "openai":
            import httpx
            
            model = provider_config.get_default_model() or "gpt-4-turbo-preview"
            
            with httpx.Client(timeout=300.0) as client:
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
                        "max_tokens": 10000,
                        "temperature": 0.7,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"], provider_config.provider.value, model
        
        elif provider_config.provider == "anthropic":
            import httpx
            
            model = provider_config.get_default_model() or "claude-3-opus-20240229"
            
            with httpx.Client(timeout=300.0) as client:
                response = client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": provider_config.api_key,
                        "Content-Type": "application/json",
                        "anthropic-version": "2023-06-01",
                    },
                    json={
                        "model": model,
                        "max_tokens": 10000,
                        "system": system_prompt,
                        "messages": [
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.7,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data["content"][0]["text"], provider_config.provider.value, model
        
        else:
            raise ValueError(f"Unsupported LLM provider: {provider_config.provider}")

    def generate_msa_intel(
        self,
        msa_code: str,
        msa_name: str,
        region: str,
        population: int,
        establishments: int,
        has_fiber: bool,
        has_coax: bool,
        comcast_coverage_pct: float,
        current_arr: float = 0,
        cb_internal_data: Optional[Dict[str, Any]] = None,
    ) -> MSAMarketIntel:
        """
        Generate comprehensive market intelligence for an MSA using LLM.
        
        Args:
            msa_code: CBSA code
            msa_name: Full MSA name
            region: Geographic region
            population: 2023 population estimate
            establishments: Enterprise establishment count
            has_fiber: Whether Comcast has fiber in this market
            has_coax: Whether Comcast has coax in this market
            comcast_coverage_pct: Comcast footprint coverage percentage
            current_arr: Current Comcast Business ARR in this MSA (if known)
            cb_internal_data: Optional internal CB data to enhance analysis
        """
        
        # Build internal data context if available
        internal_context = ""
        if cb_internal_data:
            internal_context = f"""
            
COMCAST BUSINESS INTERNAL DATA (Confidential - use to enhance analysis):
- Current Account Count: {cb_internal_data.get('account_count', 'N/A')}
- Current ARR: ${cb_internal_data.get('arr', 0):,.0f}
- Product Mix: {cb_internal_data.get('product_mix', 'N/A')}
- Win Rate: {cb_internal_data.get('win_rate', 'N/A')}%
- Avg Deal Size: ${cb_internal_data.get('avg_deal_size', 0):,.0f}
- Current Headcount: {cb_internal_data.get('headcount', 'N/A')}
- Top Verticals: {cb_internal_data.get('top_verticals', 'N/A')}
- Churn Rate: {cb_internal_data.get('churn_rate', 'N/A')}%
"""

        system_prompt = """You are an expert telecommunications market analyst and sales operations strategist with 25+ years of experience. You specialize in enterprise B2B telecommunications, connectivity, and managed services.

Your task is to generate comprehensive market intelligence and sales resource planning recommendations for a specific US Metropolitan Statistical Area (MSA) for Comcast Business Enterprise.

COMCAST BUSINESS ENTERPRISE PORTFOLIO (Consider ALL products):

1. CONNECTIVITY
   - Business Internet (Coax/HFC): 25Mbps to 1Gbps, best for SMB
   - Fiber Internet: 100Mbps to 100Gbps, for mid-market and enterprise
   - Ethernet Dedicated Internet (EDI): Symmetrical, SLA-backed
   - Ethernet Private Line (EPL): Point-to-point dedicated
   - Ethernet Virtual Private Line (EVPL): Multi-point connectivity
   - Fixed Wireless Access: Emerging, for hard-to-reach locations
   - Mobile for Enterprise: COMING IN 2026 - 5G enterprise mobile plans

2. SECURE NETWORKING
   - SD-WAN: Managed SD-WAN solutions (partners: VMware, Fortinet, Cisco Meraki)
   - SASE: Secure Access Service Edge (cloud-delivered security)
   - Managed Router/Firewall services

3. CYBERSECURITY
   - SecurityEdge: DNS-based threat protection
   - Advanced Threat Protection
   - DDoS Mitigation
   - Managed Detection & Response (MDR)

4. VOICE & COLLABORATION
   - Business VoiceEdge (UCaaS): Cloud-based unified communications
   - SIP Trunking: For on-premises PBX
   - Contact Center as a Service (CCaaS)
   - Microsoft Teams Integration

5. DATA CENTER & CLOUD
   - Colocation services
   - Cloud connectivity (AWS, Azure, GCP direct connect)
   - Disaster Recovery as a Service

SALES RESOURCE PLANNING FRAMEWORK:

Rep Types and Typical Coverage:
- SDR (Sales Development Rep): Outbound prospecting, 200-300 accounts
- BDR (Business Development Rep): Inbound qualification, 150-200 leads/month
- Inside AE (Account Executive): Phone/video sales, $1.5K-$25K MRR deals, 50-75 accounts
- Inside AM (Account Manager): Retention/upsell for inside accounts, 75-100 accounts
- Field AE: In-person sales, $10K-$100K MRR deals, 25-40 accounts
- Field AM: Strategic retention, 30-50 accounts
- Strategic AE: Named enterprise accounts, $100K+ MRR, 8-15 accounts
- Major AM: Major account retention, 10-20 accounts
- SE (Sales Engineer): Technical support for complex deals, 3-5 reps per SE
- Partner Manager: Channel/agent relationships, territory-based
- Sales Manager: 8-12 direct reports

Quota Guidelines (annual):
- Inside AE: $400K-$600K new ARR
- Field AE: $800K-$1.2M new ARR
- Strategic AE: $2M-$4M new ARR
- AM roles: 105-110% of book retention + 20-30% expansion

Your output must be valid JSON matching the schema provided."""

        user_prompt = f"""Generate comprehensive market intelligence and sales resource planning for:

MSA: {msa_name}
CBSA Code: {msa_code}
Region: {region}
Population (2023): {population:,}
Enterprise Establishments: {establishments:,}

COMCAST INFRASTRUCTURE IN THIS MARKET:
- Fiber Available: {'Yes' if has_fiber else 'No'}
- Coax/HFC Available: {'Yes' if has_coax else 'No'}
- Estimated Coverage: {comcast_coverage_pct}%
- Current ARR (if known): ${current_arr:,.0f}
{internal_context}

Research and provide analysis as a JSON object with these fields:

{{
  "executive_summary": "2-3 paragraph executive summary of the MSA opportunity, market dynamics, and strategic priorities for Comcast Business",
  
  "market_dynamics": "Analysis of key market trends, economic drivers, and industry composition in this MSA",
  
  "total_enterprise_tam_usd": <number - Total addressable market for all enterprise telecom/connectivity in this MSA>,
  "total_enterprise_sam_usd": <number - Serviceable addressable market within Comcast footprint>,
  "tam_methodology": "Explain how you estimated TAM/SAM with sources",
  
  "product_opportunities": [
    {{
      "product_category": "Broadband Internet",
      "tam_usd": <number>,
      "sam_usd": <number>,
      "current_penetration_pct": <number - estimate CB market share>,
      "growth_rate_cagr": "X-Y%",
      "competitive_intensity": "low|medium|high",
      "key_competitors": ["competitor1", "competitor2"],
      "recommended_focus": "primary|secondary|emerging|opportunistic"
    }},
    // Include entries for: Broadband, Ethernet/Dedicated, Fixed Wireless, Mobile Enterprise, SD-WAN/SASE, Cybersecurity, UCaaS/CCaaS, Data Center
  ],
  
  "broadband_opportunity": "Detailed analysis of broadband (coax/fiber) opportunity in this MSA",
  "ethernet_opportunity": "Detailed analysis of Ethernet/dedicated connectivity opportunity",
  "fixed_wireless_opportunity": "Analysis of fixed wireless potential - terrain, coverage gaps, use cases",
  "mobile_enterprise_opportunity": "Analysis of upcoming mobile opportunity - enterprise mobility needs, 5G potential",
  
  "sdwan_sase_opportunity": "Analysis of SD-WAN and SASE opportunity - multi-location businesses, cloud adoption",
  "cybersecurity_opportunity": "Analysis of managed security opportunity - threat landscape, compliance requirements",
  
  "ucaas_ccaas_opportunity": "Analysis of voice/collaboration opportunity - contact centers, UCaaS migration",
  
  "competitive_overview": "Overview of competitive landscape in this MSA",
  "primary_competitors": ["List 3-5 main competitors"],
  "cb_competitive_position": "Comcast Business's competitive position and differentiation in this market",
  "competitive_strengths": ["List 3-5 CB strengths in this market"],
  "competitive_gaps": ["List 2-3 areas where competitors have advantage"],
  
  "sales_resource_recommendation": {{
    "recommended_sdr_count": <number>,
    "recommended_bdr_count": <number>,
    "recommended_inside_ae_count": <number>,
    "recommended_inside_am_count": <number>,
    "recommended_field_ae_count": <number>,
    "recommended_field_am_count": <number>,
    "recommended_strategic_ae_count": <number>,
    "recommended_major_am_count": <number>,
    "recommended_se_count": <number>,
    "recommended_partner_mgr_count": <number>,
    "recommended_sales_mgr_count": <number>,
    "recommended_total_quota_usd": <number - total annual quota>,
    "recommended_new_logo_quota_usd": <number - new business quota>,
    "recommended_expansion_quota_usd": <number - expansion/upsell quota>,
    "headcount_rationale": "Explain why these headcount numbers based on market size, coverage, and opportunity",
    "quota_methodology": "Explain quota calculation methodology",
    "territory_structure": "Recommended territory structure (geographic, vertical, named accounts)"
  }},
  
  "recommended_sales_motion_mix": {{
    "digital_self_serve": <percentage 0-100>,
    "inside_sales": <percentage 0-100>,
    "field_sales": <percentage 0-100>,
    "strategic_named": <percentage 0-100>,
    "partner_channel": <percentage 0-100>
  }},
  
  "growth_priorities": [
    {{
      "priority": "e.g., Fiber Penetration",
      "rationale": "Why this is a priority",
      "target_segment": "Which segment to focus on",
      "estimated_impact_arr": <number>,
      "timeline": "Q1-Q2 2026"
    }}
  ],
  
  "quick_wins": ["List 3-5 quick win opportunities that can be executed in 90 days"],
  "long_term_plays": ["List 2-3 strategic long-term initiatives"],
  
  "top_verticals": [
    {{
      "vertical": "e.g., Healthcare",
      "establishment_count": <number>,
      "spend_potential_usd": <number>,
      "key_needs": ["need1", "need2"],
      "recommended_approach": "How to target this vertical"
    }}
  ],
  
  "sources": ["List 5-8 credible sources used - include specific reports, year, and data points. e.g., 'US Census Bureau CBSA 2023', 'Gartner Enterprise Network Services 2025', 'IDC SD-WAN Market Forecast 2025'"],
  
  "data_freshness": "Statement about data currency and any limitations"
}}

Be specific, quantitative, and actionable. Use realistic market sizing based on the MSA's characteristics.
Ensure sales resource recommendations align with the market opportunity and Comcast's coverage in this MSA.
"""

        try:
            llm_response_content, llm_provider, llm_model = self._call_llm(user_prompt, system_prompt)
            
            # Clean the response
            cleaned_response = re.search(r"```json\n(.*)```", llm_response_content, re.DOTALL)
            if cleaned_response:
                json_content = cleaned_response.group(1)
            else:
                json_content = llm_response_content

            data = json.loads(json_content)
            
            # Parse product opportunities
            product_opps = []
            for opp in data.get("product_opportunities", []):
                product_opps.append(ProductOpportunity(
                    product_category=opp.get("product_category", ""),
                    tam_usd=float(opp.get("tam_usd", 0)),
                    sam_usd=float(opp.get("sam_usd", 0)),
                    current_penetration_pct=float(opp.get("current_penetration_pct", 0)),
                    growth_rate_cagr=opp.get("growth_rate_cagr", ""),
                    competitive_intensity=opp.get("competitive_intensity", "medium"),
                    key_competitors=opp.get("key_competitors", []),
                    recommended_focus=opp.get("recommended_focus", "secondary"),
                ))
            
            # Parse sales resource recommendation
            sr_data = data.get("sales_resource_recommendation", {})
            sales_rec = SalesResourceRecommendation(
                recommended_sdr_count=int(sr_data.get("recommended_sdr_count", 0)),
                recommended_bdr_count=int(sr_data.get("recommended_bdr_count", 0)),
                recommended_inside_ae_count=int(sr_data.get("recommended_inside_ae_count", 0)),
                recommended_inside_am_count=int(sr_data.get("recommended_inside_am_count", 0)),
                recommended_field_ae_count=int(sr_data.get("recommended_field_ae_count", 0)),
                recommended_field_am_count=int(sr_data.get("recommended_field_am_count", 0)),
                recommended_strategic_ae_count=int(sr_data.get("recommended_strategic_ae_count", 0)),
                recommended_major_am_count=int(sr_data.get("recommended_major_am_count", 0)),
                recommended_se_count=int(sr_data.get("recommended_se_count", 0)),
                recommended_partner_mgr_count=int(sr_data.get("recommended_partner_mgr_count", 0)),
                recommended_sales_mgr_count=int(sr_data.get("recommended_sales_mgr_count", 0)),
                recommended_total_quota_usd=float(sr_data.get("recommended_total_quota_usd", 0)),
                recommended_new_logo_quota_usd=float(sr_data.get("recommended_new_logo_quota_usd", 0)),
                recommended_expansion_quota_usd=float(sr_data.get("recommended_expansion_quota_usd", 0)),
                headcount_rationale=sr_data.get("headcount_rationale", ""),
                quota_methodology=sr_data.get("quota_methodology", ""),
                territory_structure=sr_data.get("territory_structure", ""),
            )
            
            intel = MSAMarketIntel(
                id=f"msa-intel-{msa_code}-{uuid.uuid4().hex[:8]}",
                msa_code=msa_code,
                msa_name=msa_name,
                generated_at=datetime.utcnow(),
                llm_provider=llm_provider,
                llm_model=llm_model,
                executive_summary=data.get("executive_summary", ""),
                market_dynamics=data.get("market_dynamics", ""),
                total_enterprise_tam_usd=float(data.get("total_enterprise_tam_usd", 0)),
                total_enterprise_sam_usd=float(data.get("total_enterprise_sam_usd", 0)),
                tam_methodology=data.get("tam_methodology", ""),
                product_opportunities=product_opps,
                broadband_opportunity=data.get("broadband_opportunity", ""),
                ethernet_opportunity=data.get("ethernet_opportunity", ""),
                fixed_wireless_opportunity=data.get("fixed_wireless_opportunity", ""),
                mobile_enterprise_opportunity=data.get("mobile_enterprise_opportunity", ""),
                sdwan_sase_opportunity=data.get("sdwan_sase_opportunity", ""),
                cybersecurity_opportunity=data.get("cybersecurity_opportunity", ""),
                ucaas_ccaas_opportunity=data.get("ucaas_ccaas_opportunity", ""),
                competitive_overview=data.get("competitive_overview", ""),
                primary_competitors=data.get("primary_competitors", []),
                cb_competitive_position=data.get("cb_competitive_position", ""),
                competitive_strengths=data.get("competitive_strengths", []),
                competitive_gaps=data.get("competitive_gaps", []),
                sales_resource_recommendation=sales_rec,
                recommended_sales_motion_mix=data.get("recommended_sales_motion_mix", {}),
                growth_priorities=data.get("growth_priorities", []),
                quick_wins=data.get("quick_wins", []),
                long_term_plays=data.get("long_term_plays", []),
                top_verticals=data.get("top_verticals", []),
                sources=data.get("sources", []),
                data_freshness=data.get("data_freshness", ""),
            )
            
            # Cache the intel
            self._intel_cache[msa_code] = intel
            
            return intel
        
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
            print(f"LLM Response: {llm_response_content}")
            raise ValueError(f"Failed to parse LLM response as JSON: {e}")
        except Exception as e:
            print(f"Error generating MSA intel: {e}")
            raise
    
    def get_cached_intel(self, msa_code: str) -> Optional[MSAMarketIntel]:
        """Get cached intel for an MSA."""
        return self._intel_cache.get(msa_code)
    
    def get_all_cached_intel(self) -> Dict[str, MSAMarketIntel]:
        """Get all cached intel."""
        return self._intel_cache.copy()


# Singleton instance
_msa_research_service: Optional[MSAResearchService] = None


def get_msa_research_service() -> MSAResearchService:
    """Get the singleton MSA research service instance."""
    global _msa_research_service
    if _msa_research_service is None:
        _msa_research_service = MSAResearchService()
    return _msa_research_service

