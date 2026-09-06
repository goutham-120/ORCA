from fastapi import APIRouter
from app.core.orchestrator import OrcaOrchestrator
from app.schemas.orca import OrcaQueryRequest, OrcaQueryResponse, QueryHistoryResponse

router = APIRouter(prefix="/orca", tags=["orca"])
_orchestrator = OrcaOrchestrator()
_history: list[tuple[str, OrcaQueryResponse]] = []


@router.post("/query", response_model=OrcaQueryResponse)
async def query(request: OrcaQueryRequest) -> OrcaQueryResponse:
    response = await _orchestrator.handle(request)
    _history.append((request.query, response))
    return response


@router.get("/history", response_model=QueryHistoryResponse)
async def history() -> QueryHistoryResponse:
    return QueryHistoryResponse(items=[{"query_id": result.query_id, "query": query, "intent": result.intent, "created_at": result.created_at} for query, result in reversed(_history)])
