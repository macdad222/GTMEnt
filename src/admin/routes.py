"""Admin API routes for user management, LLM config, and data sources."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime

from .models import (
    User,
    UserRole,
    LLMProvider,
    LLMProviderConfig,
    DataSourceConfig,
    DataSourceStatus,
    DataSourceLevel,
)
from .store import AdminConfigStore


router = APIRouter(prefix="/admin", tags=["Admin"])

# Singleton store instance
_admin_store = AdminConfigStore()


def get_admin_store() -> AdminConfigStore:
    """Dependency to get admin store."""
    return _admin_store


# ─────────────────────────────────────────────────────────────────────────────
# Request/Response Models
# ─────────────────────────────────────────────────────────────────────────────


class LLMProviderResponse(BaseModel):
    """LLM provider info for API response (with masked key)."""
    provider: str
    provider_label: str
    model_name: str
    is_active: bool
    has_key: bool
    masked_key: str
    test_status: Optional[str]
    last_tested: Optional[datetime]


class UpdateLLMProviderRequest(BaseModel):
    """Request to update an LLM provider."""
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    is_active: Optional[bool] = None


class DataSourceResponse(BaseModel):
    """Data source info for API response."""
    id: str
    name: str
    source_type: str
    status: str
    is_public: bool
    has_connection: bool
    last_sync: Optional[datetime]
    error_message: Optional[str]


class UpdateDataSourceRequest(BaseModel):
    """Request to update a data source."""
    api_endpoint: Optional[str] = None
    api_key: Optional[str] = None
    connection_string: Optional[str] = None


class UserResponse(BaseModel):
    """User info for API response."""
    id: str
    username: str
    name: str
    role: str
    role_label: str
    is_active: bool
    requires_password_change: bool
    email: Optional[str]
    created_at: datetime
    last_login: Optional[datetime]


class CreateUserRequest(BaseModel):
    """Request to create a new user."""
    username: str
    name: str
    role: str
    email: Optional[str] = None


class UpdateUserRequest(BaseModel):
    """Request to update a user."""
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class LoginRequest(BaseModel):
    """Request to login."""
    username: str
    password: Optional[str] = None


class SetPasswordRequest(BaseModel):
    """Request to set user password."""
    password: str
    confirm_password: str


class LoginResponse(BaseModel):
    """Response for login."""
    success: bool
    user_id: Optional[str] = None
    username: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    requires_password_change: bool = False
    message: Optional[str] = None


class ConfigSummaryResponse(BaseModel):
    """Overall config summary for admin dashboard."""
    active_llm_provider: Optional[str]
    active_llm_model: Optional[str]
    llm_providers_configured: int
    data_sources_connected: int
    data_sources_total: int
    has_internal_data: bool
    default_data_level: str
    total_users: int
    active_users: int


# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────


def _provider_label(provider: LLMProvider) -> str:
    """Get human-readable label for LLM provider."""
    labels = {
        LLMProvider.OPENAI: "OpenAI (ChatGPT 5.2)",
        LLMProvider.XAI: "xAI (Grok 4.1)",
        LLMProvider.ANTHROPIC: "Anthropic (Claude)",
    }
    return labels.get(provider, provider.value)


def _role_label(role: UserRole) -> str:
    """Get human-readable label for user role."""
    labels = {
        UserRole.ADMIN: "Administrator",
        UserRole.EXEC: "Executive",
        UserRole.SEGMENT_LEADER: "Segment Leader",
        UserRole.SALES_LEADER: "Sales Leader",
        UserRole.ANALYST: "Analyst",
    }
    return labels.get(role, role.value)


def _llm_config_to_response(config: LLMProviderConfig) -> LLMProviderResponse:
    """Convert LLM config to API response."""
    return LLMProviderResponse(
        provider=config.provider.value,
        provider_label=_provider_label(config.provider),
        model_name=config.get_default_model(),
        is_active=config.is_active,
        has_key=bool(config.api_key),
        masked_key=config.masked_key if config.api_key else "",
        test_status=config.test_status,
        last_tested=config.last_tested,
    )


def _data_source_to_response(ds: DataSourceConfig) -> DataSourceResponse:
    """Convert data source config to API response."""
    has_connection = bool(ds.api_endpoint or ds.api_key or ds.connection_string)
    return DataSourceResponse(
        id=ds.id,
        name=ds.name,
        source_type=ds.source_type.value,
        status=ds.status.value,
        is_public=ds.is_public,
        has_connection=has_connection or ds.is_public,
        last_sync=ds.last_sync,
        error_message=ds.error_message,
    )


def _user_to_response(user: User) -> UserResponse:
    """Convert user to API response."""
    return UserResponse(
        id=user.id,
        username=user.username,
        name=user.name,
        role=user.role.value,
        role_label=_role_label(user.role),
        is_active=user.is_active,
        requires_password_change=user.requires_password_change,
        email=user.email,
        created_at=user.created_at,
        last_login=user.last_login,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Config Summary
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/config", response_model=ConfigSummaryResponse)
async def get_config_summary(store: AdminConfigStore = Depends(get_admin_store)):
    """Get overall configuration summary."""
    active_llm = store.get_active_llm_config()
    llm_providers = store.get_llm_providers()
    data_sources = store.get_data_sources()
    users = store.get_users()
    
    return ConfigSummaryResponse(
        active_llm_provider=_provider_label(active_llm.provider) if active_llm else None,
        active_llm_model=active_llm.get_default_model() if active_llm else None,
        llm_providers_configured=sum(1 for p in llm_providers if p.api_key),
        data_sources_connected=sum(1 for ds in data_sources if ds.status == DataSourceStatus.CONNECTED),
        data_sources_total=len(data_sources),
        has_internal_data=store.has_internal_data(),
        default_data_level=store.get_default_data_level().value,
        total_users=len(users),
        active_users=sum(1 for u in users if u.is_active),
    )


# ─────────────────────────────────────────────────────────────────────────────
# LLM Provider Routes
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/llm-providers", response_model=List[LLMProviderResponse])
async def list_llm_providers(store: AdminConfigStore = Depends(get_admin_store)):
    """List all LLM providers and their configuration status."""
    providers = store.get_llm_providers()
    return [_llm_config_to_response(p) for p in providers]


@router.get("/llm-providers/{provider}", response_model=LLMProviderResponse)
async def get_llm_provider(
    provider: str,
    store: AdminConfigStore = Depends(get_admin_store),
):
    """Get a specific LLM provider configuration."""
    try:
        llm_provider = LLMProvider(provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")
    
    config = store.get_llm_provider(llm_provider)
    if not config:
        raise HTTPException(status_code=404, detail=f"Provider {provider} not found")
    
    return _llm_config_to_response(config)


@router.put("/llm-providers/{provider}", response_model=LLMProviderResponse)
async def update_llm_provider(
    provider: str,
    request: UpdateLLMProviderRequest,
    store: AdminConfigStore = Depends(get_admin_store),
):
    """Update an LLM provider configuration."""
    try:
        llm_provider = LLMProvider(provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")
    
    try:
        config = store.update_llm_provider(
            provider=llm_provider,
            api_key=request.api_key,
            model_name=request.model_name,
            is_active=request.is_active,
        )
        return _llm_config_to_response(config)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/llm-providers/{provider}/test")
async def test_llm_provider(
    provider: str,
    store: AdminConfigStore = Depends(get_admin_store),
):
    """Test an LLM provider connection."""
    try:
        llm_provider = LLMProvider(provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")
    
    result = store.test_llm_provider(llm_provider)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Data Source Routes
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/data-sources", response_model=List[DataSourceResponse])
async def list_data_sources(store: AdminConfigStore = Depends(get_admin_store)):
    """List all data sources and their connection status."""
    sources = store.get_data_sources()
    return [_data_source_to_response(ds) for ds in sources]


@router.get("/data-sources/{source_id}", response_model=DataSourceResponse)
async def get_data_source(
    source_id: str,
    store: AdminConfigStore = Depends(get_admin_store),
):
    """Get a specific data source configuration."""
    ds = store.get_data_source(source_id)
    if not ds:
        raise HTTPException(status_code=404, detail=f"Data source {source_id} not found")
    
    return _data_source_to_response(ds)


@router.put("/data-sources/{source_id}", response_model=DataSourceResponse)
async def update_data_source(
    source_id: str,
    request: UpdateDataSourceRequest,
    store: AdminConfigStore = Depends(get_admin_store),
):
    """Update a data source configuration."""
    try:
        ds = store.update_data_source(
            source_id=source_id,
            api_endpoint=request.api_endpoint,
            api_key=request.api_key,
            connection_string=request.connection_string,
        )
        return _data_source_to_response(ds)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/data-sources/{source_id}/test")
async def test_data_source(
    source_id: str,
    store: AdminConfigStore = Depends(get_admin_store),
):
    """Test a data source connection."""
    result = store.test_data_source(source_id)
    return result


@router.get("/data-level")
async def get_default_data_level(store: AdminConfigStore = Depends(get_admin_store)):
    """Get the default data source level for playbook generation."""
    level = store.get_default_data_level()
    return {
        "level": level.value,
        "label": "Public Only" if level == DataSourceLevel.PUBLIC_ONLY else "Enhanced (Internal Data)",
        "has_internal_data": store.has_internal_data(),
    }


@router.put("/data-level")
async def set_default_data_level(
    level: str,
    store: AdminConfigStore = Depends(get_admin_store),
):
    """Set the default data source level for playbook generation."""
    try:
        data_level = DataSourceLevel(level)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid level: {level}. Use 'public_only' or 'enhanced'")
    
    # Check if enhanced is possible
    if data_level == DataSourceLevel.ENHANCED and not store.has_internal_data():
        raise HTTPException(
            status_code=400,
            detail="Cannot set enhanced mode - no internal data sources connected",
        )
    
    store.set_default_data_level(data_level)
    return {"level": data_level.value, "message": "Default data level updated"}


# ─────────────────────────────────────────────────────────────────────────────
# User Management Routes
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    include_inactive: bool = False,
    store: AdminConfigStore = Depends(get_admin_store),
):
    """List all users."""
    users = store.get_users()
    if not include_inactive:
        users = [u for u in users if u.is_active]
    return [_user_to_response(u) for u in users]


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    store: AdminConfigStore = Depends(get_admin_store),
):
    """Get a specific user."""
    user = store.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    return _user_to_response(user)


@router.post("/users", response_model=UserResponse)
async def create_user(
    request: CreateUserRequest,
    store: AdminConfigStore = Depends(get_admin_store),
):
    """Create a new user."""
    try:
        role = UserRole(request.role)
    except ValueError:
        valid_roles = [r.value for r in UserRole]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role: {request.role}. Valid roles: {valid_roles}",
        )
    
    try:
        user = store.create_user(
            username=request.username,
            name=request.name,
            role=role,
            email=request.email,
        )
        return _user_to_response(user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    store: AdminConfigStore = Depends(get_admin_store),
):
    """Update a user."""
    role = None
    if request.role:
        try:
            role = UserRole(request.role)
        except ValueError:
            valid_roles = [r.value for r in UserRole]
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role: {request.role}. Valid roles: {valid_roles}",
            )
    
    try:
        user = store.update_user(
            user_id=user_id,
            name=request.name,
            role=role,
            is_active=request.is_active,
        )
        return _user_to_response(user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    store: AdminConfigStore = Depends(get_admin_store),
):
    """Delete (deactivate) a user."""
    success = store.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    return {"message": "User deactivated", "user_id": user_id}


# ─────────────────────────────────────────────────────────────────────────────
# Role Definitions (for UI)
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/roles")
async def list_roles():
    """List available user roles with descriptions."""
    return {
        "roles": [
            {
                "value": UserRole.ADMIN.value,
                "label": "Administrator",
                "description": "Full platform access including user management and configuration",
            },
            {
                "value": UserRole.EXEC.value,
                "label": "Executive",
                "description": "View all segments, generate and approve playbooks",
            },
            {
                "value": UserRole.SEGMENT_LEADER.value,
                "label": "Segment Leader",
                "description": "Manage assigned segments and their playbooks",
            },
            {
                "value": UserRole.SALES_LEADER.value,
                "label": "Sales Leader",
                "description": "View playbooks and KPIs for sales execution",
            },
            {
                "value": UserRole.ANALYST.value,
                "label": "Analyst",
                "description": "View-only access to market intelligence and segments",
            },
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# Authentication Routes
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    store: AdminConfigStore = Depends(get_admin_store),
):
    """Login with username and password."""
    # Check if user exists
    user = store.get_user_by_username(request.username)
    if not user:
        return LoginResponse(success=False, message="Invalid username or password")
    
    if not user.is_active:
        return LoginResponse(success=False, message="User account is deactivated")
    
    # Check if user needs password setup (first login)
    if user.password_hash is None:
        return LoginResponse(
            success=True,
            user_id=user.id,
            username=user.username,
            name=user.name,
            role=user.role.value,
            requires_password_change=True,
            message="Please set your password",
        )
    
    # Verify password
    verified_user = store.verify_user_password(request.username, request.password or "")
    if not verified_user:
        return LoginResponse(success=False, message="Invalid username or password")
    
    return LoginResponse(
        success=True,
        user_id=verified_user.id,
        username=verified_user.username,
        name=verified_user.name,
        role=verified_user.role.value,
        requires_password_change=verified_user.requires_password_change,
    )


@router.post("/users/{user_id}/set-password")
async def set_password(
    user_id: str,
    request: SetPasswordRequest,
    store: AdminConfigStore = Depends(get_admin_store),
):
    """Set or change a user's password."""
    if request.password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    user = store.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    success = store.set_user_password(user_id, request.password)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to set password")
    
    return {"success": True, "message": "Password set successfully"}


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "admin"}

