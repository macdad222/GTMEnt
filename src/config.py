"""Application configuration using pydantic-settings."""

from functools import lru_cache
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


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()

