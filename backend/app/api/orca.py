from fastapi import APIRouter
from app.core.orchestrator import OrcaOrchestrator
from app.schemas.orca import (
    OrcaQueryRequest,
    OrcaQueryResponse,
    QueryHistoryResponse,
    ScenarioSimulationRequest,
    ScenarioSimulationResponse,
)
from app.services.simulation_service import scenario_simulator

router = APIRouter(prefix="/orca", tags=["orca"])
_orchestrator = OrcaOrchestrator()
_history: list[tuple[str, OrcaQueryResponse]] = []


@router.post("/query", response_model=OrcaQueryResponse)
async def query(request: OrcaQueryRequest) -> OrcaQueryResponse:
    response = await _orchestrator.handle(request)
    _history.append((request.query, response))
    return response


@router.post("/simulate", response_model=ScenarioSimulationResponse)
async def simulate(request: ScenarioSimulationRequest) -> ScenarioSimulationResponse:
    perturbations = {
        "delta_sst_c": request.delta_sst_c,
        "delta_wave_m": request.delta_wave_m,
        "delta_wind_mps": request.delta_wind_mps,
        "wind_multiplier": request.wind_multiplier,
        "storm_condition": request.storm_condition,
    }
    result = await scenario_simulator.simulate(
        location=request.location.model_dump(),
        perturbations=perturbations,
    )
    return ScenarioSimulationResponse(**result)


@router.get("/history", response_model=QueryHistoryResponse)
async def history() -> QueryHistoryResponse:
    return QueryHistoryResponse(items=[{"query_id": result.query_id, "query": query, "intent": result.intent, "created_at": result.created_at} for query, result in reversed(_history)])

