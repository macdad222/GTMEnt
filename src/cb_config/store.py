"""Persistent store for Comcast Business configuration data."""

import json
import os
from datetime import datetime
from typing import Optional, List
from pathlib import Path

from .models import (
    CBConfiguration,
    CompanyMetrics,
    SegmentConfig,
    GrowthDataPoint,
    SegmentMarketIntel,
    ProductConfig,
    SalesCapacityConfig,
    NationalSalesCapacity,
    RepTypeQuota,
    MSASalesOverride,
)


class CBConfigStore:
    """Store for CB configuration with file persistence."""
    
    _instance: Optional["CBConfigStore"] = None
    
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
        self._config_file = self._data_dir / "cb_config.json"
        self._intel_file = self._data_dir / "segment_intel.json"
        
        self._data_dir.mkdir(parents=True, exist_ok=True)
        
        self._config: CBConfiguration = self._load_config()
        self._segment_intel: dict[str, SegmentMarketIntel] = self._load_intel()
    
    def _build_default_config(self) -> CBConfiguration:
        """Build default CB configuration with standard enterprise segments."""
        default_segments = [
            SegmentConfig(
                tier="tier_e1",
                label="E1 - Enterprise Mid-Market: $1.5k–$10k MRR",
                description="Entry enterprise: small multi-site or single large site",
                mrr_min=1500,
                mrr_max=10000,
                accounts=12500,
                arr=450_000_000,
                avg_mrr=3000,
                growth_potential=0.72,
                churn_risk=0.18,
                attach_opportunity=0.65,
                typical_industries=["Retail", "Healthcare Clinics", "Professional Services", "Restaurants"],
                key_products=["Business Internet", "Voice", "Basic Security"],
                sales_motion="digital-led",
            ),
            SegmentConfig(
                tier="tier_e2",
                label="E2 - Enterprise Small: $10k–$50k MRR",
                description="Small enterprise: regional multi-site operations",
                mrr_min=10000,
                mrr_max=50000,
                accounts=4200,
                arr=720_000_000,
                avg_mrr=14286,
                growth_potential=0.78,
                churn_risk=0.12,
                attach_opportunity=0.58,
                typical_industries=["Regional Retail", "Healthcare Networks", "Financial Services", "Manufacturing"],
                key_products=["Ethernet", "SD-WAN", "Managed Security", "Voice"],
                sales_motion="inside-sales",
            ),
            SegmentConfig(
                tier="tier_e3",
                label="E3 - Enterprise Medium: $50k–$250k MRR",
                description="Medium enterprise: national presence",
                mrr_min=50000,
                mrr_max=250000,
                accounts=1100,
                arr=850_000_000,
                avg_mrr=64394,
                growth_potential=0.68,
                churn_risk=0.08,
                attach_opportunity=0.45,
                typical_industries=["National Retail", "Healthcare Systems", "Regional Banks", "Enterprise Manufacturing"],
                key_products=["Managed SD-WAN", "SASE", "Ethernet Transport", "Managed Services"],
                sales_motion="field-sales",
            ),
            SegmentConfig(
                tier="tier_e4",
                label="E4 - Enterprise Large: $250k–$1M MRR",
                description="Large enterprise: significant national/global footprint",
                mrr_min=250000,
                mrr_max=1000000,
                accounts=280,
                arr=620_000_000,
                avg_mrr=184524,
                growth_potential=0.55,
                churn_risk=0.05,
                attach_opportunity=0.32,
                typical_industries=["Fortune 1000", "National Banks", "Large Healthcare", "Federal Contractors"],
                key_products=["Enterprise SD-WAN", "SASE", "Dedicated Ethernet", "Custom Solutions"],
                sales_motion="strategic-sales",
            ),
            SegmentConfig(
                tier="tier_e5",
                label="E5 - Enterprise X-Large: $1M+ MRR",
                description="Strategic enterprise: Fortune 500 / major accounts",
                mrr_min=1000000,
                mrr_max=None,
                accounts=45,
                arr=360_000_000,
                avg_mrr=666667,
                growth_potential=0.42,
                churn_risk=0.03,
                attach_opportunity=0.25,
                typical_industries=["Fortune 500", "Global Banks", "Large Government", "Major Healthcare Systems"],
                key_products=["Custom Enterprise Solutions", "Global Connectivity", "Managed Everything"],
                sales_motion="executive-engagement",
            ),
        ]
        
        # Generate quarterly growth trajectory 
        # Use default values for initial setup (will be recalculated when config is loaded)
        default_growth = self._generate_growth_trajectory(4.0, 0.15, 0.14)
        
        return CBConfiguration(
            segments=default_segments,
            growth_trajectory=default_growth,
            products=self._build_default_products(),
            sales_capacity=self._build_default_sales_capacity(),
        )
    
    def _generate_growth_trajectory(
        self, 
        base_arr_billions: float, 
        target_growth_pct: float, 
        actual_growth_pct: float
    ) -> List[GrowthDataPoint]:
        """Generate quarterly growth trajectory data.
        
        Args:
            base_arr_billions: Starting ARR in billions (e.g., 4.0 for $4B)
            target_growth_pct: Target annual growth rate as decimal (e.g., 0.15 for 15%)
            actual_growth_pct: Actual annual growth rate as decimal (e.g., 0.14 for 14%)
        """
        # Calculate quarterly growth rates from annual rates
        quarterly_target_growth = (1 + target_growth_pct) ** 0.25 - 1
        quarterly_actual_growth = (1 + actual_growth_pct) ** 0.25 - 1
        
        # Build 8 quarters of trajectory (2 years)
        growth_data = []
        year = 2025
        for i in range(8):
            quarter = (i % 4) + 1
            if i == 4:
                year = 2026
            
            # Calculate ARR for each quarter
            target_arr = base_arr_billions * ((1 + quarterly_target_growth) ** i)
            # Actual data only for past/current quarters (first 6), future is projection
            actual_arr = base_arr_billions * ((1 + quarterly_actual_growth) ** i) if i < 6 else 0
            
            growth_data.append(GrowthDataPoint(
                period=f"Q{quarter} {year}",
                actual=round(actual_arr, 2),
                target=round(target_arr, 2),
            ))
        
        return growth_data
    
    def _build_default_products(self) -> List[ProductConfig]:
        """Build default product portfolio."""
        return [
            ProductConfig(
                id="broadband",
                name="Business Internet (Coax/Fiber)",
                category="connectivity",
                description="High-speed broadband for business via coax and fiber infrastructure",
                current_arr=850_000_000,
                current_penetration_pct=85.0,
                yoy_growth_pct=8.0,
                market_position="strong",
                market_rank=2,
                key_competitors=["Verizon Fios", "AT&T Fiber", "Spectrum Business", "Frontier"],
                competitive_strengths=["Extensive footprint", "Reliable network", "Strong SLAs"],
                competitive_gaps=["Limited fiber-to-the-prem in some areas", "Speed tier perception"],
                maturity="mature",
                target_penetration_pct=90.0,
                target_arr_growth_pct=10.0,
            ),
            ProductConfig(
                id="ethernet",
                name="Ethernet Dedicated Internet",
                category="connectivity",
                description="Dedicated ethernet services for enterprise connectivity",
                current_arr=420_000_000,
                current_penetration_pct=35.0,
                yoy_growth_pct=12.0,
                market_position="growing",
                market_rank=3,
                key_competitors=["Verizon Business", "Lumen", "AT&T Business", "Zayo"],
                competitive_strengths=["Competitive pricing", "Self-service portal", "Fast provisioning"],
                competitive_gaps=["Geographic coverage vs. Lumen", "Large enterprise presence"],
                maturity="mature",
                target_penetration_pct=45.0,
                target_arr_growth_pct=15.0,
            ),
            ProductConfig(
                id="fixed_wireless",
                name="Fixed Wireless Access",
                category="connectivity",
                description="CBRS and mmWave fixed wireless for hard-to-reach locations",
                current_arr=45_000_000,
                current_penetration_pct=5.0,
                yoy_growth_pct=45.0,
                market_position="emerging",
                market_rank=4,
                key_competitors=["T-Mobile Business", "Verizon 5G Business", "Starry"],
                competitive_strengths=["CBRS spectrum", "Network density for backhaul"],
                competitive_gaps=["Coverage footprint", "Speed consistency", "Enterprise perception"],
                maturity="emerging",
                target_penetration_pct=15.0,
                target_arr_growth_pct=50.0,
            ),
            ProductConfig(
                id="mobile_enterprise",
                name="Mobile Enterprise",
                category="mobile",
                description="Enterprise mobile services (planned 2026 launch)",
                is_launched=False,
                launch_date="2026",
                current_arr=0,
                current_penetration_pct=0.0,
                yoy_growth_pct=0.0,
                market_position="not_yet",
                market_rank=5,
                key_competitors=["Verizon Wireless", "AT&T Mobility", "T-Mobile for Business"],
                competitive_strengths=["Bundle opportunity", "Converged billing", "Existing relationships"],
                competitive_gaps=["No current offering", "Late to market", "Network coverage"],
                maturity="emerging",
                target_penetration_pct=20.0,
                target_arr_growth_pct=100.0,
            ),
            ProductConfig(
                id="sdwan",
                name="SD-WAN",
                category="secure_networking",
                description="Software-defined WAN for enterprise branch connectivity",
                current_arr=180_000_000,
                current_penetration_pct=18.0,
                yoy_growth_pct=28.0,
                market_position="growing",
                market_rank=4,
                key_competitors=["Cisco/Meraki", "Fortinet", "VMware VeloCloud", "Palo Alto Prisma"],
                competitive_strengths=["Managed service model", "Integrated with connectivity", "Single vendor"],
                competitive_gaps=["Feature depth vs. pure-play", "Multi-vendor support", "Global reach"],
                maturity="growing",
                target_penetration_pct=30.0,
                target_arr_growth_pct=35.0,
            ),
            ProductConfig(
                id="sase",
                name="SASE / Secure Access Service Edge",
                category="secure_networking",
                description="Converged networking and security-as-a-service",
                current_arr=65_000_000,
                current_penetration_pct=8.0,
                yoy_growth_pct=52.0,
                market_position="challenger",
                market_rank=5,
                key_competitors=["Zscaler", "Palo Alto Prisma", "Cisco Umbrella", "Cloudflare"],
                competitive_strengths=["Bundle with connectivity", "Emerging capability"],
                competitive_gaps=["Feature maturity", "Brand recognition in security", "Partner ecosystem"],
                maturity="emerging",
                target_penetration_pct=25.0,
                target_arr_growth_pct=60.0,
            ),
            ProductConfig(
                id="managed_firewall",
                name="Managed Firewall",
                category="secure_networking",
                description="Managed next-gen firewall services",
                current_arr=145_000_000,
                current_penetration_pct=22.0,
                yoy_growth_pct=15.0,
                market_position="growing",
                market_rank=4,
                key_competitors=["Palo Alto Networks", "Fortinet", "Cisco", "Check Point"],
                competitive_strengths=["Managed service simplicity", "Bundled pricing"],
                competitive_gaps=["Advanced threat capabilities", "SOAR integration"],
                maturity="mature",
                target_penetration_pct=30.0,
                target_arr_growth_pct=18.0,
            ),
            ProductConfig(
                id="security_edge",
                name="SecurityEdge",
                category="cybersecurity",
                description="DNS-layer security and threat protection",
                current_arr=120_000_000,
                current_penetration_pct=25.0,
                yoy_growth_pct=20.0,
                market_position="strong",
                market_rank=3,
                key_competitors=["Cisco Umbrella", "Cloudflare Gateway", "Infoblox"],
                competitive_strengths=["Easy deployment", "Integrated billing", "SMB-friendly"],
                competitive_gaps=["Enterprise feature depth", "Advanced analytics"],
                maturity="mature",
                target_penetration_pct=40.0,
                target_arr_growth_pct=25.0,
            ),
            ProductConfig(
                id="advanced_security",
                name="Advanced Threat Protection / DDoS / MDR",
                category="cybersecurity",
                description="Advanced security services including DDoS mitigation and MDR",
                current_arr=85_000_000,
                current_penetration_pct=12.0,
                yoy_growth_pct=35.0,
                market_position="challenger",
                market_rank=5,
                key_competitors=["CrowdStrike", "Palo Alto Cortex", "Microsoft Sentinel", "SentinelOne"],
                competitive_strengths=["Integrated with network", "Growing SOC capabilities"],
                competitive_gaps=["Brand in security", "Feature depth", "Threat intel"],
                maturity="growing",
                target_penetration_pct=25.0,
                target_arr_growth_pct=40.0,
            ),
            ProductConfig(
                id="ucaas",
                name="UCaaS / Business VoiceEdge",
                category="voice_collab",
                description="Unified communications as a service",
                current_arr=280_000_000,
                current_penetration_pct=30.0,
                yoy_growth_pct=10.0,
                market_position="strong",
                market_rank=3,
                key_competitors=["RingCentral", "Microsoft Teams Phone", "Zoom Phone", "8x8"],
                competitive_strengths=["Integrated billing", "Existing voice relationships", "Support"],
                competitive_gaps=["AI features", "Collaboration tools", "Video quality"],
                maturity="mature",
                target_penetration_pct=40.0,
                target_arr_growth_pct=12.0,
            ),
            ProductConfig(
                id="ccaas",
                name="CCaaS / Contact Center",
                category="voice_collab",
                description="Contact center as a service",
                current_arr=55_000_000,
                current_penetration_pct=8.0,
                yoy_growth_pct=25.0,
                market_position="challenger",
                market_rank=5,
                key_competitors=["Genesys", "Five9", "NICE", "Talkdesk"],
                competitive_strengths=["Bundle opportunity", "Existing voice customers"],
                competitive_gaps=["AI/ML capabilities", "WFM features", "Integrations"],
                maturity="growing",
                target_penetration_pct=18.0,
                target_arr_growth_pct=35.0,
            ),
            ProductConfig(
                id="sip_trunking",
                name="SIP Trunking",
                category="voice_collab",
                description="Enterprise SIP trunking services",
                current_arr=165_000_000,
                current_penetration_pct=28.0,
                yoy_growth_pct=5.0,
                market_position="strong",
                market_rank=2,
                key_competitors=["Lumen", "Verizon", "Bandwidth", "Twilio"],
                competitive_strengths=["Network quality", "Enterprise SLAs", "Porting expertise"],
                competitive_gaps=["Programmable features", "API ecosystem"],
                maturity="mature",
                target_penetration_pct=32.0,
                target_arr_growth_pct=6.0,
            ),
            ProductConfig(
                id="colocation",
                name="Data Center / Colocation",
                category="data_center",
                description="Colocation and cloud connectivity services",
                current_arr=90_000_000,
                current_penetration_pct=6.0,
                yoy_growth_pct=18.0,
                market_position="challenger",
                market_rank=5,
                key_competitors=["Equinix", "Digital Realty", "CoreSite", "QTS"],
                competitive_strengths=["Network integration", "Hybrid cloud connectivity"],
                competitive_gaps=["Footprint", "Scale", "Global presence"],
                maturity="growing",
                target_penetration_pct=12.0,
                target_arr_growth_pct=25.0,
            ),
            # =====================================================
            # CLOUD CONNECTIVITY CATEGORY
            # Direct cloud on-ramps, multi-cloud networking, hybrid cloud
            # =====================================================
            ProductConfig(
                id="cloud_connect",
                name="Cloud Connect / Direct Cloud On-Ramp",
                category="cloud_connectivity",
                description="Direct, private connectivity to major cloud providers (AWS, Azure, GCP) bypassing public internet",
                current_arr=75_000_000,
                current_penetration_pct=10.0,
                yoy_growth_pct=38.0,
                market_position="challenger",
                market_rank=5,
                key_competitors=[
                    "Equinix Fabric",
                    "Megaport",
                    "PacketFabric",
                    "Console Connect (PCCW)",
                    "Zayo CloudLink",
                    "AT&T NetBond",
                    "Verizon Secure Cloud Interconnect",
                    "Lumen Cloud Connect",
                    "CoreSite Open Cloud Exchange"
                ],
                competitive_strengths=[
                    "Existing enterprise relationships",
                    "Integration with DIA and ethernet services",
                    "Single bill for connectivity + cloud on-ramp",
                    "Regional footprint in key markets"
                ],
                competitive_gaps=[
                    "Global PoP coverage vs. Equinix/Megaport",
                    "Software-defined orchestration maturity",
                    "Multi-cloud portal experience",
                    "Partnership depth with hyperscalers"
                ],
                maturity="growing",
                target_penetration_pct=25.0,
                target_arr_growth_pct=45.0,
            ),
            ProductConfig(
                id="aws_direct_connect",
                name="AWS Direct Connect Partner",
                category="cloud_connectivity",
                description="Direct connectivity to AWS via Direct Connect partner network",
                current_arr=35_000_000,
                current_penetration_pct=6.0,
                yoy_growth_pct=42.0,
                market_position="challenger",
                market_rank=6,
                key_competitors=[
                    "Equinix Fabric for AWS",
                    "Megaport AWS",
                    "AT&T NetBond for AWS",
                    "Verizon Direct Connect",
                    "Lumen AWS Direct Connect",
                    "Console Connect for AWS"
                ],
                competitive_strengths=[
                    "Simplified procurement for existing customers",
                    "Bundled with enterprise internet",
                    "Local loop + Direct Connect integration"
                ],
                competitive_gaps=[
                    "Number of Direct Connect locations",
                    "Self-service provisioning speed",
                    "API integration maturity"
                ],
                maturity="growing",
                target_penetration_pct=15.0,
                target_arr_growth_pct=50.0,
            ),
            ProductConfig(
                id="azure_expressroute",
                name="Azure ExpressRoute Partner",
                category="cloud_connectivity",
                description="Private connectivity to Microsoft Azure via ExpressRoute",
                current_arr=28_000_000,
                current_penetration_pct=5.0,
                yoy_growth_pct=48.0,
                market_position="challenger",
                market_rank=6,
                key_competitors=[
                    "Equinix Fabric for Azure",
                    "Megaport Azure",
                    "AT&T NetBond for Azure",
                    "Verizon ExpressRoute",
                    "Lumen ExpressRoute",
                    "Colt Technology Services"
                ],
                competitive_strengths=[
                    "Microsoft 365 optimization",
                    "Integration with SD-WAN for Azure",
                    "Single vendor for connectivity + cloud"
                ],
                competitive_gaps=[
                    "ExpressRoute Global Reach coverage",
                    "Azure peering location count",
                    "FastPath capabilities"
                ],
                maturity="growing",
                target_penetration_pct=15.0,
                target_arr_growth_pct=55.0,
            ),
            ProductConfig(
                id="gcp_interconnect",
                name="Google Cloud Interconnect Partner",
                category="cloud_connectivity",
                description="Dedicated or partner interconnect to Google Cloud Platform",
                current_arr=12_000_000,
                current_penetration_pct=2.0,
                yoy_growth_pct=55.0,
                market_position="emerging",
                market_rank=7,
                key_competitors=[
                    "Equinix Fabric for GCP",
                    "Megaport GCP",
                    "PacketFabric GCP",
                    "Console Connect for GCP",
                    "Colt Technology Services"
                ],
                competitive_strengths=[
                    "Growing GCP enterprise adoption",
                    "Bundling opportunity with other cloud connects"
                ],
                competitive_gaps=[
                    "GCP adoption lags AWS/Azure",
                    "Interconnect location coverage",
                    "Partner Interconnect vs Dedicated"
                ],
                maturity="emerging",
                target_penetration_pct=8.0,
                target_arr_growth_pct=60.0,
            ),
            ProductConfig(
                id="multi_cloud_networking",
                name="Multi-Cloud Networking / Cloud Router",
                category="cloud_connectivity",
                description="Software-defined multi-cloud networking connecting AWS, Azure, GCP, and private clouds",
                current_arr=18_000_000,
                current_penetration_pct=3.0,
                yoy_growth_pct=65.0,
                market_position="emerging",
                market_rank=6,
                key_competitors=[
                    "Aviatrix",
                    "Alkira",
                    "Prosimo",
                    "Cisco Multicloud Defense",
                    "Megaport Virtual Edge",
                    "Equinix Network Edge",
                    "PacketFabric",
                    "Arrcus"
                ],
                competitive_strengths=[
                    "Integration with SD-WAN portfolio",
                    "Single pane of glass for hybrid connectivity",
                    "Managed service model"
                ],
                competitive_gaps=[
                    "Native cloud networking depth",
                    "Multi-cloud automation maturity",
                    "Kubernetes/container networking",
                    "Cloud-native firewall integration"
                ],
                maturity="emerging",
                target_penetration_pct=15.0,
                target_arr_growth_pct=70.0,
            ),
            ProductConfig(
                id="hybrid_cloud_wan",
                name="Hybrid Cloud WAN",
                category="cloud_connectivity",
                description="Integrated WAN solution connecting branches, data centers, and multiple clouds",
                current_arr=22_000_000,
                current_penetration_pct=4.0,
                yoy_growth_pct=45.0,
                market_position="challenger",
                market_rank=5,
                key_competitors=[
                    "Cisco SD-WAN Cloud OnRamp",
                    "VMware VeloCloud",
                    "Palo Alto Prisma SD-WAN",
                    "Fortinet Secure SD-WAN",
                    "HPE Aruba EdgeConnect",
                    "Versa Networks",
                    "Cato Networks"
                ],
                competitive_strengths=[
                    "End-to-end managed service",
                    "Integration with fiber/ethernet backbone",
                    "Single vendor accountability"
                ],
                competitive_gaps=[
                    "Cloud-native integrations",
                    "Zero trust network access maturity",
                    "Advanced traffic engineering"
                ],
                maturity="growing",
                target_penetration_pct=18.0,
                target_arr_growth_pct=50.0,
            ),
        ]
    
    def _build_default_sales_capacity(self) -> SalesCapacityConfig:
        """Build default national sales capacity configuration.
        
        All quotas are MRR-based (Monthly Recurring Revenue sold per year).
        Example: A rep with $50K MRR quota sells $50K in new MRR over the year.
        
        Rule of 78 Impact:
        - If sales are evenly distributed, each $1 MRR sold generates $6.50 ARR in year 1
        - Total $50M MRR quota × 6.5 = $325M Year 1 ARR impact
        - Full annual run-rate = $50M MRR × 12 = $600M ARR (realized in year 2+)
        """
        return SalesCapacityConfig(
            national=NationalSalesCapacity(
                fiscal_year=2026,
                rep_quotas=[
                    # Non-quota bearing roles (pipeline generation)
                    RepTypeQuota(rep_type="sdr", rep_type_label="Sales Development Rep", count=150, quota_per_rep_mrr=0, is_quota_bearing=False),
                    RepTypeQuota(rep_type="bdr", rep_type_label="Business Development Rep", count=120, quota_per_rep_mrr=0, is_quota_bearing=False),
                    
                    # Inside Sales (smaller deal sizes, higher velocity)
                    # E1-E2 segments: avg deal $3-15K MRR
                    RepTypeQuota(rep_type="inside_ae", rep_type_label="Inside Account Executive", count=200, quota_per_rep_mrr=40_000, is_quota_bearing=True),  # $40K MRR/year
                    RepTypeQuota(rep_type="inside_am", rep_type_label="Inside Account Manager", count=150, quota_per_rep_mrr=25_000, is_quota_bearing=True),  # $25K MRR/year (expansion)
                    
                    # Field Sales (larger deals, longer cycles)
                    # E2-E3 segments: avg deal $15-65K MRR
                    RepTypeQuota(rep_type="field_ae", rep_type_label="Field Account Executive", count=180, quota_per_rep_mrr=60_000, is_quota_bearing=True),  # $60K MRR/year
                    RepTypeQuota(rep_type="field_am", rep_type_label="Field Account Manager", count=120, quota_per_rep_mrr=40_000, is_quota_bearing=True),  # $40K MRR/year (expansion)
                    
                    # Strategic/Major Accounts (largest deals)
                    # E4-E5 segments: avg deal $185K-667K MRR
                    RepTypeQuota(rep_type="strategic_ae", rep_type_label="Strategic Account Executive", count=50, quota_per_rep_mrr=100_000, is_quota_bearing=True),  # $100K MRR/year
                    RepTypeQuota(rep_type="major_am", rep_type_label="Major Account Manager", count=30, quota_per_rep_mrr=80_000, is_quota_bearing=True),  # $80K MRR/year (expansion)
                    
                    # Support roles
                    RepTypeQuota(rep_type="se", rep_type_label="Sales Engineer", count=80, quota_per_rep_mrr=0, is_quota_bearing=False),
                    RepTypeQuota(rep_type="partner_mgr", rep_type_label="Partner Manager", count=40, quota_per_rep_mrr=50_000, is_quota_bearing=True),  # $50K MRR/year
                    RepTypeQuota(rep_type="sales_mgr", rep_type_label="Sales Manager", count=60, quota_per_rep_mrr=0, is_quota_bearing=False),
                ],
                total_headcount=1180,
                # Total MRR quota = sum of (count × quota_per_rep_mrr) for quota-bearing reps
                # Inside AE: 200 × $40K = $8M, Inside AM: 150 × $25K = $3.75M
                # Field AE: 180 × $60K = $10.8M, Field AM: 120 × $40K = $4.8M
                # Strategic AE: 50 × $100K = $5M, Major AM: 30 × $80K = $2.4M
                # Partner: 40 × $50K = $2M
                # Total: ~$36.75M MRR quota
                total_quota_mrr=36_750_000,  # $36.75M MRR sold target for FY2026
                new_logo_quota_pct=60.0,
                expansion_quota_pct=40.0,
                avg_ramp_time_months=6,
                avg_quota_attainment_pct=85.0,
                attrition_rate_pct=15.0,
                rule_of_78_factor=6.5,  # Assumes even distribution; adjust if front/back-loaded
            ),
            msa_overrides={},
        )
    
    def _load_config(self) -> CBConfiguration:
        """Load configuration from file, merging with defaults for any new fields.
        
        This ensures that:
        1. User-entered data is always preserved
        2. New fields added to the schema get default values
        3. No data loss during application upgrades
        """
        defaults = self._build_default_config()
        
        if self._config_file.exists():
            try:
                with open(self._config_file, "r") as f:
                    saved_data = json.load(f)
                
                # Get default data as dict for merging
                default_data = defaults.model_dump(mode="json")
                
                # Deep merge: saved data takes precedence, but new fields get defaults
                merged_data = self._deep_merge(default_data, saved_data)
                
                # Ensure updated_at reflects the saved time
                if "updated_at" in saved_data:
                    merged_data["updated_at"] = saved_data["updated_at"]
                
                config = CBConfiguration(**merged_data)
                
                # Check if growth trajectory needs to be upgraded from monthly to quarterly
                if config.growth_trajectory and len(config.growth_trajectory) > 0:
                    first_period = config.growth_trajectory[0].period
                    # If not in quarterly format (Q1, Q2, etc.), regenerate
                    if not first_period.startswith("Q"):
                        base_arr = config.company_metrics.enterprise_arr / 1_000_000_000
                        target_growth = config.company_metrics.growth_target_pct / 100
                        actual_growth = config.company_metrics.growth_rate_actual / 100
                        config.growth_trajectory = self._generate_growth_trajectory(
                            base_arr, target_growth, actual_growth
                        )
                        # Save the updated config
                        self._config = config
                        self._save_config()
                
                return config
            except Exception as e:
                print(f"Error loading CB config, using defaults: {e}")
        
        # No saved config - save defaults and return
        self._config = defaults
        self._save_config()
        return defaults
    
    def _deep_merge(self, base: dict, override: dict) -> dict:
        """Deep merge two dictionaries, with override taking precedence.
        
        - For dicts: recursively merge
        - For lists: use override if present, else base
        - For scalars: use override if present, else base
        """
        result = base.copy()
        
        for key, override_value in override.items():
            if key in result:
                base_value = result[key]
                
                # Both are dicts - recurse
                if isinstance(base_value, dict) and isinstance(override_value, dict):
                    result[key] = self._deep_merge(base_value, override_value)
                else:
                    # Override takes precedence for non-dict values
                    result[key] = override_value
            else:
                # Key only in override
                result[key] = override_value
        
        return result
    
    def _save_config(self) -> None:
        """Save configuration to file."""
        try:
            with open(self._config_file, "w") as f:
                json.dump(self._config.model_dump(mode="json"), f, indent=2, default=str)
        except Exception as e:
            print(f"Error saving CB config: {e}")
    
    def _load_intel(self) -> dict[str, SegmentMarketIntel]:
        """Load segment intel from file."""
        if self._intel_file.exists():
            try:
                with open(self._intel_file, "r") as f:
                    data = json.load(f)
                return {k: SegmentMarketIntel(**v) for k, v in data.items()}
            except Exception as e:
                print(f"Error loading segment intel: {e}")
        return {}
    
    def _save_intel(self) -> None:
        """Save segment intel to file."""
        try:
            with open(self._intel_file, "w") as f:
                data = {k: v.model_dump(mode="json") for k, v in self._segment_intel.items()}
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            print(f"Error saving segment intel: {e}")
    
    # Configuration methods
    def get_config(self) -> CBConfiguration:
        """Get the current configuration."""
        return self._config
    
    def update_company_metrics(self, metrics: CompanyMetrics, updated_by: str = "admin") -> CBConfiguration:
        """Update company-wide metrics and regenerate growth trajectory."""
        self._config.company_metrics = metrics
        
        # Regenerate growth trajectory based on new metrics
        base_arr = metrics.enterprise_arr / 1_000_000_000  # Convert to billions
        target_growth = metrics.growth_target_pct / 100
        actual_growth = metrics.growth_rate_actual / 100
        self._config.growth_trajectory = self._generate_growth_trajectory(
            base_arr, target_growth, actual_growth
        )
        
        self._config.updated_at = datetime.utcnow()
        self._config.updated_by = updated_by
        self._save_config()
        return self._config
    
    def update_segment(self, segment: SegmentConfig, updated_by: str = "admin") -> CBConfiguration:
        """Update a single segment's configuration."""
        for i, s in enumerate(self._config.segments):
            if s.tier == segment.tier:
                self._config.segments[i] = segment
                break
        else:
            self._config.segments.append(segment)
        
        self._config.updated_at = datetime.utcnow()
        self._config.updated_by = updated_by
        self._save_config()
        return self._config
    
    def update_all_segments(self, segments: List[SegmentConfig], updated_by: str = "admin") -> CBConfiguration:
        """Update all segments at once."""
        self._config.segments = segments
        self._config.updated_at = datetime.utcnow()
        self._config.updated_by = updated_by
        self._save_config()
        return self._config
    
    def update_growth_trajectory(self, data: List[GrowthDataPoint], updated_by: str = "admin") -> CBConfiguration:
        """Update growth trajectory data."""
        self._config.growth_trajectory = data
        self._config.updated_at = datetime.utcnow()
        self._config.updated_by = updated_by
        self._save_config()
        return self._config
    
    def get_segment(self, tier: str) -> Optional[SegmentConfig]:
        """Get a specific segment by tier."""
        for s in self._config.segments:
            if s.tier == tier:
                return s
        return None
    
    # Product portfolio methods
    def get_products(self) -> List[ProductConfig]:
        """Get all products in the portfolio."""
        return self._config.products
    
    def get_product(self, product_id: str) -> Optional[ProductConfig]:
        """Get a specific product by ID."""
        for p in self._config.products:
            if p.id == product_id:
                return p
        return None
    
    def update_product(self, product: ProductConfig, updated_by: str = "admin") -> ProductConfig:
        """Update a product in the portfolio."""
        for i, p in enumerate(self._config.products):
            if p.id == product.id:
                self._config.products[i] = product
                self._config.updated_at = datetime.utcnow()
                self._config.updated_by = updated_by
                self._save_config()
                return product
        # Not found, add it
        self._config.products.append(product)
        self._config.updated_at = datetime.utcnow()
        self._config.updated_by = updated_by
        self._save_config()
        return product
    
    def add_product(self, product: ProductConfig, updated_by: str = "admin") -> ProductConfig:
        """Add a new product to the portfolio."""
        self._config.products.append(product)
        self._config.updated_at = datetime.utcnow()
        self._config.updated_by = updated_by
        self._save_config()
        return product
    
    def delete_product(self, product_id: str, updated_by: str = "admin") -> bool:
        """Delete a product from the portfolio."""
        for i, p in enumerate(self._config.products):
            if p.id == product_id:
                del self._config.products[i]
                self._config.updated_at = datetime.utcnow()
                self._config.updated_by = updated_by
                self._save_config()
                return True
        return False
    
    # Sales capacity methods
    def get_sales_capacity(self) -> SalesCapacityConfig:
        """Get the sales capacity configuration."""
        return self._config.sales_capacity
    
    def update_national_sales_capacity(self, capacity: NationalSalesCapacity, updated_by: str = "admin") -> SalesCapacityConfig:
        """Update national sales capacity configuration."""
        self._config.sales_capacity.national = capacity
        self._config.updated_at = datetime.utcnow()
        self._config.updated_by = updated_by
        self._save_config()
        return self._config.sales_capacity
    
    def update_msa_override(self, override: MSASalesOverride, updated_by: str = "admin") -> MSASalesOverride:
        """Update or create an MSA-specific sales override."""
        override.updated_at = datetime.utcnow()
        self._config.sales_capacity.msa_overrides[override.msa_code] = override
        self._config.updated_at = datetime.utcnow()
        self._config.updated_by = updated_by
        self._save_config()
        return override
    
    def delete_msa_override(self, msa_code: str, updated_by: str = "admin") -> bool:
        """Delete an MSA-specific override."""
        if msa_code in self._config.sales_capacity.msa_overrides:
            del self._config.sales_capacity.msa_overrides[msa_code]
            self._config.updated_at = datetime.utcnow()
            self._config.updated_by = updated_by
            self._save_config()
            return True
        return False
    
    def get_msa_override(self, msa_code: str) -> Optional[MSASalesOverride]:
        """Get the override for a specific MSA."""
        return self._config.sales_capacity.msa_overrides.get(msa_code)
    
    # Segment intel methods
    def get_segment_intel(self, tier: str) -> Optional[SegmentMarketIntel]:
        """Get market intel for a segment."""
        return self._segment_intel.get(tier)
    
    def get_all_segment_intel(self) -> dict[str, SegmentMarketIntel]:
        """Get all segment intel."""
        return self._segment_intel
    
    def save_segment_intel(self, intel: SegmentMarketIntel) -> None:
        """Save market intel for a segment."""
        self._segment_intel[intel.segment_tier] = intel
        self._save_intel()
    
    def delete_segment_intel(self, tier: str) -> bool:
        """Delete market intel for a segment."""
        if tier in self._segment_intel:
            del self._segment_intel[tier]
            self._save_intel()
            return True
        return False


def get_cb_config_store() -> CBConfigStore:
    """Get the singleton CB config store instance."""
    return CBConfigStore()

