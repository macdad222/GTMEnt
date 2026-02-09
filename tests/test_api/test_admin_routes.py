"""Tests for admin API routes (LLM providers, data sources, users)."""

import pytest


class TestLLMProviders:
    """Tests for LLM provider management endpoints."""

    def test_list_llm_providers(self, client, auth_headers):
        """Should return list of configured LLM providers."""
        response = client.get("/api/admin/llm-providers", headers=auth_headers)
        assert response.status_code == 200
        providers = response.json()
        assert isinstance(providers, list)
        assert len(providers) >= 3  # openai, xai, anthropic
        
        # Check structure
        for p in providers:
            assert "provider" in p
            assert "model_name" in p
            assert "is_active" in p
            assert "has_key" in p

    def test_get_llm_provider(self, client, auth_headers):
        """Should return details for a specific provider."""
        response = client.get("/api/admin/llm-providers/openai", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "openai"

    def test_get_invalid_provider(self, client, auth_headers):
        """Should return 400 for invalid provider name."""
        response = client.get("/api/admin/llm-providers/invalid", headers=auth_headers)
        assert response.status_code == 400


class TestDataSources:
    """Tests for data source management endpoints."""

    def test_list_data_sources(self, client, auth_headers):
        """Should return list of data sources."""
        response = client.get("/api/admin/data-sources", headers=auth_headers)
        assert response.status_code == 200
        sources = response.json()
        assert isinstance(sources, list)
        assert len(sources) > 0

    def test_public_sources_connected(self, client, auth_headers):
        """Public data sources should show as connected."""
        response = client.get("/api/admin/data-sources", headers=auth_headers)
        sources = response.json()
        public = [s for s in sources if s["is_public"]]
        for s in public:
            assert s["status"] == "connected"


class TestUserManagement:
    """Tests for user CRUD endpoints."""

    def test_list_users(self, client, auth_headers):
        """Should return list of users."""
        response = client.get("/api/admin/users", headers=auth_headers)
        assert response.status_code == 200
        users = response.json()
        assert len(users) >= 1
        assert users[0]["username"] == "admin"

    def test_create_user(self, client, auth_headers):
        """Should create a new user."""
        response = client.post(
            "/api/admin/users",
            json={
                "username": "testuser",
                "name": "Test User",
                "role": "analyst",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["role"] == "analyst"

    def test_create_duplicate_user(self, client, auth_headers):
        """Should reject duplicate username."""
        # Create first user
        client.post(
            "/api/admin/users",
            json={"username": "dupuser", "name": "First", "role": "analyst"},
            headers=auth_headers,
        )
        # Try to create duplicate
        response = client.post(
            "/api/admin/users",
            json={"username": "dupuser", "name": "Second", "role": "analyst"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_list_roles(self, client, auth_headers):
        """Should return available roles."""
        response = client.get("/api/admin/roles", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "roles" in data
        role_values = [r["value"] for r in data["roles"]]
        assert "admin" in role_values
        assert "analyst" in role_values
