"""Tests for authentication endpoints and JWT token flow."""

import pytest


class TestLogin:
    """Tests for the /api/admin/login endpoint."""

    def test_login_success(self, client):
        """Valid admin credentials should return a JWT token."""
        response = client.post(
            "/api/admin/login",
            json={"username": "admin", "password": "admin"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["token"] is not None
        assert data["username"] == "admin"
        assert data["role"] == "admin"

    def test_login_wrong_password(self, client):
        """Wrong password should return success=False."""
        response = client.post(
            "/api/admin/login",
            json={"username": "admin", "password": "wrongpassword"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["token"] is None

    def test_login_nonexistent_user(self, client):
        """Non-existent user should return success=False."""
        response = client.post(
            "/api/admin/login",
            json={"username": "nobody", "password": "password"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False

    def test_login_requires_password_change(self, client):
        """First login with default password should flag requiresPasswordChange."""
        response = client.post(
            "/api/admin/login",
            json={"username": "admin", "password": "admin"},
        )
        data = response.json()
        assert data["requires_password_change"] is True


class TestProtectedEndpoints:
    """Tests that endpoints require valid JWT tokens."""

    def test_health_no_auth(self, client):
        """Health check should work without auth."""
        response = client.get("/api/admin/health")
        assert response.status_code == 200

    def test_config_summary(self, client, auth_headers):
        """Config summary should work with valid auth."""
        response = client.get("/api/admin/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "active_llm_provider" in data
        assert "total_users" in data


class TestSetPassword:
    """Tests for the password change flow."""

    def test_set_password_too_short(self, client, auth_headers):
        """Password shorter than 8 chars should be rejected."""
        # First get the user ID
        login_resp = client.post(
            "/api/admin/login",
            json={"username": "admin", "password": "admin"},
        )
        user_id = login_resp.json()["user_id"]

        response = client.post(
            f"/api/admin/users/{user_id}/set-password",
            json={"password": "short", "confirm_password": "short"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_set_password_mismatch(self, client, auth_headers):
        """Mismatched passwords should be rejected."""
        login_resp = client.post(
            "/api/admin/login",
            json={"username": "admin", "password": "admin"},
        )
        user_id = login_resp.json()["user_id"]

        response = client.post(
            f"/api/admin/users/{user_id}/set-password",
            json={"password": "newpassword123", "confirm_password": "differentpassword"},
            headers=auth_headers,
        )
        assert response.status_code == 400
