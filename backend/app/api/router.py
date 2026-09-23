from fastapi import APIRouter
from app.api import alerts, auth, coastal, decisions, map, orca, reports

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(auth.router, prefix="/api")
api_router.include_router(orca.router)
api_router.include_router(map.router)
api_router.include_router(alerts.router)
api_router.include_router(reports.router)
api_router.include_router(decisions.router)
api_router.include_router(coastal.router)
api_router.include_router(coastal.router, prefix="/api")


