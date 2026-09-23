"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import get_settings
from app.database.session import database
from app.providers.demo_spatial import ensure_demo_gis, replace_demo_pfz
from app.schemas.common import HealthResponse

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_prefix)


@app.on_event("startup")
def initialize_database() -> None:
    """Create the user table before handling authentication requests."""
    if database.initialize():
        try:
            from app.api.auth import _hash_password
            from app.models.user import users
            users.ensure_admin_user(settings.admin_email, _hash_password(settings.admin_password))
        except Exception:
            pass

        ensure_demo_gis()
        # A labelled PFZ fallback is available immediately. /map/layers and PFZ
        # chat queries still attempt the official INCOIS source before use.
        try:
            if not database.fetchall("SELECT id FROM spatial_features WHERE dataset = ? LIMIT 1", ("PFZ",)):
                replace_demo_pfz()
        except Exception:
            pass



@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    """Return a dependency-free liveness status."""
    return HealthResponse(status="ok", service=settings.app_name, environment=settings.environment)
