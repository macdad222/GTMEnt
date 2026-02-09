"""Shared test fixtures for the GTMEnt test suite."""

import os
import json
import tempfile
import pytest
from unittest.mock import patch

from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def tmp_data_dir(tmp_path):
    """Use a temporary directory for all data files during tests."""
    data_dir = tmp_path / "data"
    data_dir.mkdir()

    # Patch all CONFIG_FILE / QUEUE_FILE / data paths
    patches = [
        patch("src.admin.store.AdminConfigStore.CONFIG_FILE", str(data_dir / "admin_config.json")),
        patch("src.jobs.queue.JobQueue.QUEUE_FILE", str(data_dir / "job_queue.json")),
    ]
    for p in patches:
        p.start()

    # Set DATA_DIR env var for services that use it
    os.environ["DATA_DIR"] = str(data_dir)

    yield data_dir

    for p in patches:
        p.stop()

    if "DATA_DIR" in os.environ:
        del os.environ["DATA_DIR"]


@pytest.fixture
def reset_admin_store():
    """Reset the AdminConfigStore singleton between tests."""
    from src.admin.store import AdminConfigStore
    AdminConfigStore._instance = None
    yield
    AdminConfigStore._instance = None


@pytest.fixture
def app(reset_admin_store):
    """Create a fresh FastAPI test app."""
    from src.api.app import create_app
    return create_app()


@pytest.fixture
def client(app):
    """Create a FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def auth_token(client):
    """Login and return a valid JWT token."""
    response = client.post(
        "/api/admin/login",
        json={"username": "admin", "password": "admin"},
    )
    data = response.json()
    assert data["success"], f"Login failed: {data}"
    return data.get("token")


@pytest.fixture
def auth_headers(auth_token):
    """Return headers with a valid bearer token."""
    return {"Authorization": f"Bearer {auth_token}"}
