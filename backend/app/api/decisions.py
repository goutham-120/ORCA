"""Independent HTTP access to ORCA decision intelligence."""
from fastapi import APIRouter
from app.schemas.decisions import (
    AnomalyDecisionResponse,
    HazardDecisionResponse,
    MarineSafetyRequest,
    NearestSuitablePFZRequest,
    NearestSuitablePFZResponse,
    PFZDecisionResponse,
    PFZNearbyRequest,
    RouteDecisionRequest,
    RouteDecisionResponse,
    SafetyDecisionResponse,
)
from app.services.decision_service import DecisionService
from app.services.pfz_service import PFZDiscoveryService

router = APIRouter(prefix="/decisions", tags=["decisions"])
_service = DecisionService()
_pfz_service = PFZDiscoveryService()


@router.post("/safety", response_model=SafetyDecisionResponse)
async def safety(request: MarineSafetyRequest): return await _service.safety(request.location.model_dump(), request.at)

@router.post("/fishing", response_model=PFZDecisionResponse)
async def fishing(request: MarineSafetyRequest): return await _service.fishing(request.location.model_dump(), request.at)

@router.post("/pfz/nearby", response_model=PFZDecisionResponse)
async def nearby_pfz(request: PFZNearbyRequest): return await _service.nearby_pfz(request.location.model_dump(), request.radius_km, request.at)

@router.post("/pfz/suitability", response_model=PFZDecisionResponse)
async def pfz_suitability(request: MarineSafetyRequest): return await _service.fishing(request.location.model_dump(), request.at)

@router.post("/pfz/nearest-suitable", response_model=NearestSuitablePFZResponse)
async def nearest_suitable_pfz(request: NearestSuitablePFZRequest):
    return await _pfz_service.find_nearest_suitable_pfz(request.latitude, request.longitude, request.radius_km)

@router.post("/hazards/cyclones", response_model=HazardDecisionResponse)
async def cyclones(request: MarineSafetyRequest): return await _service.hazard(request.location.model_dump(), request.at)

@router.post("/anomalies/waves", response_model=AnomalyDecisionResponse)
async def waves(request: MarineSafetyRequest): return await _service.anomaly(request.location.model_dump(), request.at)

@router.post("/routes/analyze", response_model=RouteDecisionResponse)
async def route(request: RouteDecisionRequest): return await _service.route(request.origin.model_dump(), request.destination.model_dump(), request.route_geometry, request.at)

