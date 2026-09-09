from typing import Any

from fastapi import APIRouter
from app.agents.gis_agent import GISAgent
from app.gis.layers import layer_catalog, normalize_layers
from app.models.spatial_feature import spatial_features
from app.tools.gis_tools import GISTool
from app.schemas.map import MapAnalysisRequest, MapAnalysisResponse, MapLayer, MapLayersResponse, RouteRequest, RouteResponse
from app.providers.incois_pfz import incois_pfz_provider

router = APIRouter(prefix="/map", tags=["map"])


@router.get("/layers", response_model=MapLayersResponse)
async def layers() -> MapLayersResponse:
    records = spatial_features.list()
    by_layer: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        layer_id = record.layer or record.dataset
        if not record.geometry or not layer_id:
            continue
        by_layer.setdefault(layer_id, []).append({
            "id": str(record.id),
            "geometry": record.geometry,
            "properties": record.properties,
            "source": record.source,
            "source_identifier": record.source_identifier,
            "source_url": str(record.source_url) if record.source_url else None,
            "observed_at": record.observed_at,
            "source_status": record.freshness_status,
        })
    return MapLayersResponse(layers=[MapLayer(id=layer.id, name=layer.name, layer_type=layer.layer_type, description=layer.description, available=bool(by_layer.get(layer.id)), features=by_layer.get(layer.id, [])) for layer in layer_catalog()])


@router.post("/pfz/sync")
async def sync_pfz() -> dict[str, Any]:
    """Refresh authorized PFZ records from the official INCOIS WFS."""
    return await incois_pfz_provider.sync()


@router.post("/analyze", response_model=MapAnalysisResponse)
async def analyze(request: MapAnalysisRequest) -> MapAnalysisResponse:
    layers = request.parameters.get("gis_layers") or _persisted_layers()
    result = GISAgent().interpret({
        "query": request.analysis_type,
        "location": request.location.model_dump(),
        "metadata": {"gis_layers": layers, "gis_radius_km": request.parameters.get("radius_km", 25)},
    })
    return MapAnalysisResponse(
        status="completed" if result["available"] else "unavailable",
        message=result["summary"],
        result=result,
    )


@router.post("/route", response_model=RouteResponse)
async def route(request: RouteRequest) -> RouteResponse:
    tools = GISTool()
    origin = tools.validate_coordinate(request.origin.latitude, request.origin.longitude)
    destination = tools.validate_coordinate(request.destination.latitude, request.destination.longitude)
    geometry: dict[str, Any] = {
        "type": "LineString",
        "coordinates": [origin["geometry"]["coordinates"], destination["geometry"]["coordinates"]],
    }
    layers = normalize_layers(request.constraints.get("gis_layers") or _persisted_layers())
    intersections = tools.route_intersections(geometry, layers) if layers else {}
    data_status = "static" if any(layer.available for layer in layers.values()) else "unavailable"
    count = sum(len(features) for features in intersections.values())
    message = (
        f"Route intersects {count} supplied zone feature(s)."
        if data_status == "static"
        else "Route geometry is shown, but GIS data is unavailable; no safety conclusion can be made."
    )
    return RouteResponse(
        status="completed" if data_status == "static" else "unavailable",
        message=message,
        route={
            "geometry": geometry,
            "distance_km": round(tools.distance_between(origin["geometry"], destination["geometry"]), 2),
            "intersections": intersections,
            "data_status": data_status,
        },
    )


def _persisted_layers() -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for record in spatial_features.list():
        layer_id = record.layer or record.dataset
        if not record.geometry or not layer_id:
            continue
        result.setdefault(layer_id, {"source_status": record.freshness_status, "source": record.source, "features": []})["features"].append({"id": str(record.id), "geometry": record.geometry, "properties": record.properties})
    return result
