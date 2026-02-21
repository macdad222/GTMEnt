"""Application configuration using pydantic-settings."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str = "postgresql+psycopg2://gtm:gtm_dev_password@postgres:5432/gtm_ent"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # Auth
    jwt_secret: str = "change-me-in-production-use-a-real-secret"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 72
    gate_access_code: str = "ComcastGTM2026"

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


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
