from fastapi import APIRouter
from app.schemas.map import MapAnalysisRequest, MapAnalysisResponse, MapLayer, MapLayersResponse, RouteRequest, RouteResponse

router = APIRouter(prefix="/map", tags=["map"])


@router.get("/layers", response_model=MapLayersResponse)
async def layers() -> MapLayersResponse:
    return MapLayersResponse(layers=[MapLayer(id="bathymetry", name="Bathymetry", layer_type="raster", description="Depth and seafloor context", available=False), MapLayer(id="marine-zones", name="Marine zones", layer_type="vector", description="Integration point for GIS-managed zones", available=False)])


@router.post("/analyze", response_model=MapAnalysisResponse)
async def analyze(request: MapAnalysisRequest) -> MapAnalysisResponse:
    return MapAnalysisResponse(status="pending", message="GIS analysis is delegated to the GIS integration.", result={"location": request.location.model_dump(), "analysis_type": request.analysis_type})


@router.post("/route", response_model=RouteResponse)
async def route(request: RouteRequest) -> RouteResponse:
    return RouteResponse(status="pending", message="Route analysis is delegated to the GIS and route-analysis integrations.")
