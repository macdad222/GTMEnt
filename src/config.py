"""Application configuration using pydantic-settings."""

import secrets
from functools import lru_cache

import structlog
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/gtm_ent"

    # OpenAI
    openai_api_key: str = ""

    # ChromaDB
    chroma_persist_dir: str = "./data/chroma"

    # Public sources
    sec_edgar_comcast_cik: str = "0001166691"
    comcast_business_base_url: str = "https://business.comcast.com"

    # App
    app_env: str = "development"
    log_level: str = "INFO"

    # JWT / Auth
    jwt_secret_key: str = secrets.token_urlsafe(32)  # Override via env in production!
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"  # Comma-separated


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()


# ─────────────────────────────────────────────────────────────────────────────
# Structured logging setup
# ─────────────────────────────────────────────────────────────────────────────

def setup_logging(log_level: str = "INFO") -> None:
    """Configure structlog for the application."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.dev.ConsoleRenderer() if log_level == "DEBUG" else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


# Auto-configure on import
setup_logging(get_settings().log_level)

