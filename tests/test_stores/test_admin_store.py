"""Tests for the AdminConfigStore."""

import pytest

from src.admin.store import AdminConfigStore, hash_password, verify_password
from src.admin.models import LLMProvider, UserRole


class TestPasswordHashing:
    """Tests for password hashing utilities."""

    def test_hash_and_verify(self):
        """Hashed password should verify correctly."""
        hashed, salt = hash_password("mypassword")
        assert verify_password("mypassword", hashed)

    def test_wrong_password_fails(self):
        """Wrong password should not verify."""
        hashed, _ = hash_password("correct")
        assert not verify_password("wrong", hashed)

    def test_hash_deterministic_with_salt(self):
        """Same password + salt should produce same hash."""
        hash1, salt = hash_password("test", salt="fixed-salt")
        hash2, _ = hash_password("test", salt="fixed-salt")
        assert hash1 == hash2

    def test_different_salts_different_hashes(self):
        """Different salts should produce different hashes."""
        hash1, _ = hash_password("test")
        hash2, _ = hash_password("test")
        # Random salts should differ
        assert hash1 != hash2

    def test_empty_hash_fails(self):
        """Empty stored hash should not verify."""
        assert not verify_password("any", "")
        assert not verify_password("any", "noseparator")


class TestAdminConfigStore:
    """Tests for the admin config store."""

    def test_singleton(self, reset_admin_store):
        """Store should be a singleton."""
        store1 = AdminConfigStore()
        store2 = AdminConfigStore()
        assert store1 is store2

    def test_default_config(self, reset_admin_store):
        """Default config should have providers and an admin user."""
        store = AdminConfigStore()
        
        providers = store.get_llm_providers()
        assert len(providers) == 3
        
        users = store.get_users()
        assert len(users) >= 1
        assert users[0].username == "admin"

    def test_default_admin_login(self, reset_admin_store):
        """Default admin user should authenticate with 'admin' password."""
        store = AdminConfigStore()
        user = store.verify_user_password("admin", "admin")
        assert user is not None
        assert user.username == "admin"

    def test_create_user(self, reset_admin_store):
        """Should create a new user."""
        store = AdminConfigStore()
        user = store.create_user(
            username="analyst1",
            name="Analyst One",
            role=UserRole.ANALYST,
        )
        assert user.username == "analyst1"
        assert user.role == UserRole.ANALYST

        # Should be retrievable
        found = store.get_user_by_username("analyst1")
        assert found is not None
        assert found.id == user.id

    def test_duplicate_username_rejected(self, reset_admin_store):
        """Creating a user with existing username should raise."""
        store = AdminConfigStore()
        store.create_user(username="dup", name="First", role=UserRole.ANALYST)
        with pytest.raises(ValueError, match="already exists"):
            store.create_user(username="dup", name="Second", role=UserRole.ANALYST)

    def test_set_and_verify_password(self, reset_admin_store):
        """Setting a password should allow verification."""
        store = AdminConfigStore()
        user = store.create_user(
            username="newuser", name="New User", role=UserRole.ANALYST
        )
        store.set_user_password(user.id, "securepassword123")
        
        verified = store.verify_user_password("newuser", "securepassword123")
        assert verified is not None
        assert verified.requires_password_change is False

    def test_update_llm_provider(self, reset_admin_store):
        """Should update LLM provider configuration."""
        store = AdminConfigStore()
        config = store.update_llm_provider(
            provider=LLMProvider.OPENAI,
            api_key="sk-test-key-12345678901234567890",
            is_active=True,
        )
        assert config.api_key == "sk-test-key-12345678901234567890"
        assert config.is_active is True

        # Should now be the active provider
        active = store.get_active_llm_config()
        assert active is not None
        assert active.provider == LLMProvider.OPENAI

    def test_deactivate_user(self, reset_admin_store):
        """Deleting a user should soft-delete (deactivate)."""
        store = AdminConfigStore()
        user = store.create_user(
            username="temp", name="Temp User", role=UserRole.ANALYST
        )
        assert store.delete_user(user.id)
        
        found = store.get_user(user.id)
        assert found is not None
        assert found.is_active is False
