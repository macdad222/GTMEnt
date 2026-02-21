#!/usr/bin/env python3
"""
Enterprise Strategy Playbook Platform
Comcast Business

A role-based platform for generating BCG/Altman-style enterprise strategy decks
and segment playbooks, with TAM/SAM/SOM analysis, market trends, and AI-assisted
playbook generation.
"""

import uvicorn
from src.api.app import app


def main():
    """Run the FastAPI application (development mode)."""
    uvicorn.run(
        "src.api.app:app",
        host="0.0.0.0",
        port=3700,
        log_level="info",
    )


if __name__ == "__main__":
    main()

