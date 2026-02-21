"""Admin models for users, LLM configuration, and data sources."""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, SecretStr
import uuid


class UserRole(str, Enum):
    """User roles with different access levels."""
    ADMIN = "admin"
    EXEC = "exec"
    SEGMENT_LEADER = "segment_leader"
    SALES_LEADER = "sales_leader"
    ANALYST = "analyst"


class User(BaseModel):
    """Platform user model."""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str  # Login username
    name: str  # Display name
    role: UserRole
    is_active: bool = True
    password_hash: Optional[str] = None  # Hashed password (None = needs setup)
    requires_password_change: bool = True  # Force password change on first login
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    # Optional email for notifications
    email: Optional[str] = None
    
    # Optional SSO fields
    sso_provider: Optional[str] = None
    sso_subject_id: Optional[str] = None


class LLMProvider(str, Enum):
    """Supported LLM providers."""
    OPENAI = "openai"       # ChatGPT 5.2
    XAI = "xai"             # Grok 4.1
    ANTHROPIC = "anthropic" # Claude


class VoiceProvider(str, Enum):
    """Supported real-time voice AI providers."""
    GEMINI = "gemini"       # Google Gemini Multimodal Live
    GROK = "grok"           # xAI Grok Realtime Voice
    OPENAI = "openai"       # OpenAI Realtime API


class GrokVoice(str, Enum):
    """Available voices for Grok Voice Agent."""
    ARA = "Ara"      # Female, warm, friendly
    REX = "Rex"      # Male, confident, professional
    SAL = "Sal"      # Neutral, smooth, balanced
    EVE = "Eve"      # Female, energetic, upbeat
    LEO = "Leo"      # Male, authoritative, strong


class VoiceProviderConfig(BaseModel):
    """Configuration for a real-time voice AI provider."""
    
    provider: VoiceProvider
    api_key: str  # Stored encrypted in production
    is_enabled: bool = False
    model_name: str = ""  # Default model for this provider
    voice_name: str = ""  # Selected voice (e.g., Ara, Rex, Sal for Grok)
    last_tested: Optional[datetime] = None
    test_status: Optional[str] = None  # "success", "failed", "pending"
    
    @property
    def masked_key(self) -> str:
        """Return masked version of API key for display."""
        if len(self.api_key) <= 8:
            return "••••••••"
        return f"{self.api_key[:4]}••••••••{self.api_key[-4:]}"
    
    def get_default_model(self) -> str:
        """Get the default model name for this provider."""
        if self.model_name:
            return self.model_name
        defaults = {
            VoiceProvider.GEMINI: "gemini-2.0-flash-exp",
            VoiceProvider.GROK: "grok-4-realtime",
            VoiceProvider.OPENAI: "gpt-4o-realtime-preview",
        }
        return defaults.get(self.provider, "unknown")
    
    def get_default_voice(self) -> str:
        """Get the default voice name for this provider."""
        if self.voice_name:
            return self.voice_name
        defaults = {
            VoiceProvider.GEMINI: "Puck",
            VoiceProvider.GROK: "Sal",
            VoiceProvider.OPENAI: "alloy",
        }
        return defaults.get(self.provider, "")


class LLMProviderConfig(BaseModel):
    """Configuration for an LLM provider."""
    
    provider: LLMProvider
    api_key: str  # Stored encrypted in production
    is_active: bool = False
    model_name: str = ""  # Default model for this provider
    last_tested: Optional[datetime] = None
    test_status: Optional[str] = None  # "success", "failed", "pending"
    
    @property
    def masked_key(self) -> str:
        """Return masked version of API key for display."""
        if len(self.api_key) <= 8:
            return "••••••••"
        return f"{self.api_key[:4]}••••••••{self.api_key[-4:]}"
    
    def get_default_model(self) -> str:
        """Get the default model name for this provider."""
        if self.model_name:
            return self.model_name
        defaults = {
            LLMProvider.OPENAI: "gpt-5.2-turbo",
            LLMProvider.XAI: "grok-4-1-fast-reasoning",
            LLMProvider.ANTHROPIC: "claude-sonnet-4-6",
        }
        return defaults.get(self.provider, "unknown")


class DataSourceStatus(str, Enum):
    """Status of a data source connection."""
    NOT_CONFIGURED = "not_configured"
    CONNECTED = "connected"
    ERROR = "error"
    PENDING = "pending"


class DataSourceType(str, Enum):
    """Types of data sources."""
    PUBLIC = "public"
    CRM = "crm"
    CPQ = "cpq"
    TICKETING = "ticketing"
    IVR = "ivr"
    BILLING = "billing"
    TELEMETRY = "telemetry"


class DataSourceConfig(BaseModel):
    """Configuration for a data source."""
    
    id: str
    name: str
    source_type: DataSourceType
    status: DataSourceStatus = DataSourceStatus.NOT_CONFIGURED
    is_public: bool = False  # True for public sources (SEC, websites)
    connection_string: Optional[str] = None
    api_endpoint: Optional[str] = None
    api_key: Optional[str] = None
    last_sync: Optional[datetime] = None
    error_message: Optional[str] = None


class DataSourceLevel(str, Enum):
    """Data source level for playbook generation."""
    PUBLIC_ONLY = "public_only"
    ENHANCED = "enhanced"


class PlatformConfig(BaseModel):
    """Overall platform configuration."""
    
    # LLM Configuration
    llm_providers: List[LLMProviderConfig] = Field(default_factory=list)
    active_llm_provider: Optional[LLMProvider] = None
    
    # Voice AI Configuration
    voice_providers: List[VoiceProviderConfig] = Field(default_factory=list)
    default_voice_provider: Optional[VoiceProvider] = None
    
    # Data Sources
    data_sources: List[DataSourceConfig] = Field(default_factory=list)
    default_data_source_level: DataSourceLevel = DataSourceLevel.PUBLIC_ONLY
    
    # Users
    users: List[User] = Field(default_factory=list)
    
    # Updated tracking
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None
    
    def get_active_llm_config(self) -> Optional[LLMProviderConfig]:
        """Get the currently active LLM provider configuration."""
        for config in self.llm_providers:
            if config.is_active:
                return config
        return None
    
    def get_voice_provider_config(self, provider: VoiceProvider) -> Optional[VoiceProviderConfig]:
        """Get configuration for a specific voice provider."""
        for config in self.voice_providers:
            if config.provider == provider:
                return config
        return None
    
    def get_enabled_voice_providers(self) -> List[VoiceProviderConfig]:
        """Get all enabled voice provider configurations."""
        return [vp for vp in self.voice_providers if vp.is_enabled and vp.api_key]
    
    def get_connected_data_sources(self) -> List[DataSourceConfig]:
        """Get list of connected data sources."""
        return [ds for ds in self.data_sources if ds.status == DataSourceStatus.CONNECTED]
    
    def has_internal_data(self) -> bool:
        """Check if any internal (non-public) data sources are connected."""
        return any(
            ds.status == DataSourceStatus.CONNECTED and not ds.is_public
            for ds in self.data_sources
        )

