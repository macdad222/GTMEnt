"""Tests for the unified LLM client."""

import pytest
from unittest.mock import patch, MagicMock

from src.llm.client import (
    LLMClient,
    LLMResponse,
    LLMRequestConfig,
    LLMConfigError,
    LLMTransientError,
    _estimate_cost,
)


class TestCostEstimation:
    """Tests for token cost estimation."""

    def test_known_model_cost(self):
        """Known models should have correct cost estimates."""
        cost = _estimate_cost("gpt-5.2-turbo", input_tokens=1000, output_tokens=1000)
        assert cost > 0
        # input: 1000/1000 * 0.002 = 0.002, output: 1000/1000 * 0.006 = 0.006
        assert abs(cost - 0.008) < 0.001

    def test_unknown_model_falls_back(self):
        """Unknown models should use default rates."""
        cost = _estimate_cost("unknown-model", input_tokens=1000, output_tokens=1000)
        assert cost > 0


class TestCredentialResolution:
    """Tests for credential resolution from admin store."""

    def test_explicit_credentials(self):
        """Explicit credentials should be used as-is."""
        client = LLMClient()
        provider, key, model = client._resolve_credentials(
            "openai", "sk-test-key", "gpt-5.2-turbo"
        )
        assert provider == "openai"
        assert key == "sk-test-key"
        assert model == "gpt-5.2-turbo"

    def test_missing_config_raises(self):
        """Should raise LLMConfigError when no provider is configured."""
        client = LLMClient()
        with patch("src.admin.store.AdminConfigStore") as MockStore:
            instance = MockStore.return_value
            instance.get_active_llm_config.return_value = None
            with pytest.raises(LLMConfigError, match="No active LLM provider"):
                client._resolve_credentials(None, None, None)


class TestLLMClientStats:
    """Tests for cumulative stats tracking."""

    def test_initial_stats_zero(self):
        """Fresh client should have zero stats."""
        client = LLMClient()
        stats = client.stats
        assert stats["total_requests"] == 0
        assert stats["total_input_tokens"] == 0
        assert stats["total_output_tokens"] == 0
        assert stats["total_cost_usd"] == 0


class TestLLMRequestConfig:
    """Tests for request configuration."""

    def test_defaults(self):
        """Default config should have reasonable values."""
        cfg = LLMRequestConfig()
        assert cfg.max_tokens == 8000
        assert cfg.temperature == 0.7
        assert cfg.timeout_seconds == 180.0

    def test_custom_config(self):
        """Custom values should be respected."""
        cfg = LLMRequestConfig(max_tokens=16000, temperature=0.3, timeout_seconds=300.0)
        assert cfg.max_tokens == 16000
        assert cfg.temperature == 0.3
        assert cfg.timeout_seconds == 300.0
