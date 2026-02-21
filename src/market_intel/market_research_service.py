"""
LLM-Powered Market Research Service

Uses the configured LLM to research and compile market data with proper citations.
Generates comprehensive TAM/SAM/SOM analysis with footnotes.
"""

import json
import os
import re
from datetime import datetime
from typing import Optional, Dict, Any, List
import httpx

from src.admin.store import admin_store
from src.jobs.queue import get_job_queue
from src.jobs.models import JobType


class MarketResearchService:
    """
    Uses LLM to research and compile market intelligence data.
    """
    
    def __init__(self):
        from src.db_utils import db_load, db_save
        self._db_load = db_load
        self._db_save = db_save
    
    def _get_active_llm_config(self) -> Optional[Dict[str, Any]]:
        """Get the active LLM provider configuration."""
        providers = admin_store.get_llm_providers()
        for p in providers:
            if p.is_active and p.api_key:
                return {
                    "provider": p.provider,
                    "api_key": p.api_key,
                    "model": p.get_default_model(),
                }
        return None
    
    def _call_llm(self, system_prompt: str, user_prompt: str, max_tokens: int = 25000) -> str:
        """Call the active LLM provider."""
        config = self._get_active_llm_config()
        if not config:
            raise ValueError("No active LLM provider configured. Please add an API key in Admin Setup.")
        
        provider = config["provider"]
        api_key = config["api_key"]
        model = config["model"]
        
        with httpx.Client(timeout=600.0) as client:
            if provider == "openai":
                response = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "max_tokens": max_tokens,
                        "temperature": 0.3,  # Lower temperature for factual research
                    }
                )
            elif provider == "xai":
                response = client.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "max_tokens": max_tokens,
                        "temperature": 0.3,
                    }
                )
            elif provider == "anthropic":
                response = client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "Content-Type": "application/json",
                        "anthropic-version": "2023-06-01",
                    },
                    json={
                        "model": model,
                        "max_tokens": max_tokens,
                        "system": system_prompt,
                        "messages": [
                            {"role": "user", "content": user_prompt}
                        ],
                    }
                )
            else:
                raise ValueError(f"Unknown LLM provider: {provider}")
            
            if response.status_code != 200:
                print(f"LLM API error ({provider}) {response.status_code}: {response.text[:500]}")
            response.raise_for_status()
            data = response.json()
            
            if provider == "anthropic":
                stop_reason = data.get("stop_reason", "unknown")
                content_text = data["content"][0]["text"]
                print(f"Anthropic market research response: {len(content_text)} chars, stop_reason={stop_reason}")
                if stop_reason == "max_tokens":
                    print("WARNING: Market research response was truncated due to max_tokens limit")
                return content_text
            else:
                return data["choices"][0]["message"]["content"]
    
    def _save_research(self, research_id: str, data: Dict[str, Any]):
        """Save research to database."""
        self._db_save(f"research_{research_id}", data)
    
    def _load_research(self, research_id: str) -> Optional[Dict[str, Any]]:
        """Load research from database."""
        return self._db_load(f"research_{research_id}")
    
    def get_latest_research(self) -> Optional[Dict[str, Any]]:
        """Get the most recent market research."""
        return self._load_research("latest_market_research")
    
    def research_market_data(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Use LLM to research and compile market data with citations.
        
        Returns a comprehensive market research report with:
        - TAM/SAM/SOM by market segment
        - Market trends and growth rates
        - All data with proper citations and sources
        """
        # Check cache first
        if not force_refresh:
            cached = self._load_research("latest_market_research")
            if cached:
                return cached
        
        system_prompt = """You are a senior market research analyst with 20+ years of experience in enterprise telecommunications, networking, and cybersecurity markets. You specialize in market sizing (TAM/SAM/SOM), competitive analysis, and industry trends.

Your research approach:
1. ALWAYS cite specific sources with publication dates
2. Use only publicly available data from reputable sources
3. Clearly distinguish between confirmed data and estimates
4. Provide methodology notes for any calculations
5. Include confidence levels for each data point

Key sources to reference:
- IDC, Gartner, Forrester research summaries
- Dell'Oro Group SD-WAN/SASE reports
- Company SEC filings and investor presentations
- FCC reports and telecom industry data
- Synergy Research, 650 Group reports
- Industry press releases with market sizing
- Statista (as secondary verification)

Focus areas for Comcast Business Enterprise:
- Enterprise connectivity (dedicated internet, fiber, Ethernet)
- SD-WAN market
- SASE / Secure networking
- Managed network services
- UCaaS/CCaaS
- Cybersecurity services"""

        current_year = datetime.now().year
        
        user_prompt = f"""Please compile comprehensive market research for the US Enterprise Telecommunications and Connectivity market. This research is for Comcast Business, which serves enterprises billing >$1,500/month.

CRITICAL: Today's date is January 2026. You MUST find and use data from 2025 or the most recent available. DO NOT use data from 2023 unless no newer data exists. Prioritize:
1. 2025 market reports and forecasts
2. Late 2024 reports with 2025 projections
3. Most recent analyst reports available

Generate a detailed JSON response with the following structure:

{{
  "research_date": "{current_year}-01-28",
  "executive_summary": "2-3 paragraph overview of the enterprise telecom market as of 2025/2026",
  
  "tam_data": [
    {{
      "market": "Enterprise Connectivity (DIA, Fiber, Ethernet)",
      "tam_usd_billions": <number for 2025>,
      "tam_year": 2025,
      "growth_rate_cagr": "<percentage>",
      "forecast_year": 2028,
      "source": "<specific source name - MUST be 2024 or 2025 publication>",
      "source_url": "<URL if available>",
      "source_date": "<publication date - prefer 2024-2025>",
      "methodology": "<how the figure was derived>",
      "confidence": "high/medium/low",
      "notes": "<any caveats or additional context>"
    }},
    // Include entries for: SD-WAN, SASE, Managed Network Services, UCaaS, Managed Security/MSSP
  ],
  
  "market_trends": [
    {{
      "trend": "<trend title>",
      "description": "<detailed description - current as of 2025>",
      "impact": "high/medium/low",
      "direction": "growing/declining/stable",
      "growth_rate": "<if applicable>",
      "source": "<source - MUST be 2024 or 2025>",
      "source_date": "<date - prefer 2024-2025>",
      "implications_for_comcast": "<specific strategic implications>"
    }}
  ],
  
  "competitive_landscape": {{
    "summary": "<overview of competitive dynamics as of 2025>",
    "key_players": ["<list of major competitors>"],
    "market_concentration": "<fragmented/consolidated/etc>",
    "source": "<source>"
  }},
  
  "assumptions": [
    {{
      "assumption": "<description>",
      "value": "<value>",
      "source": "<source>",
      "source_url": "<URL if available>"
    }}
  ],
  
  "footnotes": [
    {{
      "id": 1,
      "citation": "<full citation - MUST include 2024 or 2025 publication date>",
      "url": "<URL>",
      "accessed_date": "2026-01-28"
    }}
  ]
}}

IMPORTANT REQUIREMENTS:
1. USE 2025 DATA ONLY - All TAM figures must be for 2025, not 2023 or earlier
2. RECENT SOURCES ONLY - All citations must be from 2024 or 2025 publications
3. Look for: Gartner Magic Quadrant 2025, IDC MarketScape 2025, Forrester Wave 2025, Dell'Oro 2025 reports
4. US market figures specifically
5. If 2025 data isn't available, use 2024 data with clear notation
6. Include URLs where publicly available
7. Be explicit about data freshness in the notes field

Return ONLY the JSON object, no additional text."""

        try:
            response = self._call_llm(system_prompt, user_prompt)
            
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                research_data = json.loads(json_match.group())
            else:
                research_data = json.loads(response)
            
            # Add metadata
            research_result = {
                "id": "latest_market_research",
                "generated_at": datetime.utcnow().isoformat(),
                "llm_provider": self._get_active_llm_config()["provider"],
                "llm_model": self._get_active_llm_config()["model"],
                "research": research_data,
            }
            
            # Cache the result
            self._save_research("latest_market_research", research_result)
            
            return research_result
            
        except json.JSONDecodeError as e:
            # Return raw response if JSON parsing fails
            research_result = {
                "id": "latest_market_research",
                "generated_at": datetime.utcnow().isoformat(),
                "llm_provider": self._get_active_llm_config()["provider"],
                "llm_model": self._get_active_llm_config()["model"],
                "raw_response": response,
                "parse_error": str(e),
            }
            self._save_research("latest_market_research", research_result)
            return research_result
        except Exception as e:
            raise Exception(f"Market research failed: {str(e)}")
    
    def research_with_job(self, force_refresh: bool = False) -> str:
        """
        Run market research with job tracking.
        Returns job ID.
        """
        queue = get_job_queue()
        
        job = queue.create_job(
            job_type=JobType.DATA_SUMMARY,  # Reuse existing job type
            target_id="market_research",
            target_name="Comprehensive Market Research",
        )
        
        queue.start_job(job.id)
        queue.update_progress(job.id, 10, "Initializing market research...")
        
        try:
            queue.update_progress(job.id, 30, "Querying LLM for market data...")
            result = self.research_market_data(force_refresh)
            
            queue.update_progress(job.id, 80, "Processing research results...")
            
            # Check if we got valid data
            if "research" in result:
                tam_count = len(result["research"].get("tam_data", []))
                trend_count = len(result["research"].get("market_trends", []))
                footnote_count = len(result["research"].get("footnotes", []))
                
                job_result = {
                    "tam_entries": tam_count,
                    "trend_entries": trend_count,
                    "footnotes": footnote_count,
                    "llm_provider": result.get("llm_provider"),
                }
            else:
                job_result = {"status": "partial", "error": result.get("parse_error")}
            
            queue.complete_job(job.id, job_result)
            return job.id
            
        except Exception as e:
            queue.fail_job(job.id, str(e))
            return job.id


# Singleton instance
_market_research_service: Optional[MarketResearchService] = None


def get_market_research_service() -> MarketResearchService:
    """Get the singleton market research service instance."""
    global _market_research_service
    if _market_research_service is None:
        _market_research_service = MarketResearchService()
    return _market_research_service

