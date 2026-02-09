#!/usr/bin/env python3
"""
Enterprise Strategy Playbook Platform
Comcast Business

A role-based platform for generating BCG/Altman-style enterprise strategy decks
and segment playbooks, with TAM/SAM/SOM analysis, market trends, and AI-assisted
playbook generation.
"""

import uvicorn

from src.config import get_settings, setup_logging


def main():
    """Run the FastAPI application."""
    settings = get_settings()
    setup_logging(settings.log_level)

    uvicorn.run(
        "src.api.app:app",
        host="0.0.0.0",
        port=3700,
        reload=(settings.app_env == "development"),
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()

