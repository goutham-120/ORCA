from fastapi import APIRouter, HTTPException
from app.schemas.resources import AlertListResponse, AlertResponse
from app.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["alerts"])
_service = AlertService()


@router.get("", response_model=AlertListResponse)
async def list_alerts() -> AlertListResponse:
    return AlertListResponse(items=_service.list())


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: str) -> AlertResponse:
    alert = _service.get(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
