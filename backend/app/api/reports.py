from fastapi import APIRouter, HTTPException, Response, status
from app.schemas.resources import ReportCreateRequest, ReportListResponse, ReportResponse
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])
_service = ReportService()


@router.get("", response_model=ReportListResponse)
async def list_reports() -> ReportListResponse:
    return ReportListResponse(items=_service.list())


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str) -> ReportResponse:
    report = _service.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(request: ReportCreateRequest) -> ReportResponse:
    return _service.create(request)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(report_id: str) -> Response:
    if not _service.delete(report_id):
        raise HTTPException(status_code=404, detail="Report not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
