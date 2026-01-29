"""Competitive Intelligence service - manages competitors and generates analysis."""

import json
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import httpx

from .models import (
    Competitor, 
    CompetitorCategory, 
    ScrapedWebContent, 
    CompetitiveAnalysis,
)
from .scraper import get_web_scraper
from src.admin.store import admin_store


class CompetitiveIntelService:
    """Service for managing competitors and generating competitive analysis."""
    
    DATA_FILE = "./data/competitors.json"
    ANALYSIS_FILE = "./data/competitive_analyses.json"
    
    # Comcast Business Enterprise URL
    COMCAST_BUSINESS_URL = "https://business.comcast.com/enterprise"
    
    def __init__(self):
        self._competitors: Dict[str, Competitor] = {}
        self._analyses: Dict[str, CompetitiveAnalysis] = {}
        self._comcast_data: Optional[ScrapedWebContent] = None
        self._load_data()
        self._init_default_competitors()
    
    def _load_data(self):
        """Load competitors and analyses from file."""
        os.makedirs(os.path.dirname(self.DATA_FILE), exist_ok=True)
        
        if os.path.exists(self.DATA_FILE):
            try:
                with open(self.DATA_FILE, 'r') as f:
                    data = json.load(f)
                    for c_data in data.get('competitors', []):
                        comp = Competitor(**c_data)
                        self._competitors[comp.id] = comp
                    if data.get('comcast_data'):
                        self._comcast_data = ScrapedWebContent(**data['comcast_data'])
            except Exception as e:
                print(f"Warning: Could not load competitors: {e}")
        
        if os.path.exists(self.ANALYSIS_FILE):
            try:
                with open(self.ANALYSIS_FILE, 'r') as f:
                    data = json.load(f)
                    for a_data in data:
                        analysis = CompetitiveAnalysis(**a_data)
                        self._analyses[analysis.id] = analysis
            except Exception as e:
                print(f"Warning: Could not load analyses: {e}")
    
    def _save_data(self):
        """Save competitors to file."""
        try:
            os.makedirs(os.path.dirname(self.DATA_FILE), exist_ok=True)
            data = {
                'competitors': [c.model_dump(mode='json') for c in self._competitors.values()],
                'comcast_data': self._comcast_data.model_dump(mode='json') if self._comcast_data else None,
            }
            with open(self.DATA_FILE, 'w') as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            print(f"Warning: Could not save competitors: {e}")
    
    def _save_analyses(self):
        """Save analyses to file."""
        try:
            os.makedirs(os.path.dirname(self.ANALYSIS_FILE), exist_ok=True)
            with open(self.ANALYSIS_FILE, 'w') as f:
                json.dump(
                    [a.model_dump(mode='json') for a in self._analyses.values()],
                    f, indent=2, default=str
                )
        except Exception as e:
            print(f"Warning: Could not save analyses: {e}")
    
    def _init_default_competitors(self):
        """Initialize default competitors if none exist."""
        if self._competitors:
            return
        
        defaults = [
            # ═══════════════════════════════════════════════════════════════
            # TELECOMMUNICATIONS (National Carriers)
            # ═══════════════════════════════════════════════════════════════
            Competitor(
                id="comp-att",
                name="AT&T Business",
                ticker="T",
                category=CompetitorCategory.TELCO,
                business_url="https://www.business.att.com/",
            ),
            Competitor(
                id="comp-verizon",
                name="Verizon Business",
                ticker="VZ",
                category=CompetitorCategory.TELCO,
                business_url="https://www.verizon.com/business/",
            ),
            Competitor(
                id="comp-lumen",
                name="Lumen Technologies",
                ticker="LUMN",
                category=CompetitorCategory.TELCO,
                business_url="https://www.lumen.com/en-us/solutions.html",
            ),
            Competitor(
                id="comp-tmobile-business",
                name="T-Mobile for Business",
                ticker="TMUS",
                category=CompetitorCategory.TELCO,
                business_url="https://www.t-mobile.com/business",
            ),
            
            # ═══════════════════════════════════════════════════════════════
            # CABLE PROVIDERS
            # ═══════════════════════════════════════════════════════════════
            Competitor(
                id="comp-spectrum",
                name="Spectrum Enterprise",
                ticker="CHTR",
                category=CompetitorCategory.CABLE,
                business_url="https://enterprise.spectrum.com/",
            ),
            Competitor(
                id="comp-cox",
                name="Cox Business",
                ticker=None,
                category=CompetitorCategory.CABLE,
                business_url="https://www.cox.com/business/",
            ),
            
            # ═══════════════════════════════════════════════════════════════
            # FIBER NETWORK PROVIDERS
            # ═══════════════════════════════════════════════════════════════
            Competitor(
                id="comp-frontier",
                name="Frontier Business",
                ticker="FYBR",
                category=CompetitorCategory.FIBER,
                business_url="https://business.frontier.com/",
            ),
            Competitor(
                id="comp-zayo",
                name="Zayo Group",
                ticker=None,
                category=CompetitorCategory.FIBER,
                business_url="https://www.zayo.com/",
            ),
            Competitor(
                id="comp-cogent",
                name="Cogent Communications",
                ticker="CCOI",
                category=CompetitorCategory.FIBER,
                business_url="https://www.cogentco.com/en/",
            ),
            Competitor(
                id="comp-colt",
                name="Colt Technology Services",
                ticker=None,
                category=CompetitorCategory.FIBER,
                business_url="https://www.colt.net/",
            ),
            
            # ═══════════════════════════════════════════════════════════════
            # CLOUD INTERCONNECTION (Cloud Connectivity)
            # ═══════════════════════════════════════════════════════════════
            Competitor(
                id="comp-equinix",
                name="Equinix",
                ticker="EQIX",
                category=CompetitorCategory.CLOUD_CONNECT,
                business_url="https://www.equinix.com/interconnection-services/equinix-fabric",
            ),
            Competitor(
                id="comp-megaport",
                name="Megaport",
                ticker="MP1.AX",
                category=CompetitorCategory.CLOUD_CONNECT,
                business_url="https://www.megaport.com/",
            ),
            Competitor(
                id="comp-packetfabric",
                name="PacketFabric",
                ticker=None,
                category=CompetitorCategory.CLOUD_CONNECT,
                business_url="https://packetfabric.com/",
            ),
            Competitor(
                id="comp-console-connect",
                name="Console Connect (PCCW)",
                ticker=None,
                category=CompetitorCategory.CLOUD_CONNECT,
                business_url="https://www.consoleconnect.com/",
            ),
            Competitor(
                id="comp-coresite",
                name="CoreSite",
                ticker=None,
                category=CompetitorCategory.CLOUD_CONNECT,
                business_url="https://www.coresite.com/solutions/cloud-services",
            ),
            
            # ═══════════════════════════════════════════════════════════════
            # SD-WAN / SASE PROVIDERS
            # ═══════════════════════════════════════════════════════════════
            Competitor(
                id="comp-cisco-meraki",
                name="Cisco Meraki",
                ticker="CSCO",
                category=CompetitorCategory.SDWAN_SASE,
                business_url="https://meraki.cisco.com/products/sd-wan/",
            ),
            Competitor(
                id="comp-fortinet",
                name="Fortinet",
                ticker="FTNT",
                category=CompetitorCategory.SDWAN_SASE,
                business_url="https://www.fortinet.com/products/sd-wan",
            ),
            Competitor(
                id="comp-palo-alto",
                name="Palo Alto Networks Prisma",
                ticker="PANW",
                category=CompetitorCategory.SDWAN_SASE,
                business_url="https://www.paloaltonetworks.com/sase",
            ),
            Competitor(
                id="comp-zscaler",
                name="Zscaler",
                ticker="ZS",
                category=CompetitorCategory.SDWAN_SASE,
                business_url="https://www.zscaler.com/",
            ),
            Competitor(
                id="comp-cato",
                name="Cato Networks",
                ticker=None,
                category=CompetitorCategory.SDWAN_SASE,
                business_url="https://www.catonetworks.com/",
            ),
            Competitor(
                id="comp-vmware-velocloud",
                name="VMware VeloCloud",
                ticker="VMW",
                category=CompetitorCategory.SDWAN_SASE,
                business_url="https://sase.vmware.com/",
            ),
            Competitor(
                id="comp-versa",
                name="Versa Networks",
                ticker=None,
                category=CompetitorCategory.SDWAN_SASE,
                business_url="https://versa-networks.com/",
            ),
            Competitor(
                id="comp-aruba-edgeconnect",
                name="HPE Aruba EdgeConnect",
                ticker="HPE",
                category=CompetitorCategory.SDWAN_SASE,
                business_url="https://www.arubanetworks.com/products/sd-wan/",
            ),
            
            # ═══════════════════════════════════════════════════════════════
            # MULTI-CLOUD NETWORKING SPECIALISTS
            # ═══════════════════════════════════════════════════════════════
            Competitor(
                id="comp-aviatrix",
                name="Aviatrix",
                ticker=None,
                category=CompetitorCategory.MULTI_CLOUD,
                business_url="https://aviatrix.com/",
            ),
            Competitor(
                id="comp-alkira",
                name="Alkira",
                ticker=None,
                category=CompetitorCategory.MULTI_CLOUD,
                business_url="https://www.alkira.com/",
            ),
            Competitor(
                id="comp-prosimo",
                name="Prosimo",
                ticker=None,
                category=CompetitorCategory.MULTI_CLOUD,
                business_url="https://prosimo.io/",
            ),
            
            # ═══════════════════════════════════════════════════════════════
            # DATA CENTER / COLOCATION
            # ═══════════════════════════════════════════════════════════════
            Competitor(
                id="comp-digital-realty",
                name="Digital Realty",
                ticker="DLR",
                category=CompetitorCategory.DATA_CENTER,
                business_url="https://www.digitalrealty.com/",
            ),
            Competitor(
                id="comp-qts",
                name="QTS Data Centers",
                ticker=None,
                category=CompetitorCategory.DATA_CENTER,
                business_url="https://www.qtsdatacenters.com/",
            ),
            
            # ═══════════════════════════════════════════════════════════════
            # SECURITY PROVIDERS
            # ═══════════════════════════════════════════════════════════════
            Competitor(
                id="comp-cloudflare",
                name="Cloudflare",
                ticker="NET",
                category=CompetitorCategory.SECURITY,
                business_url="https://www.cloudflare.com/enterprise/",
            ),
            Competitor(
                id="comp-crowdstrike",
                name="CrowdStrike",
                ticker="CRWD",
                category=CompetitorCategory.SECURITY,
                business_url="https://www.crowdstrike.com/",
            ),
            
            # ═══════════════════════════════════════════════════════════════
            # UCAAS / CCAAS PROVIDERS
            # ═══════════════════════════════════════════════════════════════
            Competitor(
                id="comp-ringcentral",
                name="RingCentral",
                ticker="RNG",
                category=CompetitorCategory.UCAAS,
                business_url="https://www.ringcentral.com/",
            ),
            Competitor(
                id="comp-zoom",
                name="Zoom",
                ticker="ZM",
                category=CompetitorCategory.UCAAS,
                business_url="https://zoom.us/",
            ),
            Competitor(
                id="comp-8x8",
                name="8x8",
                ticker="EGHT",
                category=CompetitorCategory.UCAAS,
                business_url="https://www.8x8.com/",
            ),
            Competitor(
                id="comp-genesys",
                name="Genesys Cloud",
                ticker=None,
                category=CompetitorCategory.UCAAS,
                business_url="https://www.genesys.com/genesys-cloud",
            ),
            Competitor(
                id="comp-five9",
                name="Five9",
                ticker="FIVN",
                category=CompetitorCategory.UCAAS,
                business_url="https://www.five9.com/",
            ),
        ]
        
        for comp in defaults:
            self._competitors[comp.id] = comp
        
        self._save_data()
    
    # ─────────────────────────────────────────────────────────────────────────
    # Competitor Management
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_competitors(self, active_only: bool = True) -> List[Competitor]:
        """Get all competitors."""
        comps = list(self._competitors.values())
        if active_only:
            comps = [c for c in comps if c.is_active]
        return sorted(comps, key=lambda c: c.name)
    
    def get_competitor(self, competitor_id: str) -> Optional[Competitor]:
        """Get a specific competitor."""
        return self._competitors.get(competitor_id)
    
    def add_competitor(
        self,
        name: str,
        business_url: str,
        ticker: Optional[str] = None,
        category: CompetitorCategory = CompetitorCategory.OTHER,
    ) -> Competitor:
        """Add a new competitor."""
        comp = Competitor(
            name=name,
            business_url=business_url,
            ticker=ticker,
            category=category,
        )
        self._competitors[comp.id] = comp
        self._save_data()
        return comp
    
    def update_competitor(
        self,
        competitor_id: str,
        name: Optional[str] = None,
        business_url: Optional[str] = None,
        category: Optional[CompetitorCategory] = None,
        is_active: Optional[bool] = None,
    ) -> Optional[Competitor]:
        """Update a competitor."""
        comp = self._competitors.get(competitor_id)
        if not comp:
            return None
        
        if name:
            comp.name = name
        if business_url:
            comp.business_url = business_url
        if category:
            comp.category = category
        if is_active is not None:
            comp.is_active = is_active
        
        self._save_data()
        return comp
    
    def delete_competitor(self, competitor_id: str) -> bool:
        """Delete a competitor."""
        if competitor_id in self._competitors:
            del self._competitors[competitor_id]
            self._save_data()
            return True
        return False
    
    # ─────────────────────────────────────────────────────────────────────────
    # Web Scraping
    # ─────────────────────────────────────────────────────────────────────────
    
    def scrape_competitor(self, competitor_id: str, force: bool = False) -> Optional[ScrapedWebContent]:
        """Scrape a competitor's website.
        
        Data is cached indefinitely and only refreshed when force=True.
        """
        comp = self._competitors.get(competitor_id)
        if not comp:
            return None
        
        # Return cached data if available (only refresh when force=True)
        if not force and comp.scraped_content:
            return ScrapedWebContent(**comp.scraped_content)
        
        # Scrape the website
        scraper = get_web_scraper()
        content = scraper.scrape_url(comp.business_url)
        
        # Update competitor record
        comp.last_scraped = datetime.utcnow()
        comp.scraped_content = content.model_dump(mode='json')
        comp.scrape_error = None if "Error" not in content.title else content.main_text
        
        self._save_data()
        return content
    
    def scrape_comcast(self, force: bool = False) -> ScrapedWebContent:
        """Scrape Comcast Business Enterprise website.
        
        Data is cached indefinitely and only refreshed when force=True.
        """
        # Return cached data if available (only refresh when force=True)
        if not force and self._comcast_data:
            return self._comcast_data
        
        scraper = get_web_scraper()
        self._comcast_data = scraper.scrape_url(self.COMCAST_BUSINESS_URL)
        self._save_data()
        return self._comcast_data
    
    def scrape_all(self, force: bool = False) -> Dict[str, ScrapedWebContent]:
        """Scrape all competitors and Comcast."""
        results = {}
        
        # Scrape Comcast first
        results['comcast'] = self.scrape_comcast(force)
        
        # Scrape all active competitors
        for comp in self.get_competitors(active_only=True):
            results[comp.id] = self.scrape_competitor(comp.id, force)
        
        return results
    
    # ─────────────────────────────────────────────────────────────────────────
    # Competitive Analysis
    # ─────────────────────────────────────────────────────────────────────────
    
    def generate_analysis(
        self,
        competitor_ids: List[str],
        refresh_scrape: bool = False,
    ) -> CompetitiveAnalysis:
        """Generate competitive analysis using LLM."""
        # Get LLM config
        llm_config = admin_store.get_active_llm_config()
        if not llm_config:
            raise ValueError("No active LLM provider configured")
        
        # Scrape Comcast
        comcast_data = self.scrape_comcast(refresh_scrape)
        
        # Scrape competitors
        competitor_data = {}
        competitor_names = []
        for comp_id in competitor_ids:
            comp = self.get_competitor(comp_id)
            if comp:
                data = self.scrape_competitor(comp_id, refresh_scrape)
                if data:
                    competitor_data[comp_id] = data
                    competitor_names.append(comp.name)
        
        if not competitor_data:
            raise ValueError("No competitor data available for analysis")
        
        # Build prompt for LLM
        prompt = self._build_analysis_prompt(comcast_data, competitor_data, competitor_names)
        
        # Call LLM
        analysis_text = self._call_llm(
            llm_config.provider.value,
            llm_config.api_key,
            llm_config.model_name,
            prompt,
        )
        
        # Parse and create analysis - match headers from our enhanced prompt
        # Headers used by LLM:
        #   Executive Summary, Product & Service Comparison, Technology & Innovation Comparison,
        #   Pricing & Value Positioning, Market Positioning Analysis, Go-to-Market Strategy Comparison,
        #   Competitive Strengths (Comcast Business), Competitive Weaknesses (Comcast Business),
        #   Competitive Win/Loss Scenarios, Opportunities, Threats, Strategic Recommendations, Key Takeaways
        analysis = CompetitiveAnalysis(
            comcast_data=comcast_data,
            competitor_ids=competitor_ids,
            competitor_data={k: v.model_dump() for k, v in competitor_data.items()},
            llm_provider=llm_config.provider.value,
            llm_model=llm_config.model_name,
            executive_summary=self._extract_section(analysis_text, "Executive Summary"),
            strengths_weaknesses={
                "strengths": self._extract_list(analysis_text, r"Competitive Strengths.*"),
                "weaknesses": self._extract_list(analysis_text, r"Competitive Weaknesses.*"),
            },
            product_comparison=self._extract_section(analysis_text, r"Product.*Service Comparison"),
            pricing_insights=self._extract_section(analysis_text, r"Pricing.*Value Positioning"),
            market_positioning=self._extract_section(analysis_text, r"Market Positioning.*"),
            recommendations=self._extract_list(analysis_text, r"Strategic Recommendations"),
            opportunities=self._extract_list(analysis_text, r"Opportunities"),
            threats=self._extract_list(analysis_text, r"Threats"),
            full_analysis=analysis_text,
        )
        
        # Save analysis
        self._analyses[analysis.id] = analysis
        self._save_analyses()
        
        return analysis
    
    def _build_analysis_prompt(
        self,
        comcast_data: ScrapedWebContent,
        competitor_data: Dict[str, ScrapedWebContent],
        competitor_names: List[str],
    ) -> str:
        """Build the prompt for competitive analysis."""
        
        # Comcast Business strategic context
        comcast_context = """
COMCAST BUSINESS ENTERPRISE - STRATEGIC CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Strategic Goal: Grow enterprise segment from 14% to 15% annual growth over 5 years
• Target Customers: Businesses billing $1,500+/month (enterprise tier, up to $3M/month)
• Current Revenue: ~$3 billion/year in enterprise segment (part of $10.5B total)
• Key Service Areas: Connectivity, Secure Networking, Cybersecurity, Data Center Connections
• Operating Model Evolution: Transitioning to AI-enabled GTM, Delivery, and Support by 2028
• Systems: Dynamics CRM, Orion CPQ, ServiceNow ticketing, Google IVR contact center
• Competitive Position: Strong regional cable footprint, growing national enterprise presence
"""
        
        # Summarize Comcast scraped data
        comcast_summary = f"""
COMCAST BUSINESS ENTERPRISE - WEBSITE DATA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URL: {comcast_data.url}
Title: {comcast_data.title}
Products/Services: {', '.join(comcast_data.products[:10]) if comcast_data.products else 'Not extracted'}
Key Features: {', '.join(comcast_data.features[:10]) if comcast_data.features else 'Not extracted'}
Target Segments: {', '.join(comcast_data.target_segments) if comcast_data.target_segments else 'Enterprise businesses'}
Differentiators: {', '.join(comcast_data.key_differentiators) if comcast_data.key_differentiators else 'Not extracted'}

Website Content:
{comcast_data.main_text[:2500]}
"""
        
        # Summarize competitor data
        competitor_summaries = []
        for comp_id, data in competitor_data.items():
            comp = self.get_competitor(comp_id)
            name = comp.name if comp else comp_id
            ticker = f" ({comp.ticker})" if comp and comp.ticker else ""
            category = comp.category.value.upper() if comp else "UNKNOWN"
            
            summary = f"""
{name.upper()}{ticker} - [{category}]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URL: {data.url}
Title: {data.title}
Products/Services: {', '.join(data.products[:10]) if data.products else 'Not extracted'}
Key Features: {', '.join(data.features[:10]) if data.features else 'Not extracted'}
Target Segments: {', '.join(data.target_segments) if data.target_segments else 'Not extracted'}
Differentiators: {', '.join(data.key_differentiators) if data.key_differentiators else 'Not extracted'}

Website Content:
{data.main_text[:1800]}
"""
            competitor_summaries.append(summary)
        
        prompt = f"""You are a senior strategy consultant with 20+ years of experience in telecommunications, enterprise technology, and B2B services. You specialize in competitive intelligence for cable/telco companies serving enterprise customers.

Your expertise includes:
• Network services (fiber, SD-WAN, SASE, dedicated internet)
• Managed security services and cybersecurity
• Unified communications and collaboration (UCaaS, CCaaS)
• Data center and cloud connectivity
• Enterprise sales and go-to-market strategies

You are preparing a competitive analysis for C-level executives at Comcast Business.

═══════════════════════════════════════════════════════════════════════════════
ANALYSIS REQUEST
═══════════════════════════════════════════════════════════════════════════════

Analyze Comcast Business Enterprise against these competitors: {', '.join(competitor_names)}.

{comcast_context}

{comcast_summary}

═══════════════════════════════════════════════════════════════════════════════
COMPETITOR DATA
═══════════════════════════════════════════════════════════════════════════════
{''.join(competitor_summaries)}

═══════════════════════════════════════════════════════════════════════════════
REQUIRED ANALYSIS SECTIONS
═══════════════════════════════════════════════════════════════════════════════

Please provide a comprehensive competitive analysis with the following sections:

## Executive Summary
Provide a 4-5 sentence executive overview that a CEO could read in 30 seconds:
• Comcast Business's current competitive position
• Key competitive dynamics in the enterprise connectivity market
• Primary strategic implication for the 15% growth target

## Product & Service Comparison
Create a detailed comparison covering:
• Core connectivity offerings (fiber, dedicated internet, SD-WAN)
• Security and managed services portfolio
• Voice/UCaaS and collaboration tools
• Gaps in Comcast's portfolio vs competitors
• Overlapping offerings where differentiation is needed

## Technology & Innovation Comparison
Compare AI/automation capabilities, network technology investments, and digital transformation offerings. Note any emerging technology advantages.

## Pricing & Value Positioning
Analyze:
• Observed pricing strategies (premium, value, aggressive)
• Bundling approaches
• Contract/commitment models mentioned
• Value proposition messaging differences

## Market Positioning Analysis
For each company, describe:
• Target customer profile and segments
• Key industries targeted (healthcare, retail, manufacturing, financial services)
• Geographic focus (national, regional, local)
• Brand positioning and messaging themes

## Go-to-Market Strategy Comparison
Compare:
• Sales channel approaches (direct, partner, digital)
• Partner ecosystem emphasis
• Customer acquisition messaging
• Self-service vs high-touch models

## Competitive Strengths (Comcast Business)
List 5-7 specific strengths where Comcast Business outperforms competitors. Be specific with evidence from the data.

## Competitive Weaknesses (Comcast Business)
List 5-7 areas where competitors have clear advantages. Be candid - this analysis is for internal strategy.

## Competitive Win/Loss Scenarios
Identify:
• 3 scenarios where Comcast Business would likely WIN deals
• 3 scenarios where competitors have the advantage
• Key decision factors that swing enterprise deals

## Opportunities
Provide 5 specific, actionable opportunities to capture market share:
For each opportunity, include:
• Description of the opportunity
• Target customer segment
• Impact potential (High/Medium/Low)
• Time to implement (Short <6mo, Medium 6-18mo, Long 18mo+)

## Threats
Provide 5 competitive threats to monitor:
For each threat, include:
• Description of the threat
• Which competitor(s) pose this threat
• Severity (Critical/High/Medium)
• Recommended defensive action

## Strategic Recommendations
Provide 7 prioritized recommendations for Comcast Business leadership:
For each recommendation:
1. [Priority Rank] **Recommendation Title**
   - Action: Specific action to take
   - Rationale: Why this matters for the 15% growth target
   - Success Metric: How to measure success
   - Complexity: (Low/Medium/High)

## Key Takeaways
Provide 3-5 bullet points summarizing the most critical insights for leadership.

═══════════════════════════════════════════════════════════════════════════════

Be specific, cite observations from the scraped data, and provide actionable insights worthy of a top-tier consulting firm like BCG or McKinsey. Focus on implications for achieving the 15% annual growth target in the enterprise segment."""

        return prompt
    
    def _call_llm(self, provider: str, api_key: str, model: str, prompt: str) -> str:
        """Call the LLM API."""
        if provider == "openai":
            return self._call_openai(api_key, model, prompt)
        elif provider == "xai":
            return self._call_xai(api_key, model, prompt)
        elif provider == "anthropic":
            return self._call_anthropic(api_key, model, prompt)
        else:
            raise ValueError(f"Unknown provider: {provider}")
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for competitive analysis."""
        return """You are a senior strategy consultant with 20+ years of experience advising Fortune 500 companies in telecommunications, enterprise technology, and B2B services.

Your expertise includes:
• Deep knowledge of the enterprise connectivity market (fiber, SD-WAN, SASE, dedicated internet)
• Managed security services, SIEM, SOC operations, and cybersecurity
• Unified communications (UCaaS), contact center (CCaaS), and collaboration platforms
• Data center connectivity, cloud on-ramps, and hybrid cloud networking
• Enterprise sales strategies, channel partnerships, and go-to-market optimization

You have worked extensively with cable MSOs, incumbent telcos, and technology companies serving enterprise customers. Your analysis is always:
• Data-driven and evidence-based
• Actionable with clear strategic implications
• Candid about competitive weaknesses
• Focused on revenue growth and market share capture
• Worthy of presentation to C-level executives

Format your responses with clear headers, bullet points, and structured insights that executives can quickly scan and act upon."""

    def _call_openai(self, api_key: str, model: str, prompt: str) -> str:
        """Call OpenAI API."""
        with httpx.Client(timeout=180.0) as client:
            response = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": self._get_system_prompt()},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 8000,
                    "temperature": 0.7,
                }
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
    
    def _call_xai(self, api_key: str, model: str, prompt: str) -> str:
        """Call xAI (Grok) API."""
        with httpx.Client(timeout=240.0) as client:
            response = client.post(
                "https://api.x.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": self._get_system_prompt()},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 8000,
                    "temperature": 0.7,
                }
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
    
    def _call_anthropic(self, api_key: str, model: str, prompt: str) -> str:
        """Call Anthropic API."""
        with httpx.Client(timeout=240.0) as client:
            response = client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "Content-Type": "application/json",
                    "anthropic-version": "2024-01-01",
                },
                json={
                    "model": model,
                    "max_tokens": 8000,
                    "system": self._get_system_prompt(),
                    "messages": [{"role": "user", "content": prompt}],
                }
            )
            response.raise_for_status()
            return response.json()["content"][0]["text"]
    
    def _extract_section(self, text: str, header: str) -> str:
        """Extract a section from the analysis text."""
        import re
        pattern = rf"##\s*{header}[^\n]*\n(.*?)(?=##|\Z)"
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        return match.group(1).strip() if match else ""
    
    def _extract_list(self, text: str, header: str) -> List[str]:
        """Extract a list from a section, grouping multi-line entries."""
        import re
        section = self._extract_section(text, header)
        if not section:
            return []
        
        # Check if this is a structured recommendations section with numbered headers
        # Pattern: **[1] Title** or 1. **Title** or [1] Title
        numbered_pattern = re.compile(r'^(?:\*\*\[(\d+)\]|\[(\d+)\]|(\d+)[.)]\s*\*?\*?)')
        
        lines = section.split('\n')
        items = []
        current_item_lines = []
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            
            # Check if this line starts a new numbered entry
            is_new_entry = numbered_pattern.match(stripped)
            
            if is_new_entry:
                # Save previous item if exists
                if current_item_lines:
                    items.append('\n'.join(current_item_lines))
                current_item_lines = [stripped]
            elif current_item_lines:
                # Continuation of current item
                current_item_lines.append(stripped)
            else:
                # Simple bullet point (not multi-line)
                if stripped.startswith(('-', '*', '•')):
                    item = stripped.lstrip('-*•').strip()
                    if item:
                        items.append(item)
        
        # Don't forget the last item
        if current_item_lines:
            items.append('\n'.join(current_item_lines))
        
        return items
    
    def get_analyses(self, limit: int = 10) -> List[CompetitiveAnalysis]:
        """Get recent analyses."""
        analyses = sorted(
            self._analyses.values(),
            key=lambda a: a.created_at,
            reverse=True
        )
        return analyses[:limit]
    
    def get_analysis(self, analysis_id: str) -> Optional[CompetitiveAnalysis]:
        """Get a specific analysis."""
        return self._analyses.get(analysis_id)


# Singleton
_service: Optional[CompetitiveIntelService] = None


def get_competitive_intel_service() -> CompetitiveIntelService:
    """Get the singleton CompetitiveIntelService instance."""
    global _service
    if _service is None:
        _service = CompetitiveIntelService()
    return _service

