from typing import Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from app.schemas.resources import AlertListResponse, AlertResponse
from app.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["alerts"])
_service = AlertService()


class LocationAlertCheckRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class LocationAlertCheckResponse(BaseModel):
    status: str
    latitude: float
    longitude: float
    alert_count: int
    alerts: list[dict[str, Any]]


@router.get("", response_model=AlertListResponse)
async def list_alerts() -> AlertListResponse:
    return AlertListResponse(items=_service.list())


@router.get("/check", response_model=LocationAlertCheckResponse)
async def check_alerts_get(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
) -> LocationAlertCheckResponse:
    alerts = await _service.check_location_alerts(latitude, longitude)
    return LocationAlertCheckResponse(
        status="ok",
        latitude=latitude,
        longitude=longitude,
        alert_count=len(alerts),
        alerts=alerts,
    )


@router.post("/check", response_model=LocationAlertCheckResponse)
async def check_alerts_post(
    request: LocationAlertCheckRequest,
) -> LocationAlertCheckResponse:
    alerts = await _service.check_location_alerts(request.latitude, request.longitude)
    return LocationAlertCheckResponse(
        status="ok",
        latitude=request.latitude,
        longitude=request.longitude,
        alert_count=len(alerts),
        alerts=alerts,
    )


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: str) -> AlertResponse:
    alert = _service.get(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

