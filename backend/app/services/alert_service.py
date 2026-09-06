from datetime import datetime, timezone
from app.schemas.resources import AlertResponse


class AlertService:
    def __init__(self) -> None:
        self._alerts: dict[str, AlertResponse] = {}

    def list(self) -> list[AlertResponse]:
        return sorted(self._alerts.values(), key=lambda item: item.created_at, reverse=True)

    def get(self, alert_id: str) -> AlertResponse | None:
        return self._alerts.get(alert_id)
