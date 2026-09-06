from fastapi import APIRouter
from app.api import alerts, auth, map, orca, reports

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(orca.router)
api_router.include_router(map.router)
api_router.include_router(alerts.router)
api_router.include_router(reports.router)
