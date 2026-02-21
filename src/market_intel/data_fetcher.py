"""
Data Fetcher Service - Actually downloads data from public sources.

Handles API-enabled sources like SEC EDGAR, CISA KEV, MITRE ATT&CK, etc.
"""

import httpx
import json
import os
from datetime import datetime
from typing import Optional, Dict, Any, List
from concurrent.futures import ThreadPoolExecutor
import asyncio

from src.jobs.queue import get_job_queue
from src.jobs.models import JobType, JobStatus


class DataFetcher:
    """
    Fetches data from public API sources.
    """
    
    USER_AGENT = "ComcastBusinessEnterpriseStrategy/1.0 (research platform)"
    
    def __init__(self):
        from src.db_utils import db_load, db_save
        self._db_load = db_load
        self._db_save = db_save
        self._client = httpx.Client(
            timeout=60.0,
            headers={"User-Agent": self.USER_AGENT}
        )
    
    def _save_to_cache(self, source_id: str, data: Dict[str, Any]):
        """Save fetched data to database."""
        self._db_save(f"source_cache_{source_id}", {
            "source_id": source_id,
            "fetched_at": datetime.utcnow().isoformat(),
            "data": data,
        })
    
    def _load_from_cache(self, source_id: str) -> Optional[Dict[str, Any]]:
        """Load data from database cache."""
        return self._db_load(f"source_cache_{source_id}")
    
    def fetch_sec_edgar(self, cik: str, source_id: str) -> Dict[str, Any]:
        """
        Fetch company filings from SEC EDGAR.
        
        Returns filing history and recent form types.
        """
        # SEC requires specific user agent
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        
        try:
            response = self._client.get(url)
            response.raise_for_status()
            data = response.json()
            
            # Extract key information
            recent_filings = data.get("filings", {}).get("recent", {})
            forms = recent_filings.get("form", [])[:20]
            dates = recent_filings.get("filingDate", [])[:20]
            descriptions = recent_filings.get("primaryDocument", [])[:20]
            
            result = {
                "company_name": data.get("name"),
                "cik": data.get("cik"),
                "sic": data.get("sic"),
                "sic_description": data.get("sicDescription"),
                "category": data.get("category"),
                "fiscal_year_end": data.get("fiscalYearEnd"),
                "state": data.get("stateOfIncorporation"),
                "recent_filings": [
                    {"form": f, "date": d, "document": doc}
                    for f, d, doc in zip(forms, dates, descriptions)
                ],
                "total_filings": len(forms),
            }
            
            self._save_to_cache(source_id, result)
            return result
            
        except Exception as e:
            raise Exception(f"Failed to fetch SEC EDGAR data for {source_id}: {str(e)}")
    
    def fetch_cisa_kev(self) -> Dict[str, Any]:
        """
        Fetch CISA Known Exploited Vulnerabilities catalog.
        """
        url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
        
        try:
            response = self._client.get(url)
            response.raise_for_status()
            data = response.json()
            
            vulnerabilities = data.get("vulnerabilities", [])
            
            # Analyze by vendor
            vendor_counts = {}
            for vuln in vulnerabilities:
                vendor = vuln.get("vendorProject", "Unknown")
                vendor_counts[vendor] = vendor_counts.get(vendor, 0) + 1
            
            # Sort by count
            top_vendors = sorted(vendor_counts.items(), key=lambda x: -x[1])[:20]
            
            result = {
                "title": data.get("title"),
                "catalog_version": data.get("catalogVersion"),
                "date_released": data.get("dateReleased"),
                "count": data.get("count"),
                "total_vulnerabilities": len(vulnerabilities),
                "top_affected_vendors": [{"vendor": v, "count": c} for v, c in top_vendors],
                "recent_additions": vulnerabilities[:10],  # Most recent 10
            }
            
            self._save_to_cache("cisa-kev", result)
            return result
            
        except Exception as e:
            raise Exception(f"Failed to fetch CISA KEV: {str(e)}")
    
    def fetch_mitre_attack(self) -> Dict[str, Any]:
        """
        Fetch MITRE ATT&CK framework data.
        """
        url = "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json"
        
        try:
            response = self._client.get(url)
            response.raise_for_status()
            data = response.json()
            
            objects = data.get("objects", [])
            
            # Count by type
            type_counts = {}
            techniques = []
            tactics = []
            
            for obj in objects:
                obj_type = obj.get("type", "unknown")
                type_counts[obj_type] = type_counts.get(obj_type, 0) + 1
                
                if obj_type == "attack-pattern":
                    techniques.append({
                        "id": obj.get("external_references", [{}])[0].get("external_id", ""),
                        "name": obj.get("name", ""),
                        "description": obj.get("description", "")[:200] + "..." if obj.get("description") else "",
                    })
                elif obj_type == "x-mitre-tactic":
                    tactics.append({
                        "id": obj.get("external_references", [{}])[0].get("external_id", ""),
                        "name": obj.get("name", ""),
                        "shortname": obj.get("x_mitre_shortname", ""),
                    })
            
            result = {
                "spec_version": data.get("spec_version"),
                "type_counts": type_counts,
                "total_techniques": len(techniques),
                "total_tactics": len(tactics),
                "tactics": tactics[:14],  # All tactics
                "sample_techniques": techniques[:20],  # Sample techniques
            }
            
            self._save_to_cache("mitre-attack", result)
            return result
            
        except Exception as e:
            raise Exception(f"Failed to fetch MITRE ATT&CK: {str(e)}")
    
    def fetch_peeringdb(self) -> Dict[str, Any]:
        """
        Fetch PeeringDB network/facility data.
        Note: PeeringDB API requires registration for full access.
        This fetches publicly available summary data.
        """
        # Public IX (Internet Exchange) data
        url = "https://www.peeringdb.com/api/ix"
        
        try:
            response = self._client.get(url)
            response.raise_for_status()
            data = response.json()
            
            exchanges = data.get("data", [])
            
            # Analyze by country
            country_counts = {}
            us_exchanges = []
            
            for ix in exchanges:
                country = ix.get("country", "Unknown")
                country_counts[country] = country_counts.get(country, 0) + 1
                
                if country == "US":
                    us_exchanges.append({
                        "name": ix.get("name"),
                        "city": ix.get("city"),
                        "state": ix.get("region_continent"),
                        "website": ix.get("website"),
                    })
            
            result = {
                "total_exchanges": len(exchanges),
                "by_country": dict(sorted(country_counts.items(), key=lambda x: -x[1])[:20]),
                "us_exchanges": us_exchanges[:30],
                "us_exchange_count": country_counts.get("US", 0),
            }
            
            self._save_to_cache("peeringdb", result)
            return result
            
        except Exception as e:
            raise Exception(f"Failed to fetch PeeringDB: {str(e)}")
    
    def fetch_source(self, source_id: str, api_endpoint: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch data for a source based on its ID.
        """
        # Route to appropriate fetcher based on source ID
        if source_id == "cisa-kev":
            return self.fetch_cisa_kev()
        elif source_id == "mitre-attack":
            return self.fetch_mitre_attack()
        elif source_id == "peeringdb":
            return self.fetch_peeringdb()
        elif source_id.startswith("sec-"):
            # Extract CIK from the API endpoint
            if api_endpoint and "CIK" in api_endpoint:
                cik = api_endpoint.split("CIK")[1].split(".")[0]
                return self.fetch_sec_edgar(cik, source_id)
        
        # For non-API sources, return metadata only
        return {
            "source_id": source_id,
            "status": "manual_research_required",
            "note": "This source requires manual research or licensed access",
            "fetched_at": datetime.utcnow().isoformat(),
        }
    
    def fetch_with_job(self, source_id: str, source_name: str, api_endpoint: Optional[str] = None) -> str:
        """
        Fetch a source and track with a job.
        Returns the job ID.
        """
        from src.market_intel.public_data_sources import get_public_data_registry, RefreshStatus
        
        queue = get_job_queue()
        registry = get_public_data_registry()
        
        # Create job
        job = queue.create_job(
            job_type=JobType.DATA_IMPORT,
            target_id=source_id,
            target_name=source_name,
        )
        
        # Start job
        queue.start_job(job.id)
        queue.update_progress(job.id, 10, "Connecting to source...")
        
        try:
            queue.update_progress(job.id, 30, "Fetching data...")
            data = self.fetch_source(source_id, api_endpoint)
            
            queue.update_progress(job.id, 80, "Processing data...")
            
            # Update the registry source status
            source = registry.get_source(source_id)
            if source:
                source.last_refresh = datetime.utcnow()
                source.refresh_status = RefreshStatus.SUCCESS
                source.cached_data = data
                source.error_message = None
                registry._save_cache()
            
            # Complete job with result summary
            result = {
                "source_id": source_id,
                "records_fetched": len(data) if isinstance(data, list) else 1,
                "data_keys": list(data.keys()) if isinstance(data, dict) else [],
            }
            queue.complete_job(job.id, result)
            
            return job.id
            
        except Exception as e:
            # Update registry with failure
            source = registry.get_source(source_id)
            if source:
                source.refresh_status = RefreshStatus.FAILED
                source.error_message = str(e)
                registry._save_cache()
            
            queue.fail_job(job.id, str(e))
            return job.id
    
    def close(self):
        """Close the HTTP client."""
        self._client.close()


# Singleton instance
_fetcher: Optional[DataFetcher] = None


def get_data_fetcher() -> DataFetcher:
    """Get the singleton data fetcher instance."""
    global _fetcher
    if _fetcher is None:
        _fetcher = DataFetcher()
    return _fetcher

