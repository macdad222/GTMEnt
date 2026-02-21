"""
LLM Summarizer - Uses configured LLM provider to generate summaries.

Supports OpenAI, xAI (Grok), and Anthropic providers.
"""

import json
import os
from datetime import datetime
from typing import Optional, Dict, Any, List
import httpx

from src.admin.store import admin_store
from src.jobs.queue import get_job_queue
from src.jobs.models import JobType


class LLMSummarizer:
    """
    Generates summaries and insights from data using LLM.
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
    
    def _call_openai(self, api_key: str, model: str, prompt: str) -> str:
        """Call OpenAI API."""
        with httpx.Client(timeout=600.0) as client:
            response = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a senior strategy consultant analyzing enterprise telecommunications and technology markets for Comcast Business. Provide concise, actionable insights."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 25000,
                    "temperature": 0.7,
                }
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    def _call_xai(self, api_key: str, model: str, prompt: str) -> str:
        """Call xAI (Grok) API."""
        with httpx.Client(timeout=600.0) as client:
            response = client.post(
                "https://api.x.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a senior strategy consultant analyzing enterprise telecommunications and technology markets for Comcast Business. Provide concise, actionable insights."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 25000,
                    "temperature": 0.7,
                }
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    def _call_anthropic(self, api_key: str, model: str, prompt: str) -> str:
        """Call Anthropic (Claude) API."""
        with httpx.Client(timeout=600.0) as client:
            response = client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01",
                },
                json={
                    "model": model,
                    "max_tokens": 25000,
                    "system": "You are a senior strategy consultant analyzing enterprise telecommunications and technology markets for Comcast Business. Provide concise, actionable insights.",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                }
            )
            if response.status_code != 200:
                print(f"Anthropic API error {response.status_code}: {response.text[:500]}")
            response.raise_for_status()
            data = response.json()
            return data["content"][0]["text"]
    
    def _call_llm(self, prompt: str) -> str:
        """Call the active LLM provider."""
        config = self._get_active_llm_config()
        if not config:
            raise ValueError("No active LLM provider configured. Please add an API key in Admin Setup.")
        
        provider = config["provider"]
        api_key = config["api_key"]
        model = config["model"]
        
        if provider == "openai":
            return self._call_openai(api_key, model, prompt)
        elif provider == "xai":
            return self._call_xai(api_key, model, prompt)
        elif provider == "anthropic":
            return self._call_anthropic(api_key, model, prompt)
        else:
            raise ValueError(f"Unknown LLM provider: {provider}")
    
    def _save_summary(self, source_id: str, summary: Dict[str, Any]):
        """Save summary to database."""
        self._db_save(f"summary_{source_id}", summary)
    
    def _load_summary(self, source_id: str) -> Optional[Dict[str, Any]]:
        """Load summary from database."""
        return self._db_load(f"summary_{source_id}")
    
    def summarize_data_source(self, source_id: str, source_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a summary for a data source.
        """
        # Build prompt based on source type
        data_str = json.dumps(data, indent=2, default=str)[:8000]  # Limit size
        
        prompt = f"""Analyze the following data from "{source_name}" and provide:

1. **Executive Summary** (2-3 sentences)
2. **Key Insights for Comcast Business Enterprise** (3-5 bullet points)
3. **Competitive Implications** (if applicable)
4. **Recommended Actions** (2-3 actionable items)
5. **Data Quality Notes** (any limitations or caveats)

Data:
```json
{data_str}
```

Format your response with clear headers and bullet points."""

        try:
            response = self._call_llm(prompt)
            
            summary = {
                "source_id": source_id,
                "source_name": source_name,
                "summary_text": response,
                "generated_at": datetime.utcnow().isoformat(),
                "llm_provider": self._get_active_llm_config()["provider"],
            }
            
            self._save_summary(source_id, summary)
            return summary
            
        except Exception as e:
            raise Exception(f"Failed to generate summary: {str(e)}")
    
    def summarize_with_job(self, source_id: str, source_name: str, data: Dict[str, Any]) -> str:
        """
        Generate summary and track with a job.
        Returns the job ID.
        """
        queue = get_job_queue()
        
        # Create job
        job = queue.create_job(
            job_type=JobType.DATA_SUMMARY,
            target_id=source_id,
            target_name=f"Summary: {source_name}",
        )
        
        # Start job
        queue.start_job(job.id)
        queue.update_progress(job.id, 20, "Preparing data for analysis...")
        
        try:
            queue.update_progress(job.id, 40, "Sending to LLM...")
            summary = self.summarize_data_source(source_id, source_name, data)
            
            queue.update_progress(job.id, 90, "Saving summary...")
            
            # Complete job
            result = {
                "source_id": source_id,
                "summary_length": len(summary.get("summary_text", "")),
                "llm_provider": summary.get("llm_provider"),
            }
            queue.complete_job(job.id, result)
            
            return job.id
            
        except Exception as e:
            queue.fail_job(job.id, str(e))
            return job.id
    
    def get_summary(self, source_id: str) -> Optional[Dict[str, Any]]:
        """Get cached summary for a source."""
        return self._load_summary(source_id)
    
    def get_all_summaries(self) -> List[Dict[str, Any]]:
        """Get all cached summaries from database."""
        summaries = []
        try:
            from src.database import get_db
            from src.db_models import AppConfigDB
            with get_db() as db:
                rows = db.query(AppConfigDB).filter(
                    AppConfigDB.key.like("summary_%")
                ).all()
                for row in rows:
                    if row.value:
                        summaries.append(row.value)
        except Exception as e:
            print(f"Error loading summaries: {e}")
        return summaries


# Singleton instance
_summarizer: Optional[LLMSummarizer] = None


def get_llm_summarizer() -> LLMSummarizer:
    """Get the singleton summarizer instance."""
    global _summarizer
    if _summarizer is None:
        _summarizer = LLMSummarizer()
    return _summarizer

