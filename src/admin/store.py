"""Admin configuration store backed by PostgreSQL."""

from datetime import datetime
from typing import Optional, List
import json
import os
import hashlib
import secrets

from src.db_utils import db_load, db_save

from .models import (
    User,
    UserRole,
    LLMProvider,
    LLMProviderConfig,
    VoiceProvider,
    VoiceProviderConfig,
    DataSourceConfig,
    DataSourceStatus,
    DataSourceType,
    DataSourceLevel,
    PlatformConfig,
)


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Hash a password with salt. Returns (hash, salt)."""
    if salt is None:
        salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
    return f"{salt}${pw_hash}", salt


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against stored hash."""
    if not stored_hash or '$' not in stored_hash:
        return False
    salt, _ = stored_hash.split('$', 1)
    computed_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(computed_hash, stored_hash)


class AdminConfigStore:
    """
    In-memory store for admin configuration backed by PostgreSQL.
    
    Uses the AppConfigDB key-value table for persistence.
    """
    
    _instance: Optional["AdminConfigStore"] = None
    DB_KEY = "admin_config"
    
    def __new__(cls):
        """Singleton pattern for config store."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._config = self._load_config() or self._build_default_config()
    
    def _load_config(self) -> Optional[PlatformConfig]:
        """Load configuration from database."""
        try:
            data = db_load(self.DB_KEY)
            if data:
                
                # Reconstruct LLM providers
                llm_providers = []
                for p_data in data.get('llm_providers', []):
                    llm_providers.append(LLMProviderConfig(
                        provider=LLMProvider(p_data['provider']),
                        api_key=p_data.get('api_key', ''),
                        is_active=p_data.get('is_active', False),
                        model_name=p_data.get('model_name', ''),
                        test_status=p_data.get('test_status'),
                        last_tested=datetime.fromisoformat(p_data['last_tested']) if p_data.get('last_tested') else None,
                    ))
                
                # Reconstruct data sources
                data_sources = []
                for ds_data in data.get('data_sources', []):
                    data_sources.append(DataSourceConfig(
                        id=ds_data['id'],
                        name=ds_data['name'],
                        source_type=DataSourceType(ds_data['source_type']),
                        status=DataSourceStatus(ds_data.get('status', 'not_configured')),
                        is_public=ds_data.get('is_public', False),
                        api_endpoint=ds_data.get('api_endpoint'),
                        api_key=ds_data.get('api_key'),
                        connection_string=ds_data.get('connection_string'),
                    ))
                
                # Reconstruct users
                users = []
                for u_data in data.get('users', []):
                    password_hash = u_data.get('password_hash')
                    requires_password_change = u_data.get('requires_password_change', True)
                    
                    # If this is the admin user and has no password, set default password "admin"
                    if u_data.get('username', u_data.get('email')) == 'admin' and password_hash is None:
                        password_hash, _ = hash_password("admin")
                        requires_password_change = True  # Force password change on first login
                    
                    users.append(User(
                        id=u_data['id'],
                        username=u_data.get('username', u_data.get('email', 'admin')),  # Fallback for migration
                        name=u_data['name'],
                        role=UserRole(u_data['role']),
                        is_active=u_data.get('is_active', True),
                        password_hash=password_hash,
                        requires_password_change=requires_password_change,
                        email=u_data.get('email'),
                        created_at=datetime.fromisoformat(u_data['created_at']) if u_data.get('created_at') else datetime.utcnow(),
                        last_login=datetime.fromisoformat(u_data['last_login']) if u_data.get('last_login') else None,
                    ))
                
                active_provider = None
                if data.get('active_llm_provider'):
                    try:
                        active_provider = LLMProvider(data['active_llm_provider'])
                    except ValueError:
                        pass
                
                # Reconstruct voice providers
                voice_providers = []
                for vp_data in data.get('voice_providers', []):
                    voice_providers.append(VoiceProviderConfig(
                        provider=VoiceProvider(vp_data['provider']),
                        api_key=vp_data.get('api_key', ''),
                        is_enabled=vp_data.get('is_enabled', False),
                        model_name=vp_data.get('model_name', ''),
                        voice_name=vp_data.get('voice_name', ''),
                        test_status=vp_data.get('test_status'),
                        last_tested=datetime.fromisoformat(vp_data['last_tested']) if vp_data.get('last_tested') else None,
                    ))
                
                default_voice_provider = None
                if data.get('default_voice_provider'):
                    try:
                        default_voice_provider = VoiceProvider(data['default_voice_provider'])
                    except ValueError:
                        pass
                
                config = PlatformConfig(
                    llm_providers=llm_providers or self._build_default_config().llm_providers,
                    active_llm_provider=active_provider,
                    voice_providers=voice_providers or self._build_default_config().voice_providers,
                    default_voice_provider=default_voice_provider,
                    data_sources=data_sources or self._build_default_config().data_sources,
                    default_data_source_level=DataSourceLevel(data.get('default_data_source_level', 'public_only')),
                    users=users or self._build_default_config().users,
                )
                
                # Save config if we made any updates (like setting default password)
                self._config = config
                self._save_config()
                
                return config
        except Exception as e:
            print(f"Warning: Could not load admin config: {e}")
        return None
    
    def _save_config(self):
        """Save configuration to database."""
        try:
            data = {
                'llm_providers': [
                    {
                        'provider': p.provider.value,
                        'api_key': p.api_key,
                        'is_active': p.is_active,
                        'model_name': p.model_name,
                        'test_status': p.test_status,
                        'last_tested': p.last_tested.isoformat() if p.last_tested else None,
                    }
                    for p in self._config.llm_providers
                ],
                'active_llm_provider': self._config.active_llm_provider.value if self._config.active_llm_provider else None,
                'voice_providers': [
                    {
                        'provider': vp.provider.value,
                        'api_key': vp.api_key,
                        'is_enabled': vp.is_enabled,
                        'model_name': vp.model_name,
                        'voice_name': vp.voice_name,
                        'test_status': vp.test_status,
                        'last_tested': vp.last_tested.isoformat() if vp.last_tested else None,
                    }
                    for vp in self._config.voice_providers
                ],
                'default_voice_provider': self._config.default_voice_provider.value if self._config.default_voice_provider else None,
                'data_sources': [
                    {
                        'id': ds.id,
                        'name': ds.name,
                        'source_type': ds.source_type.value,
                        'status': ds.status.value,
                        'is_public': ds.is_public,
                        'api_endpoint': ds.api_endpoint,
                        'api_key': ds.api_key,
                        'connection_string': ds.connection_string,
                    }
                    for ds in self._config.data_sources
                ],
                'default_data_source_level': self._config.default_data_source_level.value,
                'users': [
                    {
                        'id': u.id,
                        'username': u.username,
                        'name': u.name,
                        'role': u.role.value,
                        'is_active': u.is_active,
                        'password_hash': u.password_hash,
                        'requires_password_change': u.requires_password_change,
                        'email': u.email,
                        'created_at': u.created_at.isoformat(),
                        'last_login': u.last_login.isoformat() if u.last_login else None,
                    }
                    for u in self._config.users
                ],
            }
            
            db_save(self.DB_KEY, data)
        except Exception as e:
            print(f"Warning: Could not save admin config: {e}")
    
    def _build_default_config(self) -> PlatformConfig:
        """Build default platform configuration."""
        # Default LLM providers (no keys set)
        llm_providers = [
            LLMProviderConfig(
                provider=LLMProvider.OPENAI,
                api_key="",
                is_active=False,
                model_name="gpt-5.2-turbo",
                test_status=None,
            ),
            LLMProviderConfig(
                provider=LLMProvider.XAI,
                api_key="",
                is_active=False,
                model_name="grok-4-1-fast-reasoning",
                test_status=None,
            ),
            LLMProviderConfig(
                provider=LLMProvider.ANTHROPIC,
                api_key="",
                is_active=False,
                model_name="claude-sonnet-4-6",
                test_status=None,
            ),
        ]
        
        # Default data sources
        data_sources = [
            DataSourceConfig(
                id="public-sec",
                name="SEC EDGAR",
                source_type=DataSourceType.PUBLIC,
                status=DataSourceStatus.CONNECTED,
                is_public=True,
            ),
            DataSourceConfig(
                id="public-comcast",
                name="Comcast Business Website",
                source_type=DataSourceType.PUBLIC,
                status=DataSourceStatus.CONNECTED,
                is_public=True,
            ),
            DataSourceConfig(
                id="public-census",
                name="US Census / Government Data",
                source_type=DataSourceType.PUBLIC,
                status=DataSourceStatus.CONNECTED,
                is_public=True,
            ),
            DataSourceConfig(
                id="dynamics-crm",
                name="Dynamics 365 (CRM)",
                source_type=DataSourceType.CRM,
                status=DataSourceStatus.NOT_CONFIGURED,
                is_public=False,
            ),
            DataSourceConfig(
                id="orion-cpq",
                name="Orion (CPQ)",
                source_type=DataSourceType.CPQ,
                status=DataSourceStatus.NOT_CONFIGURED,
                is_public=False,
            ),
            DataSourceConfig(
                id="servicenow",
                name="ServiceNow (Ticketing)",
                source_type=DataSourceType.TICKETING,
                status=DataSourceStatus.NOT_CONFIGURED,
                is_public=False,
            ),
            DataSourceConfig(
                id="google-ivr",
                name="Google IVR (Contact Center)",
                source_type=DataSourceType.IVR,
                status=DataSourceStatus.NOT_CONFIGURED,
                is_public=False,
            ),
        ]
        
        # Default voice providers for real-time voice AI (no keys set)
        voice_providers = [
            VoiceProviderConfig(
                provider=VoiceProvider.GEMINI,
                api_key="",
                is_enabled=False,
                model_name="gemini-2.0-flash-exp",
                test_status=None,
            ),
            VoiceProviderConfig(
                provider=VoiceProvider.GROK,
                api_key="",
                is_enabled=False,
                model_name="grok-4-realtime",
                test_status=None,
            ),
            VoiceProviderConfig(
                provider=VoiceProvider.OPENAI,
                api_key="",
                is_enabled=False,
                model_name="gpt-4o-realtime-preview",
                test_status=None,
            ),
        ]
        
        # Single initial admin user with default password "admin" - must change on first login
        default_password_hash, _ = hash_password("admin")
        default_users = [
            User(
                id="user-admin-001",
                username="admin",
                name="Administrator",
                role=UserRole.ADMIN,
                is_active=True,
                password_hash=default_password_hash,  # Default password: admin
                requires_password_change=True,  # Force password change on first login
            ),
        ]
        
        return PlatformConfig(
            llm_providers=llm_providers,
            active_llm_provider=None,
            voice_providers=voice_providers,
            default_voice_provider=None,
            data_sources=data_sources,
            default_data_source_level=DataSourceLevel.PUBLIC_ONLY,
            users=default_users,
        )
    
    @property
    def config(self) -> PlatformConfig:
        """Get current configuration."""
        return self._config
    
    # ─────────────────────────────────────────────────────────────────────────
    # LLM Provider Management
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_llm_providers(self) -> List[LLMProviderConfig]:
        """Get all LLM provider configurations."""
        return self._config.llm_providers
    
    def get_llm_provider(self, provider: LLMProvider) -> Optional[LLMProviderConfig]:
        """Get a specific LLM provider configuration."""
        for config in self._config.llm_providers:
            if config.provider == provider:
                return config
        return None
    
    def update_llm_provider(
        self,
        provider: LLMProvider,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> LLMProviderConfig:
        """Update an LLM provider configuration."""
        for i, config in enumerate(self._config.llm_providers):
            if config.provider == provider:
                # Update fields
                if api_key is not None:
                    config.api_key = api_key
                    # Auto-activate if adding API key and no provider is currently active
                    if api_key and self._config.active_llm_provider is None:
                        for other in self._config.llm_providers:
                            other.is_active = False
                        config.is_active = True
                        self._config.active_llm_provider = provider
                if model_name is not None:
                    config.model_name = model_name
                if is_active is not None:
                    # If setting active, deactivate others
                    if is_active:
                        for other in self._config.llm_providers:
                            other.is_active = False
                        self._config.active_llm_provider = provider
                    config.is_active = is_active
                
                self._config.llm_providers[i] = config
                self._config.updated_at = datetime.utcnow()
                self._save_config()
                return config
        
        raise ValueError(f"Provider {provider} not found")
    
    def test_llm_provider(self, provider: LLMProvider) -> dict:
        """
        Test an LLM provider connection.
        
        In production, this would make an actual API call.
        """
        config = self.get_llm_provider(provider)
        if not config:
            return {"success": False, "error": "Provider not found"}
        
        if not config.api_key:
            config.test_status = "failed"
            config.last_tested = datetime.utcnow()
            return {"success": False, "error": "API key not configured"}
        
        # Mock test - in production, make actual API call
        # For now, consider valid if key is non-empty and has reasonable length
        if len(config.api_key) >= 20:
            config.test_status = "success"
            config.last_tested = datetime.utcnow()
            return {"success": True, "model": config.get_default_model()}
        else:
            config.test_status = "failed"
            config.last_tested = datetime.utcnow()
            return {"success": False, "error": "Invalid API key format"}
    
    def get_active_llm_config(self) -> Optional[LLMProviderConfig]:
        """Get the currently active LLM configuration."""
        return self._config.get_active_llm_config()
    
    # ─────────────────────────────────────────────────────────────────────────
    # Voice Provider Management
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_voice_providers(self) -> List[VoiceProviderConfig]:
        """Get all voice provider configurations."""
        return self._config.voice_providers
    
    def get_voice_provider(self, provider: VoiceProvider) -> Optional[VoiceProviderConfig]:
        """Get a specific voice provider configuration."""
        return self._config.get_voice_provider_config(provider)
    
    def update_voice_provider(
        self,
        provider: VoiceProvider,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        voice_name: Optional[str] = None,
        is_enabled: Optional[bool] = None,
    ) -> VoiceProviderConfig:
        """Update a voice provider configuration."""
        for i, config in enumerate(self._config.voice_providers):
            if config.provider == provider:
                # Update fields
                if api_key is not None:
                    config.api_key = api_key
                    # Auto-enable if adding API key and no provider is currently default
                    if api_key and self._config.default_voice_provider is None:
                        config.is_enabled = True
                        self._config.default_voice_provider = provider
                if model_name is not None:
                    config.model_name = model_name
                if voice_name is not None:
                    config.voice_name = voice_name
                if is_enabled is not None:
                    config.is_enabled = is_enabled
                    # If enabling and no default set, make this the default
                    if is_enabled and self._config.default_voice_provider is None:
                        self._config.default_voice_provider = provider
                
                self._config.voice_providers[i] = config
                self._config.updated_at = datetime.utcnow()
                self._save_config()
                return config
        
        raise ValueError(f"Voice provider {provider} not found")
    
    def set_default_voice_provider(self, provider: VoiceProvider) -> VoiceProviderConfig:
        """Set the default voice provider."""
        config = self.get_voice_provider(provider)
        if not config:
            raise ValueError(f"Voice provider {provider} not found")
        if not config.api_key:
            raise ValueError(f"Voice provider {provider} has no API key configured")
        
        self._config.default_voice_provider = provider
        self._config.updated_at = datetime.utcnow()
        self._save_config()
        return config
    
    def get_voice_api_keys(self) -> dict:
        """Get API keys and voice settings for enabled voice providers (for frontend use)."""
        keys = {}
        voices = {}
        default_provider = None
        
        for vp in self._config.voice_providers:
            if vp.api_key and vp.is_enabled:
                keys[vp.provider.value] = vp.api_key
                voices[vp.provider.value] = vp.get_default_voice()
                if self._config.default_voice_provider == vp.provider:
                    default_provider = vp.provider.value
        
        # If no default set, use the first enabled provider
        if not default_provider and keys:
            default_provider = list(keys.keys())[0]
        
        return {
            "api_keys": keys,
            "voices": voices,
            "default_provider": default_provider,
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # Data Source Management
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_data_sources(self) -> List[DataSourceConfig]:
        """Get all data source configurations."""
        return self._config.data_sources
    
    def get_data_source(self, source_id: str) -> Optional[DataSourceConfig]:
        """Get a specific data source configuration."""
        for ds in self._config.data_sources:
            if ds.id == source_id:
                return ds
        return None
    
    def update_data_source(
        self,
        source_id: str,
        api_endpoint: Optional[str] = None,
        api_key: Optional[str] = None,
        connection_string: Optional[str] = None,
    ) -> DataSourceConfig:
        """Update a data source configuration."""
        for i, ds in enumerate(self._config.data_sources):
            if ds.id == source_id:
                if api_endpoint is not None:
                    ds.api_endpoint = api_endpoint
                if api_key is not None:
                    ds.api_key = api_key
                if connection_string is not None:
                    ds.connection_string = connection_string
                
                # Set status to pending if connection info provided
                if api_endpoint or api_key or connection_string:
                    ds.status = DataSourceStatus.PENDING
                
                self._config.data_sources[i] = ds
                self._config.updated_at = datetime.utcnow()
                self._save_config()
                return ds
        
        raise ValueError(f"Data source {source_id} not found")
    
    def test_data_source(self, source_id: str) -> dict:
        """
        Test a data source connection.
        
        In production, this would make an actual connection attempt.
        """
        ds = self.get_data_source(source_id)
        if not ds:
            return {"success": False, "error": "Data source not found"}
        
        # Public sources are always connected
        if ds.is_public:
            ds.status = DataSourceStatus.CONNECTED
            ds.last_sync = datetime.utcnow()
            return {"success": True, "message": "Public source active"}
        
        # For internal sources, check if connection info is provided
        has_connection = ds.api_endpoint or ds.api_key or ds.connection_string
        if has_connection:
            # Mock success - in production, make actual connection
            ds.status = DataSourceStatus.CONNECTED
            ds.last_sync = datetime.utcnow()
            ds.error_message = None
            return {"success": True, "message": f"Connected to {ds.name}"}
        else:
            ds.status = DataSourceStatus.NOT_CONFIGURED
            return {"success": False, "error": "Connection information not configured"}
    
    def get_default_data_level(self) -> DataSourceLevel:
        """Get the default data source level for playbook generation."""
        return self._config.default_data_source_level
    
    def set_default_data_level(self, level: DataSourceLevel) -> None:
        """Set the default data source level for playbook generation."""
        self._config.default_data_source_level = level
        self._config.updated_at = datetime.utcnow()
        self._save_config()
    
    def has_internal_data(self) -> bool:
        """Check if any internal data sources are connected."""
        return self._config.has_internal_data()
    
    # ─────────────────────────────────────────────────────────────────────────
    # User Management
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_users(self) -> List[User]:
        """Get all users."""
        return self._config.users
    
    def get_user(self, user_id: str) -> Optional[User]:
        """Get a user by ID."""
        for user in self._config.users:
            if user.id == user_id:
                return user
        return None
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get a user by username."""
        for user in self._config.users:
            if user.username.lower() == username.lower():
                return user
        return None
    
    def create_user(
        self,
        username: str,
        name: str,
        role: UserRole,
        email: Optional[str] = None,
    ) -> User:
        """Create a new user."""
        # Check for duplicate username
        if self.get_user_by_username(username):
            raise ValueError(f"User with username {username} already exists")
        
        user = User(
            username=username,
            name=name,
            role=role,
            email=email,
            is_active=True,
            password_hash=None,
            requires_password_change=True,
        )
        self._config.users.append(user)
        self._config.updated_at = datetime.utcnow()
        self._save_config()
        return user
    
    def set_user_password(self, user_id: str, password: str) -> bool:
        """Set or update a user's password."""
        for i, user in enumerate(self._config.users):
            if user.id == user_id:
                user.password_hash, _ = hash_password(password)
                user.requires_password_change = False
                self._config.users[i] = user
                self._config.updated_at = datetime.utcnow()
                self._save_config()
                return True
        return False
    
    def verify_user_password(self, username: str, password: str) -> Optional[User]:
        """Verify username and password, return user if valid."""
        user = self.get_user_by_username(username)
        if not user or not user.is_active:
            return None
        if not user.password_hash:
            # No password set yet - allow login for initial setup
            return user
        if verify_password(password, user.password_hash):
            # Update last login
            user.last_login = datetime.utcnow()
            self._save_config()
            return user
        return None
    
    def user_needs_password_setup(self, username: str) -> bool:
        """Check if user needs to set up their password."""
        user = self.get_user_by_username(username)
        return user is not None and (user.password_hash is None or user.requires_password_change)
    
    def update_user(
        self,
        user_id: str,
        name: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
    ) -> User:
        """Update a user."""
        for i, user in enumerate(self._config.users):
            if user.id == user_id:
                if name is not None:
                    user.name = name
                if role is not None:
                    user.role = role
                if is_active is not None:
                    user.is_active = is_active
                
                self._config.users[i] = user
                self._config.updated_at = datetime.utcnow()
                self._save_config()
                return user
        
        raise ValueError(f"User {user_id} not found")
    
    def delete_user(self, user_id: str) -> bool:
        """Delete a user (soft delete - sets inactive)."""
        for i, user in enumerate(self._config.users):
            if user.id == user_id:
                user.is_active = False
                self._config.users[i] = user
                self._config.updated_at = datetime.utcnow()
                self._save_config()
                return True
        return False


# Singleton instance for use across the application
admin_store = AdminConfigStore()

