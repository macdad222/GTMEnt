"""SQLAlchemy ORM models for all platform data."""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, DateTime, ForeignKey, JSON
)
from src.database import Base


def _uuid():
    return str(uuid.uuid4())


class UserDB(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=True)
    role = Column(String, default="user")  # admin, user, analyst, exec
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)


class LLMProviderDB(Base):
    __tablename__ = "llm_providers"

    id = Column(String, primary_key=True, default=_uuid)
    provider = Column(String, nullable=False, unique=True)  # openai, xai, anthropic
    api_key = Column(String, default="")
    model_name = Column(String, default="")
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class VoiceProviderDB(Base):
    __tablename__ = "voice_providers"

    id = Column(String, primary_key=True, default=_uuid)
    provider = Column(String, nullable=False, unique=True)
    api_key = Column(String, default="")
    model_name = Column(String, default="")
    voice_name = Column(String, default="")
    is_active = Column(Boolean, default=False)
    config = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class JobDB(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=_uuid)
    job_type = Column(String, nullable=False, index=True)
    status = Column(String, default="pending", index=True)
    target_id = Column(String, nullable=True)
    target_name = Column(String, nullable=True)
    progress_pct = Column(Integer, default=0)
    progress_message = Column(String, nullable=True)
    result_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    parent_job_id = Column(String, nullable=True)
    child_job_ids = Column(JSON, default=list)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


class StrategyReportDB(Base):
    __tablename__ = "strategy_reports"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    status = Column(String, default="generating")
    data = Column(JSON, nullable=True)
    raw_llm_response = Column(Text, nullable=True)
    llm_provider = Column(String, nullable=True)
    llm_model = Column(String, nullable=True)
    generation_time_seconds = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class CompetitorDB(Base):
    __tablename__ = "competitors"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    ticker = Column(String, nullable=True)
    category = Column(String, nullable=False)
    business_url = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    scraped_content = Column(JSON, nullable=True)
    last_scraped = Column(DateTime, nullable=True)
    scrape_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CompetitiveAnalysisDB(Base):
    __tablename__ = "competitive_analyses"

    id = Column(String, primary_key=True, default=_uuid)
    competitor_ids = Column(JSON, default=list)
    data = Column(JSON, nullable=True)
    llm_provider = Column(String, nullable=True)
    llm_model = Column(String, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class MSAIntelDB(Base):
    __tablename__ = "msa_intel"

    id = Column(String, primary_key=True)
    msa_code = Column(String, nullable=False, unique=True, index=True)
    msa_name = Column(String, nullable=False)
    data = Column(JSON, nullable=True)
    llm_provider = Column(String, nullable=True)
    llm_model = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SegmentIntelDB(Base):
    __tablename__ = "segment_intel"

    id = Column(String, primary_key=True)
    segment_tier = Column(String, nullable=False, unique=True, index=True)
    data = Column(JSON, nullable=True)
    llm_provider = Column(String, nullable=True)
    llm_model = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProductRoadmapIntelDB(Base):
    __tablename__ = "product_roadmap_intel"

    id = Column(String, primary_key=True, default=_uuid)
    data = Column(JSON, nullable=True)
    llm_provider = Column(String, nullable=True)
    llm_model = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class InsightDB(Base):
    __tablename__ = "insights"

    id = Column(String, primary_key=True, default=_uuid)
    question = Column(Text, nullable=False)
    category = Column(String, default="general")
    status = Column(String, default="processing")
    response = Column(Text, nullable=True)
    executive_summary = Column(Text, nullable=True)
    data = Column(JSON, nullable=True)
    llm_provider = Column(String, nullable=True)
    llm_model = Column(String, nullable=True)
    is_starred = Column(Boolean, default=False)
    is_incorporated = Column(Boolean, default=False)
    incorporation_note = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    processing_time_seconds = Column(Float, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class AppConfigDB(Base):
    """Key-value store for platform configuration (CB config, data sources, etc.)."""
    __tablename__ = "app_config"

    key = Column(String, primary_key=True)
    value = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MarketResearchDB(Base):
    __tablename__ = "market_research"

    id = Column(String, primary_key=True)
    data = Column(JSON, nullable=True)
    llm_provider = Column(String, nullable=True)
    llm_model = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DataSummaryDB(Base):
    __tablename__ = "data_summaries"

    id = Column(String, primary_key=True)
    source_id = Column(String, nullable=False, index=True)
    source_name = Column(String, nullable=True)
    summary_text = Column(Text, nullable=True)
    llm_provider = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
