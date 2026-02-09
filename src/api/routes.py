"""API routes for the Enterprise Strategy Playbook Platform."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime

from src.data_model.models import MRRTier
from src.market_intel import TAMCalculator, MarketModel
from src.segmentation import MRRTierClassifier, SegmentView
from src.segmentation.views import SegmentSummary, SegmentViewBuilder
from src.playbook import Playbook, PlaybookGenerator, TemplateRegistry
from src.playbook.models import ApprovalStatus
from src.admin import AdminConfigStore, DataSourceLevel

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Response Models
# ─────────────────────────────────────────────────────────────────────────────


class UserInfo(BaseModel):
    """Current user information."""

    id: str
    name: str
    email: str
    role: str  # "exec", "segment_leader", "sales_leader", "analyst", "admin"


class DashboardSummary(BaseModel):
    """Executive dashboard summary."""

    total_enterprise_arr: float
    total_accounts: int
    growth_target_pct: float
    current_growth_pct: float
    segment_summaries: List[dict]
    key_trends: List[dict]
    recent_playbooks: List[dict]


class PlaybookListItem(BaseModel):
    """Playbook list item for UI."""

    id: str
    name: str
    playbook_type: str
    segment: Optional[str]
    status: str
    updated_at: datetime
    owner_name: Optional[str]


class ExportRequest(BaseModel):
    """Request to export a playbook."""

    playbook_id: str
    format: str  # "pptx" or "pdf"
    include_appendix: bool = True


class ExportResult(BaseModel):
    """Export result with download URL."""

    playbook_id: str
    format: str
    download_url: str
    expires_at: datetime


class GeneratePlaybookRequest(BaseModel):
    """Request to generate a playbook with data source options."""

    data_level: str = "public_only"  # "public_only" or "enhanced"
    llm_provider: Optional[str] = None  # Override active provider


# ─────────────────────────────────────────────────────────────────────────────
# In-memory state (replace with database in production)
# ─────────────────────────────────────────────────────────────────────────────

_playbooks: dict[str, Playbook] = {}
_tam_calculator = TAMCalculator()
_template_registry = TemplateRegistry()
_playbook_generator = PlaybookGenerator(template_registry=_template_registry)
_admin_store = AdminConfigStore()


# ─────────────────────────────────────────────────────────────────────────────
# Auth / User Routes
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/me", response_model=UserInfo)
async def get_current_user():
    """Get current user info (mock for MVP)."""
    return UserInfo(
        id="user-001",
        name="Demo User",
        email="demo@comcast.com",
        role="exec",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard Routes
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard():
    """Get executive dashboard summary."""
    # Build market model
    market_model = _tam_calculator.build_market_model(year=2025)

    # Mock segment summaries (in production, from database)
    segment_summaries = [
        {"tier": "tier_e1", "label": "E1: $1.5k–$10k", "accounts": 12500, "arr_usd": 450_000_000},
        {"tier": "tier_e2", "label": "E2: $10k–$50k", "accounts": 4200, "arr_usd": 720_000_000},
        {"tier": "tier_e3", "label": "E3: $50k–$250k", "accounts": 1100, "arr_usd": 850_000_000},
        {"tier": "tier_e4", "label": "E4: $250k–$1M", "accounts": 280, "arr_usd": 620_000_000},
        {"tier": "tier_e5", "label": "E5: $1M+", "accounts": 45, "arr_usd": 360_000_000},
    ]

    total_arr = sum(s["arr_usd"] for s in segment_summaries)
    total_accounts = sum(s["accounts"] for s in segment_summaries)

    # Key trends
    key_trends = [
        {"title": t.title, "direction": t.direction.value, "magnitude": t.magnitude}
        for t in market_model.trends[:5]
    ]

    # Recent playbooks
    recent_playbooks = [
        {"id": pb.id, "name": pb.name, "status": pb.status.value, "updated_at": pb.updated_at.isoformat()}
        for pb in sorted(_playbooks.values(), key=lambda p: p.updated_at, reverse=True)[:5]
    ]

    return DashboardSummary(
        total_enterprise_arr=total_arr,
        total_accounts=total_accounts,
        growth_target_pct=0.15,
        current_growth_pct=0.14,
        segment_summaries=segment_summaries,
        key_trends=key_trends,
        recent_playbooks=recent_playbooks,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Market Intelligence Routes
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/market/model")
async def get_market_model(year: int = Query(2025)):
    """Get the current market model with TAM and trends."""
    model = _tam_calculator.build_market_model(year=year)
    return model.model_dump()


@router.get("/market/tam-summary")
async def get_tam_summary(year: int = Query(2025)):
    """Get TAM summary for slide deck."""
    model = _tam_calculator.build_market_model(year=year)
    return _tam_calculator.summarize_for_deck(model)


# ─────────────────────────────────────────────────────────────────────────────
# Segment Routes
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/segments")
async def list_segments():
    """List all enterprise segments with summaries."""
    classifier = MRRTierClassifier()

    segments = []
    for tier in [MRRTier.TIER_E1, MRRTier.TIER_E2, MRRTier.TIER_E3, MRRTier.TIER_E4, MRRTier.TIER_E5]:
        tier_info = classifier.get_tier_info(tier)
        if tier_info:
            segments.append({
                "tier": tier.value,
                "label": tier_info.label,
                "description": tier_info.description,
                "min_mrr": tier_info.min_mrr,
                "max_mrr": tier_info.max_mrr,
            })

    return {"segments": segments}


@router.get("/segments/{tier}")
async def get_segment(tier: str):
    """Get details for a specific segment."""
    try:
        mrr_tier = MRRTier(tier)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Segment '{tier}' not found")

    classifier = MRRTierClassifier()
    tier_info = classifier.get_tier_info(mrr_tier)

    if not tier_info:
        raise HTTPException(status_code=404, detail=f"Segment '{tier}' not found")

    return {
        "tier": tier,
        "label": tier_info.label,
        "description": tier_info.description,
        "min_mrr": tier_info.min_mrr,
        "max_mrr": tier_info.max_mrr,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Playbook Routes
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/playbooks", response_model=List[PlaybookListItem])
async def list_playbooks(
    playbook_type: Optional[str] = None,
    segment: Optional[str] = None,
    status: Optional[str] = None,
):
    """List playbooks with optional filters."""
    playbooks = list(_playbooks.values())

    if playbook_type:
        playbooks = [p for p in playbooks if p.playbook_type == playbook_type]
    if segment:
        playbooks = [p for p in playbooks if p.segment == segment]
    if status:
        playbooks = [p for p in playbooks if p.status.value == status]

    return [
        PlaybookListItem(
            id=p.id,
            name=p.name,
            playbook_type=p.playbook_type,
            segment=p.segment,
            status=p.status.value,
            updated_at=p.updated_at,
            owner_name=p.owner_name,
        )
        for p in sorted(playbooks, key=lambda p: p.updated_at, reverse=True)
    ]


@router.get("/playbooks/{playbook_id}")
async def get_playbook(playbook_id: str):
    """Get a playbook by ID."""
    playbook = _playbooks.get(playbook_id)
    if not playbook:
        raise HTTPException(status_code=404, detail=f"Playbook '{playbook_id}' not found")

    return playbook.model_dump()


@router.post("/playbooks/generate/enterprise-strategy")
async def generate_enterprise_strategy(request: Optional[GeneratePlaybookRequest] = None):
    """Generate a new enterprise strategy playbook."""
    # Determine data level
    data_level = DataSourceLevel.PUBLIC_ONLY
    if request and request.data_level == "enhanced":
        if _admin_store.has_internal_data():
            data_level = DataSourceLevel.ENHANCED
        # If no internal data, fall back to public only

    market_model = _tam_calculator.build_market_model(year=2025)

    # Mock segment views (in production, from database)
    segment_views: List[SegmentView] = []  # Would be populated from data

    playbook = _playbook_generator.generate_enterprise_strategy(
        market_model=market_model,
        segment_views=segment_views,
        growth_target_pct=0.15,
        owner_name="Demo User",
    )

    # Track data sources used
    data_sources_used = ["Public Sources (SEC, Comcast Business, Census)"]
    if data_level == DataSourceLevel.ENHANCED:
        connected = _admin_store.get_data_sources()
        for ds in connected:
            if not ds.is_public and ds.status.value == "connected":
                data_sources_used.append(ds.name)

    _playbooks[playbook.id] = playbook

    return {
        "playbook_id": playbook.id,
        "name": playbook.name,
        "data_level": data_level.value,
        "data_sources_used": data_sources_used,
    }


@router.post("/playbooks/generate/segment/{tier}")
async def generate_segment_playbook(tier: str, request: Optional[GeneratePlaybookRequest] = None):
    """Generate a segment playbook."""
    try:
        mrr_tier = MRRTier(tier)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid tier '{tier}'")

    # Determine data level
    data_level = DataSourceLevel.PUBLIC_ONLY
    if request and request.data_level == "enhanced":
        if _admin_store.has_internal_data():
            data_level = DataSourceLevel.ENHANCED

    classifier = MRRTierClassifier()
    tier_info = classifier.get_tier_info(mrr_tier)

    # Create mock segment view
    builder = SegmentViewBuilder(classifier)
    segment_view = builder.build_segment_view(
        tier=mrr_tier,
        accounts=[],  # Would be populated from database
    )

    market_model = _tam_calculator.build_market_model(year=2025)

    playbook = _playbook_generator.generate_segment_playbook(
        segment_view=segment_view,
        market_model=market_model,
        owner_name="Demo User",
    )

    # Track data sources used
    data_sources_used = ["Public Sources (SEC, Comcast Business, Census)"]
    if data_level == DataSourceLevel.ENHANCED:
        connected = _admin_store.get_data_sources()
        for ds in connected:
            if not ds.is_public and ds.status.value == "connected":
                data_sources_used.append(ds.name)

    _playbooks[playbook.id] = playbook

    return {
        "playbook_id": playbook.id,
        "name": playbook.name,
        "data_level": data_level.value,
        "data_sources_used": data_sources_used,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Export Routes
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/export", response_model=ExportResult)
async def export_playbook(request: ExportRequest):
    """Export a playbook to PPTX or PDF."""
    playbook = _playbooks.get(request.playbook_id)
    if not playbook:
        raise HTTPException(status_code=404, detail=f"Playbook '{request.playbook_id}' not found")

    if request.format not in ["pptx", "pdf"]:
        raise HTTPException(status_code=400, detail="Format must be 'pptx' or 'pdf'")

    # In production, generate file and return signed URL
    # For MVP, return mock URL
    return ExportResult(
        playbook_id=request.playbook_id,
        format=request.format,
        download_url=f"/api/exports/{request.playbook_id}.{request.format}",
        expires_at=datetime.utcnow(),
    )


# ─────────────────────────────────────────────────────────────────────────────
# KPI Routes
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/kpis")
async def list_kpis():
    """List all KPI definitions."""
    from src.data_model.semantic_layer import SemanticLayer

    semantic_layer = SemanticLayer()
    return {"kpis": semantic_layer.export_for_deck()}


@router.get("/kpis/growth")
async def get_growth_kpis():
    """Get KPIs relevant to 15% growth target."""
    from src.data_model.semantic_layer import SemanticLayer

    semantic_layer = SemanticLayer()
    growth_kpis = semantic_layer.get_growth_kpis()

    return {
        "kpis": [
            {
                "id": k.id,
                "name": k.name,
                "description": k.description,
                "formula": k.formula,
                "target": k.target_value,
            }
            for k in growth_kpis
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# Admin Routes
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/admin/templates")
async def list_templates():
    """List available playbook templates."""
    templates = _template_registry.list_all()
    return {
        "templates": [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "playbook_type": t.playbook_type,
                "section_count": len(t.sections),
                "estimated_pages": t.estimated_pages,
            }
            for t in templates
        ]
    }


@router.get("/admin/health")
async def health_check():
    """Health check endpoint with dependency status."""
    import os

    checks = {
        "api": "healthy",
        "data_dir": "healthy" if os.path.isdir("./data") else "missing",
    }

    # Check admin config readability
    try:
        store = AdminConfigStore()
        _ = store.config
        checks["admin_store"] = "healthy"
    except Exception:
        checks["admin_store"] = "degraded"

    # Check LLM config
    active_llm = _admin_store.get_active_llm_config()
    checks["llm_configured"] = "configured" if active_llm and active_llm.api_key else "not_configured"

    overall = "healthy" if all(v in ("healthy", "configured") for v in checks.values()) else "degraded"

    return {
        "status": overall,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks,
    }

