"""Unified LLM client with retry, fallback, and cost tracking.

Replaces the 8+ duplicated provider-specific implementations scattered
across competitive, insights, market_intel, strategy_report, etc.
"""

import time
import structlog
import httpx
from dataclasses import dataclass, field
from typing import Optional, List
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

logger = structlog.get_logger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Provider API endpoints
# ─────────────────────────────────────────────────────────────────────────────

PROVIDER_ENDPOINTS = {
    "openai": "https://api.openai.com/v1/chat/completions",
    "xai": "https://api.x.ai/v1/chat/completions",
    "anthropic": "https://api.anthropic.com/v1/messages",
}


# ─────────────────────────────────────────────────────────────────────────────
# Response dataclass
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class LLMResponse:
    """Standardized response from any LLM provider."""
    content: str
    provider: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: float = 0.0
    cost_estimate_usd: float = 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Transient error for retry
# ─────────────────────────────────────────────────────────────────────────────

class LLMTransientError(Exception):
    """Raised on transient HTTP errors (429, 500, 502, 503) to trigger retry."""
    pass


class LLMConfigError(Exception):
    """Raised when LLM is not configured (no API key, no active provider)."""
    pass


# ─────────────────────────────────────────────────────────────────────────────
# Token cost estimates (USD per 1K tokens)
# ─────────────────────────────────────────────────────────────────────────────

_COST_PER_1K = {
    # OpenAI
    "gpt-5.2-turbo": {"input": 0.002, "output": 0.006},
    "gpt-4o": {"input": 0.005, "output": 0.015},
    # xAI
    "grok-4-1-fast-reasoning": {"input": 0.003, "output": 0.010},
    # Anthropic
    "claude-3-opus": {"input": 0.015, "output": 0.075},
    "claude-3-sonnet": {"input": 0.003, "output": 0.015},
}


def _estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Estimate cost in USD based on model and token counts."""
    rates = _COST_PER_1K.get(model, {"input": 0.005, "output": 0.015})
    return (input_tokens / 1000 * rates["input"]) + (output_tokens / 1000 * rates["output"])


# ─────────────────────────────────────────────────────────────────────────────
# Unified LLM Client
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class LLMRequestConfig:
    """Configuration for a single LLM request."""
    max_tokens: int = 8000
    temperature: float = 0.7
    timeout_seconds: float = 180.0


class LLMClient:
    """Unified client for calling LLM APIs across providers.

    Usage:
        client = LLMClient()

        # Simple call using active admin config
        response = client.call(
            system_prompt="You are a helpful assistant.",
            user_prompt="Summarize this document...",
        )

        # Call with explicit provider/key
        response = client.call(
            system_prompt="...",
            user_prompt="...",
            provider="openai",
            api_key="sk-...",
            model="gpt-5.2-turbo",
        )

        # Call with custom config
        response = client.call(
            system_prompt="...",
            user_prompt="...",
            config=LLMRequestConfig(max_tokens=16000, timeout_seconds=300),
        )
    """

    def __init__(self) -> None:
        self._cumulative_input_tokens: int = 0
        self._cumulative_output_tokens: int = 0
        self._cumulative_cost_usd: float = 0.0
        self._request_count: int = 0

    # ── Public API ──────────────────────────────────────────────────────

    def call(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        config: Optional[LLMRequestConfig] = None,
    ) -> LLMResponse:
        """Make a synchronous LLM call.

        If provider/api_key/model are not supplied, they are resolved
        from the admin config store's active provider.
        """
        provider, api_key, model = self._resolve_credentials(provider, api_key, model)
        cfg = config or LLMRequestConfig()

        return self._call_with_retry(
            provider=provider,
            api_key=api_key,
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            config=cfg,
        )

    async def acall(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        config: Optional[LLMRequestConfig] = None,
    ) -> LLMResponse:
        """Make an async LLM call.

        Same interface as call() but uses httpx.AsyncClient.
        """
        provider, api_key, model = self._resolve_credentials(provider, api_key, model)
        cfg = config or LLMRequestConfig()

        return await self._acall_with_retry(
            provider=provider,
            api_key=api_key,
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            config=cfg,
        )

    @property
    def stats(self) -> dict:
        """Return cumulative usage statistics."""
        return {
            "total_requests": self._request_count,
            "total_input_tokens": self._cumulative_input_tokens,
            "total_output_tokens": self._cumulative_output_tokens,
            "total_cost_usd": round(self._cumulative_cost_usd, 6),
        }

    # ── Credential Resolution ──────────────────────────────────────────

    def _resolve_credentials(
        self,
        provider: Optional[str],
        api_key: Optional[str],
        model: Optional[str],
    ) -> tuple[str, str, str]:
        """Resolve provider/api_key/model from admin store if not given."""
        if provider and api_key and model:
            return provider, api_key, model

        from src.admin.store import AdminConfigStore

        admin_store = AdminConfigStore()
        active_config = admin_store.get_active_llm_config()

        if not active_config:
            raise LLMConfigError(
                "No active LLM provider configured. "
                "Please configure an LLM provider in Admin Settings."
            )

        resolved_provider = provider or active_config.provider.value
        resolved_api_key = api_key or active_config.api_key
        resolved_model = model or active_config.get_default_model()

        if not resolved_api_key:
            raise LLMConfigError(
                f"No API key configured for provider '{resolved_provider}'. "
                "Please add an API key in Admin Settings."
            )

        return resolved_provider, resolved_api_key, resolved_model

    # ── Sync Call with Retry ──────────────────────────────────────────

    @retry(
        retry=retry_if_exception_type(LLMTransientError),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        reraise=True,
    )
    def _call_with_retry(
        self,
        provider: str,
        api_key: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        config: LLMRequestConfig,
    ) -> LLMResponse:
        """Execute a sync LLM call with retry on transient errors."""
        start = time.monotonic()

        try:
            with httpx.Client(timeout=config.timeout_seconds) as client:
                if provider == "anthropic":
                    response = self._call_anthropic_sync(
                        client, api_key, model, system_prompt, user_prompt, config
                    )
                else:
                    response = self._call_openai_compatible_sync(
                        client, provider, api_key, model, system_prompt, user_prompt, config
                    )
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (429, 500, 502, 503):
                logger.warning(
                    "llm_transient_error",
                    provider=provider,
                    status_code=e.response.status_code,
                )
                raise LLMTransientError(
                    f"{provider} returned {e.response.status_code}"
                ) from e
            logger.error(
                "llm_api_error",
                provider=provider,
                status_code=e.response.status_code,
                detail=e.response.text[:500],
            )
            raise
        except httpx.TimeoutException as e:
            logger.error(
                "llm_timeout",
                provider=provider,
                timeout=config.timeout_seconds,
            )
            raise

        latency = (time.monotonic() - start) * 1000
        response.latency_ms = latency

        # Track cumulative stats
        self._cumulative_input_tokens += response.input_tokens
        self._cumulative_output_tokens += response.output_tokens
        self._cumulative_cost_usd += response.cost_estimate_usd
        self._request_count += 1

        logger.info(
            "llm_call_complete",
            provider=provider,
            model=model,
            input_tokens=response.input_tokens,
            output_tokens=response.output_tokens,
            latency_ms=round(latency, 1),
            cost_usd=round(response.cost_estimate_usd, 6),
        )

        return response

    # ── Async Call with Retry ─────────────────────────────────────────

    @retry(
        retry=retry_if_exception_type(LLMTransientError),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        reraise=True,
    )
    async def _acall_with_retry(
        self,
        provider: str,
        api_key: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        config: LLMRequestConfig,
    ) -> LLMResponse:
        """Execute an async LLM call with retry on transient errors."""
        start = time.monotonic()

        try:
            async with httpx.AsyncClient(timeout=config.timeout_seconds) as client:
                if provider == "anthropic":
                    response = await self._call_anthropic_async(
                        client, api_key, model, system_prompt, user_prompt, config
                    )
                else:
                    response = await self._call_openai_compatible_async(
                        client, provider, api_key, model, system_prompt, user_prompt, config
                    )
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (429, 500, 502, 503):
                logger.warning(
                    "llm_transient_error",
                    provider=provider,
                    status_code=e.response.status_code,
                )
                raise LLMTransientError(
                    f"{provider} returned {e.response.status_code}"
                ) from e
            logger.error(
                "llm_api_error",
                provider=provider,
                status_code=e.response.status_code,
                detail=e.response.text[:500],
            )
            raise
        except httpx.TimeoutException:
            logger.error(
                "llm_timeout",
                provider=provider,
                timeout=config.timeout_seconds,
            )
            raise

        latency = (time.monotonic() - start) * 1000
        response.latency_ms = latency

        self._cumulative_input_tokens += response.input_tokens
        self._cumulative_output_tokens += response.output_tokens
        self._cumulative_cost_usd += response.cost_estimate_usd
        self._request_count += 1

        logger.info(
            "llm_call_complete",
            provider=provider,
            model=model,
            input_tokens=response.input_tokens,
            output_tokens=response.output_tokens,
            latency_ms=round(latency, 1),
            cost_usd=round(response.cost_estimate_usd, 6),
        )

        return response

    # ── Provider-specific implementations ─────────────────────────────

    def _call_openai_compatible_sync(
        self,
        client: httpx.Client,
        provider: str,
        api_key: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        config: LLMRequestConfig,
    ) -> LLMResponse:
        """Sync call for OpenAI-compatible APIs (OpenAI, xAI)."""
        endpoint = PROVIDER_ENDPOINTS[provider]
        response = client.post(
            endpoint,
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
                "max_tokens": config.max_tokens,
                "temperature": config.temperature,
            },
        )
        response.raise_for_status()
        data = response.json()

        usage = data.get("usage", {})
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)

        return LLMResponse(
            content=data["choices"][0]["message"]["content"],
            provider=provider,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_estimate_usd=_estimate_cost(model, input_tokens, output_tokens),
        )

    async def _call_openai_compatible_async(
        self,
        client: httpx.AsyncClient,
        provider: str,
        api_key: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        config: LLMRequestConfig,
    ) -> LLMResponse:
        """Async call for OpenAI-compatible APIs (OpenAI, xAI)."""
        endpoint = PROVIDER_ENDPOINTS[provider]
        response = await client.post(
            endpoint,
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
                "max_tokens": config.max_tokens,
                "temperature": config.temperature,
            },
        )
        response.raise_for_status()
        data = response.json()

        usage = data.get("usage", {})
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)

        return LLMResponse(
            content=data["choices"][0]["message"]["content"],
            provider=provider,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_estimate_usd=_estimate_cost(model, input_tokens, output_tokens),
        )

    def _call_anthropic_sync(
        self,
        client: httpx.Client,
        api_key: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        config: LLMRequestConfig,
    ) -> LLMResponse:
        """Sync call for Anthropic API."""
        endpoint = PROVIDER_ENDPOINTS["anthropic"]
        response = client.post(
            endpoint,
            headers={
                "x-api-key": api_key,
                "Content-Type": "application/json",
                "anthropic-version": "2024-01-01",
            },
            json={
                "model": model,
                "max_tokens": config.max_tokens,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
            },
        )
        response.raise_for_status()
        data = response.json()

        usage = data.get("usage", {})
        input_tokens = usage.get("input_tokens", 0)
        output_tokens = usage.get("output_tokens", 0)

        return LLMResponse(
            content=data["content"][0]["text"],
            provider="anthropic",
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_estimate_usd=_estimate_cost(model, input_tokens, output_tokens),
        )

    async def _call_anthropic_async(
        self,
        client: httpx.AsyncClient,
        api_key: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        config: LLMRequestConfig,
    ) -> LLMResponse:
        """Async call for Anthropic API."""
        endpoint = PROVIDER_ENDPOINTS["anthropic"]
        response = await client.post(
            endpoint,
            headers={
                "x-api-key": api_key,
                "Content-Type": "application/json",
                "anthropic-version": "2024-01-01",
            },
            json={
                "model": model,
                "max_tokens": config.max_tokens,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
            },
        )
        response.raise_for_status()
        data = response.json()

        usage = data.get("usage", {})
        input_tokens = usage.get("input_tokens", 0)
        output_tokens = usage.get("output_tokens", 0)

        return LLMResponse(
            content=data["content"][0]["text"],
            provider="anthropic",
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_estimate_usd=_estimate_cost(model, input_tokens, output_tokens),
        )
