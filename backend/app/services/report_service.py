from datetime import datetime, timezone
from uuid import uuid4
from app.schemas.resources import ReportCreateRequest, ReportResponse


class ReportService:
    def __init__(self) -> None:
        self._reports: dict[str, ReportResponse] = {}

    def list(self) -> list[ReportResponse]:
        return sorted(self._reports.values(), key=lambda item: item.created_at, reverse=True)

    def get(self, report_id: str) -> ReportResponse | None:
        return self._reports.get(report_id)

    def create(self, request: ReportCreateRequest) -> ReportResponse:
        report = ReportResponse(id=str(uuid4()), title=request.title, query_id=request.query_id, content=request.content, created_at=datetime.now(timezone.utc))
        self._reports[report.id] = report
        return report

    def delete(self, report_id: str) -> bool:
        return self._reports.pop(report_id, None) is not None
