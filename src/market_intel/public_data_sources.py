"""
Public Data Sources for Enterprise Strategy Platform.

Manages external public data sources for market intelligence, organized by category.
Data is fetched once and cached persistently until manual refresh is requested.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import json
import os
import hashlib


class DataSourceCategory(str, Enum):
    """Categories of public data sources."""
    REGULATORY = "regulatory"           # FCC, NTIA, CISA, Census
    ANALYST = "analyst"                 # Gartner, IDC, Dell'Oro, Synergy
    THREAT_INTEL = "threat_intel"       # CISA KEV, MITRE, Verizon DBIR
    INFRASTRUCTURE = "infrastructure"   # PeeringDB, Cloudscene, Data Center Map
    COMPETITOR = "competitor"           # SEC EDGAR competitor filings


class ServiceArea(str, Enum):
    """Service areas the data applies to."""
    CONNECTIVITY = "connectivity"
    SECURE_NETWORKING = "secure_networking"
    CYBERSECURITY = "cybersecurity"
    DATA_CENTER = "data_center"
    ALL = "all"


class RefreshStatus(str, Enum):
    """Status of data refresh."""
    NEVER = "never"
    SUCCESS = "success"
    FAILED = "failed"
    IN_PROGRESS = "in_progress"


class PublicDataSource(BaseModel):
    """Definition of a public data source."""
    
    id: str
    name: str
    description: str
    category: DataSourceCategory
    service_areas: List[ServiceArea]
    url: str
    api_available: bool = False
    api_endpoint: Optional[str] = None
    requires_api_key: bool = False
    is_enabled: bool = True
    
    # Refresh tracking
    last_refresh: Optional[datetime] = None
    refresh_status: RefreshStatus = RefreshStatus.NEVER
    error_message: Optional[str] = None
    
    # Cached data
    cached_data: Optional[Dict[str, Any]] = None
    cache_version: str = "1.0"


class PublicDataSourceRegistry:
    """
    Registry of all public data sources with caching and persistence.
    
    Data is fetched once and stored persistently. Refresh only happens
    when explicitly requested by the user.
    """
    
    CACHE_FILE = "./data/public_data_cache.json"
    
    def __init__(self):
        self._sources: Dict[str, PublicDataSource] = {}
        self._initialize_sources()
        self._load_cache()
    
    def _initialize_sources(self):
        """Initialize all public data sources."""
        sources = [
            # ─────────────────────────────────────────────────────────────
            # REGULATORY / GOVERNMENT
            # ─────────────────────────────────────────────────────────────
            PublicDataSource(
                id="fcc-broadband-map",
                name="FCC Broadband Data Collection",
                description="Carrier coverage maps, speeds, deployment data by geography",
                category=DataSourceCategory.REGULATORY,
                service_areas=[ServiceArea.CONNECTIVITY],
                url="https://broadbandmap.fcc.gov",
                api_available=True,
                api_endpoint="https://broadbandmap.fcc.gov/api",
            ),
            PublicDataSource(
                id="fcc-form-477",
                name="FCC Form 477 Data",
                description="Broadband deployment by census block, carrier market share",
                category=DataSourceCategory.REGULATORY,
                service_areas=[ServiceArea.CONNECTIVITY],
                url="https://www.fcc.gov/general/broadband-deployment-data-fcc-form-477",
                api_available=False,
            ),
            PublicDataSource(
                id="ntia-broadband",
                name="NTIA National Broadband Map",
                description="Business broadband availability, underserved areas",
                category=DataSourceCategory.REGULATORY,
                service_areas=[ServiceArea.CONNECTIVITY],
                url="https://broadbandusa.ntia.gov",
                api_available=False,
            ),
            PublicDataSource(
                id="census-cbp",
                name="Census County Business Patterns",
                description="Establishments by NAICS, employee size, geography - for TAM sizing",
                category=DataSourceCategory.REGULATORY,
                service_areas=[ServiceArea.ALL],
                url="https://www.census.gov/programs-surveys/cbp.html",
                api_available=True,
                api_endpoint="https://api.census.gov/data/timeseries/cbp",
            ),
            PublicDataSource(
                id="bls-qcew",
                name="BLS Quarterly Census of Employment",
                description="Employment by industry and location - identify growth verticals",
                category=DataSourceCategory.REGULATORY,
                service_areas=[ServiceArea.ALL],
                url="https://www.bls.gov/cew/",
                api_available=True,
                api_endpoint="https://api.bls.gov/publicAPI/v2/timeseries/data/",
            ),
            
            # ─────────────────────────────────────────────────────────────
            # ANALYST / MARKET RESEARCH (Public Summaries)
            # ─────────────────────────────────────────────────────────────
            PublicDataSource(
                id="delloro-sdwan",
                name="Dell'Oro SD-WAN Market Reports",
                description="SD-WAN market size and share estimates from press releases",
                category=DataSourceCategory.ANALYST,
                service_areas=[ServiceArea.SECURE_NETWORKING],
                url="https://www.delloro.com/news/",
                api_available=False,
            ),
            PublicDataSource(
                id="synergy-research",
                name="Synergy Research Group",
                description="Cloud/colocation market share data from press releases",
                category=DataSourceCategory.ANALYST,
                service_areas=[ServiceArea.DATA_CENTER],
                url="https://www.srgresearch.com",
                api_available=False,
            ),
            PublicDataSource(
                id="mef-ethernet",
                name="MEF (Metro Ethernet Forum)",
                description="Carrier Ethernet market trends, certification data",
                category=DataSourceCategory.ANALYST,
                service_areas=[ServiceArea.CONNECTIVITY],
                url="https://www.mef.net",
                api_available=False,
            ),
            PublicDataSource(
                id="telegeography-wan",
                name="TeleGeography WAN Research",
                description="WAN pricing, enterprise bandwidth trends",
                category=DataSourceCategory.ANALYST,
                service_areas=[ServiceArea.CONNECTIVITY, ServiceArea.SECURE_NETWORKING],
                url="https://www.telegeography.com",
                api_available=False,
            ),
            
            # ─────────────────────────────────────────────────────────────
            # THREAT INTELLIGENCE / CYBERSECURITY
            # ─────────────────────────────────────────────────────────────
            PublicDataSource(
                id="cisa-kev",
                name="CISA Known Exploited Vulnerabilities",
                description="Active threat catalog, required patching for federal systems",
                category=DataSourceCategory.THREAT_INTEL,
                service_areas=[ServiceArea.CYBERSECURITY],
                url="https://www.cisa.gov/known-exploited-vulnerabilities",
                api_available=True,
                api_endpoint="https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
            ),
            PublicDataSource(
                id="mitre-attack",
                name="MITRE ATT&CK Framework",
                description="Threat actor techniques and defensive guidance",
                category=DataSourceCategory.THREAT_INTEL,
                service_areas=[ServiceArea.CYBERSECURITY],
                url="https://attack.mitre.org",
                api_available=True,
                api_endpoint="https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json",
            ),
            PublicDataSource(
                id="nist-csf",
                name="NIST Cybersecurity Framework",
                description="Security controls, maturity benchmarks",
                category=DataSourceCategory.THREAT_INTEL,
                service_areas=[ServiceArea.CYBERSECURITY],
                url="https://www.nist.gov/cyberframework",
                api_available=False,
            ),
            PublicDataSource(
                id="verizon-dbir",
                name="Verizon Data Breach Investigations Report",
                description="Data breach statistics by industry, attack vectors",
                category=DataSourceCategory.THREAT_INTEL,
                service_areas=[ServiceArea.CYBERSECURITY],
                url="https://www.verizon.com/business/resources/reports/dbir/",
                api_available=False,
            ),
            PublicDataSource(
                id="ibm-breach-cost",
                name="IBM Cost of a Data Breach Report",
                description="Breach costs by industry, security ROI data",
                category=DataSourceCategory.THREAT_INTEL,
                service_areas=[ServiceArea.CYBERSECURITY],
                url="https://www.ibm.com/security/data-breach",
                api_available=False,
            ),
            PublicDataSource(
                id="mandiant-threat",
                name="Mandiant/Google Threat Reports",
                description="APT activity, ransomware trends, threat actor analysis",
                category=DataSourceCategory.THREAT_INTEL,
                service_areas=[ServiceArea.CYBERSECURITY],
                url="https://www.mandiant.com/resources",
                api_available=False,
            ),
            
            # ─────────────────────────────────────────────────────────────
            # INFRASTRUCTURE / DATA CENTER
            # ─────────────────────────────────────────────────────────────
            PublicDataSource(
                id="peeringdb",
                name="PeeringDB",
                description="Interconnection facilities, carrier peering data",
                category=DataSourceCategory.INFRASTRUCTURE,
                service_areas=[ServiceArea.DATA_CENTER, ServiceArea.CONNECTIVITY],
                url="https://www.peeringdb.com",
                api_available=True,
                api_endpoint="https://www.peeringdb.com/api",
            ),
            PublicDataSource(
                id="cloudscene",
                name="Cloudscene",
                description="Data center ecosystem rankings, interconnection data",
                category=DataSourceCategory.INFRASTRUCTURE,
                service_areas=[ServiceArea.DATA_CENTER],
                url="https://www.cloudscene.com",
                api_available=False,
            ),
            PublicDataSource(
                id="datacenter-map",
                name="Data Center Map",
                description="Global DC locations, carrier presence",
                category=DataSourceCategory.INFRASTRUCTURE,
                service_areas=[ServiceArea.DATA_CENTER],
                url="https://www.datacentermap.com",
                api_available=False,
            ),
            PublicDataSource(
                id="uptime-institute",
                name="Uptime Institute",
                description="Data center reliability, tier certification data",
                category=DataSourceCategory.INFRASTRUCTURE,
                service_areas=[ServiceArea.DATA_CENTER],
                url="https://uptimeinstitute.com",
                api_available=False,
            ),
            
            # ─────────────────────────────────────────────────────────────
            # COMPETITOR INTELLIGENCE
            # ─────────────────────────────────────────────────────────────
            PublicDataSource(
                id="sec-lumen",
                name="Lumen Technologies (SEC Filings)",
                description="10-K, 10-Q filings for revenue, segment data, strategy",
                category=DataSourceCategory.COMPETITOR,
                service_areas=[ServiceArea.ALL],
                url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000018926",
                api_available=True,
                api_endpoint="https://data.sec.gov/submissions/CIK0000018926.json",
            ),
            PublicDataSource(
                id="sec-att",
                name="AT&T Inc. (SEC Filings)",
                description="10-K, 10-Q filings for business wireline segment",
                category=DataSourceCategory.COMPETITOR,
                service_areas=[ServiceArea.ALL],
                url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000732717",
                api_available=True,
                api_endpoint="https://data.sec.gov/submissions/CIK0000732717.json",
            ),
            PublicDataSource(
                id="sec-verizon",
                name="Verizon Communications (SEC Filings)",
                description="10-K, 10-Q filings for business segment performance",
                category=DataSourceCategory.COMPETITOR,
                service_areas=[ServiceArea.ALL],
                url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000732712",
                api_available=True,
                api_endpoint="https://data.sec.gov/submissions/CIK0000732712.json",
            ),
            PublicDataSource(
                id="sec-zayo",
                name="Zayo Group (SEC Filings)",
                description="Fiber infrastructure, enterprise connectivity data",
                category=DataSourceCategory.COMPETITOR,
                service_areas=[ServiceArea.CONNECTIVITY, ServiceArea.DATA_CENTER],
                url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001608249",
                api_available=True,
                api_endpoint="https://data.sec.gov/submissions/CIK0001608249.json",
            ),
            PublicDataSource(
                id="sec-cogent",
                name="Cogent Communications (SEC Filings)",
                description="Internet transit, enterprise connectivity pricing",
                category=DataSourceCategory.COMPETITOR,
                service_areas=[ServiceArea.CONNECTIVITY],
                url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001158324",
                api_available=True,
                api_endpoint="https://data.sec.gov/submissions/CIK0001158324.json",
            ),
            PublicDataSource(
                id="sec-equinix",
                name="Equinix Inc. (SEC Filings)",
                description="Data center/colocation market leader, interconnection data",
                category=DataSourceCategory.COMPETITOR,
                service_areas=[ServiceArea.DATA_CENTER],
                url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001101239",
                api_available=True,
                api_endpoint="https://data.sec.gov/submissions/CIK0001101239.json",
            ),
            PublicDataSource(
                id="sec-digitalrealty",
                name="Digital Realty Trust (SEC Filings)",
                description="Data center REIT, colocation market trends",
                category=DataSourceCategory.COMPETITOR,
                service_areas=[ServiceArea.DATA_CENTER],
                url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001297996",
                api_available=True,
                api_endpoint="https://data.sec.gov/submissions/CIK0001297996.json",
            ),
            PublicDataSource(
                id="sec-cisco",
                name="Cisco Systems (SEC Filings)",
                description="SD-WAN, networking infrastructure, enterprise trends",
                category=DataSourceCategory.COMPETITOR,
                service_areas=[ServiceArea.SECURE_NETWORKING, ServiceArea.CONNECTIVITY],
                url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000858877",
                api_available=True,
                api_endpoint="https://data.sec.gov/submissions/CIK0000858877.json",
            ),
            PublicDataSource(
                id="sec-paloalto",
                name="Palo Alto Networks (SEC Filings)",
                description="SASE, cybersecurity market, enterprise security trends",
                category=DataSourceCategory.COMPETITOR,
                service_areas=[ServiceArea.CYBERSECURITY, ServiceArea.SECURE_NETWORKING],
                url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001327567",
                api_available=True,
                api_endpoint="https://data.sec.gov/submissions/CIK0001327567.json",
            ),
            PublicDataSource(
                id="sec-fortinet",
                name="Fortinet Inc. (SEC Filings)",
                description="SD-WAN, SASE, security appliance market data",
                category=DataSourceCategory.COMPETITOR,
                service_areas=[ServiceArea.CYBERSECURITY, ServiceArea.SECURE_NETWORKING],
                url="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001262039",
                api_available=True,
                api_endpoint="https://data.sec.gov/submissions/CIK0001262039.json",
            ),
        ]
        
        for source in sources:
            self._sources[source.id] = source
    
    def _load_cache(self):
        """Load cached data from persistent storage."""
        try:
            if os.path.exists(self.CACHE_FILE):
                with open(self.CACHE_FILE, 'r') as f:
                    cache_data = json.load(f)
                
                for source_id, cached in cache_data.items():
                    if source_id in self._sources:
                        source = self._sources[source_id]
                        source.last_refresh = datetime.fromisoformat(cached['last_refresh']) if cached.get('last_refresh') else None
                        source.refresh_status = RefreshStatus(cached.get('refresh_status', 'never'))
                        source.cached_data = cached.get('cached_data')
                        source.error_message = cached.get('error_message')
        except Exception as e:
            print(f"Warning: Could not load cache: {e}")
    
    def _save_cache(self):
        """Save cached data to persistent storage."""
        try:
            os.makedirs(os.path.dirname(self.CACHE_FILE), exist_ok=True)
            
            cache_data = {}
            for source_id, source in self._sources.items():
                if source.last_refresh or source.cached_data:
                    cache_data[source_id] = {
                        'last_refresh': source.last_refresh.isoformat() if source.last_refresh else None,
                        'refresh_status': source.refresh_status.value,
                        'cached_data': source.cached_data,
                        'error_message': source.error_message,
                    }
            
            with open(self.CACHE_FILE, 'w') as f:
                json.dump(cache_data, f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save cache: {e}")
    
    def get_all_sources(self) -> List[PublicDataSource]:
        """Get all public data sources."""
        return list(self._sources.values())
    
    def get_sources_by_category(self, category: DataSourceCategory) -> List[PublicDataSource]:
        """Get sources by category."""
        return [s for s in self._sources.values() if s.category == category]
    
    def get_sources_by_service_area(self, service_area: ServiceArea) -> List[PublicDataSource]:
        """Get sources relevant to a service area."""
        return [
            s for s in self._sources.values()
            if service_area in s.service_areas or ServiceArea.ALL in s.service_areas
        ]
    
    def get_source(self, source_id: str) -> Optional[PublicDataSource]:
        """Get a specific source by ID."""
        return self._sources.get(source_id)
    
    def refresh_source(self, source_id: str) -> PublicDataSource:
        """
        Refresh data for a specific source.
        
        In a production implementation, this would:
        1. Fetch data from the source URL/API
        2. Parse and normalize the data
        3. Store in cached_data
        4. Update refresh status
        
        For now, we simulate the refresh with placeholder data.
        """
        source = self._sources.get(source_id)
        if not source:
            raise ValueError(f"Source {source_id} not found")
        
        source.refresh_status = RefreshStatus.IN_PROGRESS
        
        try:
            # In production: fetch from API or scrape website
            # For now, store metadata about what would be fetched
            source.cached_data = {
                "fetched_at": datetime.utcnow().isoformat(),
                "source_url": source.url,
                "api_endpoint": source.api_endpoint,
                "summary": f"Data from {source.name} - refresh requested",
                "placeholder": True,  # Flag indicating this is placeholder
            }
            
            source.last_refresh = datetime.utcnow()
            source.refresh_status = RefreshStatus.SUCCESS
            source.error_message = None
            
        except Exception as e:
            source.refresh_status = RefreshStatus.FAILED
            source.error_message = str(e)
        
        self._save_cache()
        return source
    
    def refresh_category(self, category: DataSourceCategory) -> List[PublicDataSource]:
        """Refresh all sources in a category."""
        sources = self.get_sources_by_category(category)
        for source in sources:
            if source.is_enabled:
                self.refresh_source(source.id)
        return sources
    
    def refresh_all(self) -> List[PublicDataSource]:
        """Refresh all enabled sources."""
        for source in self._sources.values():
            if source.is_enabled:
                self.refresh_source(source.id)
        return list(self._sources.values())
    
    def toggle_source(self, source_id: str, enabled: bool) -> PublicDataSource:
        """Enable or disable a source."""
        source = self._sources.get(source_id)
        if not source:
            raise ValueError(f"Source {source_id} not found")
        
        source.is_enabled = enabled
        self._save_cache()
        return source
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary statistics about data sources."""
        sources = list(self._sources.values())
        
        by_category = {}
        for cat in DataSourceCategory:
            cat_sources = [s for s in sources if s.category == cat]
            by_category[cat.value] = {
                "total": len(cat_sources),
                "enabled": sum(1 for s in cat_sources if s.is_enabled),
                "refreshed": sum(1 for s in cat_sources if s.refresh_status == RefreshStatus.SUCCESS),
            }
        
        by_service_area = {}
        for sa in ServiceArea:
            if sa == ServiceArea.ALL:
                continue
            sa_sources = [s for s in sources if sa in s.service_areas or ServiceArea.ALL in s.service_areas]
            by_service_area[sa.value] = len(sa_sources)
        
        last_refresh = None
        for s in sources:
            if s.last_refresh:
                if last_refresh is None or s.last_refresh > last_refresh:
                    last_refresh = s.last_refresh
        
        return {
            "total_sources": len(sources),
            "enabled_sources": sum(1 for s in sources if s.is_enabled),
            "refreshed_sources": sum(1 for s in sources if s.refresh_status == RefreshStatus.SUCCESS),
            "by_category": by_category,
            "by_service_area": by_service_area,
            "last_refresh": last_refresh.isoformat() if last_refresh else None,
        }


# Singleton instance
_registry: Optional[PublicDataSourceRegistry] = None


def get_public_data_registry() -> PublicDataSourceRegistry:
    """Get the singleton registry instance."""
    global _registry
    if _registry is None:
        _registry = PublicDataSourceRegistry()
    return _registry

