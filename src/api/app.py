"""FastAPI application factory."""

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os

from .routes import router
from src.admin.routes import router as admin_router
from src.auth.routes import router as auth_router
from src.market_intel.routes import router as market_intel_router
from src.jobs.routes import router as jobs_router
from src.segments.msa_routes import router as msa_router
from src.competitive.routes import router as competitive_router
from src.cb_config.routes import router as cb_config_router
from src.product_roadmap.routes import router as product_roadmap_router
from src.insights.routes import router as insights_router
from src.strategy_report.routes import router as strategy_report_router
from src.voice.routes import router as voice_router
from src.database import init_db
from src.config import get_settings

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Enterprise Strategy Playbook Platform",
        description=(
            "A role-based platform for generating BCG/Altman-style enterprise strategy decks "
            "and segment playbooks for Comcast Business Enterprise."
        ),
        version="0.2.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    settings = get_settings()
    allowed_origins = ["*"] if settings.app_env == "development" else [
        "http://localhost:3700",
        "https://localhost:3700",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup():
        logger.info("Initializing database tables...")
        init_db()
        logger.info("Database initialized.")

    # API routes
    app.include_router(router, prefix="/api")
    app.include_router(auth_router, prefix="/api")
    app.include_router(admin_router, prefix="/api")
    app.include_router(market_intel_router, prefix="/api")
    app.include_router(jobs_router, prefix="/api")
    app.include_router(msa_router, prefix="/api")
    app.include_router(competitive_router, prefix="/api/competitive")
    app.include_router(cb_config_router, prefix="/api")
    app.include_router(product_roadmap_router)
    app.include_router(insights_router, prefix="/api")
    app.include_router(strategy_report_router, prefix="/api")
    app.include_router(voice_router, prefix="/api")

    # Serve static files (frontend)
    # Try multiple possible locations for the frontend dist
    possible_dirs = [
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"),
        "/app/frontend/dist",
    ]
    
    static_dir = None
    for dir_path in possible_dirs:
        if os.path.exists(dir_path):
            static_dir = os.path.abspath(dir_path)
            break

    if static_dir:
        # Mount static assets
        app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")
        
        # Serve index.html for SPA routing
        @app.get("/{full_path:path}")
        async def serve_spa(request: Request, full_path: str):
            """Serve the SPA for all non-API routes."""
            # Don't serve index.html for API routes
            if full_path.startswith("api/"):
                return {"detail": "Not found"}
            
            # Check if file exists in static dir
            file_path = os.path.join(static_dir, full_path)
            if os.path.isfile(file_path):
                return FileResponse(file_path)
            
            # Fallback to index.html for SPA routing
            return FileResponse(os.path.join(static_dir, "index.html"))

    return app


# Application instance for uvicorn
app = create_app()

