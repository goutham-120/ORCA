from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from app.config import get_settings

from app.agents.gis_agent import GISAgent
from app.gis.layers import (
    GISFeature,
    GISLayer,
    layer_catalog,
    normalize_layers,
)
from app.models.spatial_feature import spatial_features
from app.providers.incois_pfz import incois_pfz_provider
from app.schemas.map import (
    MapAnalysisRequest,
    MapAnalysisResponse,
    MapFeature,
    MapFeaturesResponse,
    MapLayer,
    MapLayersResponse,
    RouteRequest,
    RouteResponse,
)
from app.tools.gis_tools import GISTool

router = APIRouter(
    prefix="/map",
    tags=["map"],
)


def require_map_api_key(
    api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> None:
    configured_key = get_settings().map_api_key
    if not configured_key:
        return
    if api_key != configured_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid X-API-Key is required.",
        )



@router.get(
    "/layers",
    response_model=MapLayersResponse,
)
async def layers(
    _: None = Depends(require_map_api_key),
    sync_pfz: bool = Query(
        default=True,
        description="Refresh PFZ data from INCOIS before returning layers.",
    ),
) -> MapLayersResponse:

    if sync_pfz:
        try:
            await incois_pfz_provider.sync()
        except Exception as exc:
            print(f"PFZ synchronization failed: {exc}")

    records = spatial_features.list()

    by_layer: dict[
        str,
        list[dict[str, Any]],
    ] = {}

    for record in records:
        layer_id = record.layer or record.dataset

        if not record.geometry or not layer_id:
            continue

        by_layer.setdefault(
            layer_id.lower(),
            [],
        ).append(
            {
                "id": str(record.id),
                "geometry": record.geometry,
                "properties": record.properties,
                "source": record.source,
                "source_identifier": record.source_identifier,
                "source_url": (
                    str(record.source_url)
                    if record.source_url
                    else None
                ),
                "observed_at": record.observed_at,
                "source_status": record.freshness_status,
            }
        )

    catalog = layer_catalog()

    known_ids = {
        layer.id.lower()
        for layer in catalog
    }

    result = []

    for layer in catalog:
        layer_id = layer.id.lower()
        features = by_layer.get(
            layer_id,
            [],
        )

        result.append(
            MapLayer(
                id=layer.id,
                name=layer.name,
                layer_type=layer.layer_type,
                description=layer.description,
                available=bool(features),
                feature_count=len(features),
                features=features,
            )
        )

    for layer_id, features in by_layer.items():
        if layer_id not in known_ids:
            result.append(
                MapLayer(
                    id=layer_id,
                    name=layer_id.replace(
                        "_",
                        " ",
                    ).title(),
                    layer_type="vector",
                    description=(
                        "Persisted provider GIS features."
                    ),
                    available=True,
                    feature_count=len(features),
                    features=features,
                )
            )

    return MapLayersResponse(
        layers=result
    )


@router.post("/pfz/sync")
async def sync_pfz(
    _: None = Depends(require_map_api_key),
) -> dict[str, Any]:
    """
    Refresh authorized PFZ records
    from the official INCOIS WFS.
    """

    return await incois_pfz_provider.sync()


@router.get(
    "/features",
    response_model=MapFeaturesResponse,
)
async def features(
    _: None = Depends(require_map_api_key),
    layer: list[str] = Query(default=[]),
    dataset: str | None = None,
    latitude: float | None = Query(
        default=None,
        ge=-90,
        le=90,
    ),
    longitude: float | None = Query(
        default=None,
        ge=-180,
        le=180,
    ),
    radius_km: float = Query(
        default=50,
        gt=0,
        le=500,
    ),
) -> MapFeaturesResponse:

    records = spatial_features.list(
        dataset=dataset
    )

    if (latitude is None) != (
        longitude is None
    ):
        raise ValueError(
            "latitude and longitude must be supplied together."
        )

    if (
        latitude is not None
        and longitude is not None
    ):
        from app.services.spatial_query_service import (
            SpatialQueryService,
        )

        nearby = SpatialQueryService(
            spatial_features
        ).nearby(
            latitude,
            longitude,
            radius_km,
            dataset=dataset,
        )

        records = [
            item["feature"]
            for item in nearby
        ]

    wanted = {
        value.lower()
        for value in layer
    }

    if wanted:
        records = [
            record
            for record in records
            if (
                record.layer
                or record.dataset
            ).lower()
            in wanted
        ]

    return MapFeaturesResponse(
        features=[
            MapFeature(
                id=record.id,
                layer=record.layer,
                dataset=record.dataset,
                geometry=record.geometry,
                properties=record.properties,
                source=record.source,
                source_identifier=record.source_identifier,
                source_url=(
                    str(record.source_url)
                    if record.source_url
                    else None
                ),
                observed_at=record.observed_at,
                freshness_status=record.freshness_status,
            )
            for record in records
            if record.geometry
        ]
    )


def _stored_layers() -> dict[str, GISLayer]:

    grouped: dict[
        str,
        list[GISFeature],
    ] = {}

    sources: dict[str, str] = {}

    statuses: dict[
        str,
        set[str],
    ] = {}

    for record in spatial_features.list():

        layer_id = (
            record.layer
            or record.dataset
        ).lower()

        if not record.geometry:
            continue

        grouped.setdefault(
            layer_id,
            [],
        ).append(
            GISFeature(
                str(record.id),
                record.geometry,
                record.properties,
            )
        )

        sources[layer_id] = record.source

        statuses.setdefault(
            layer_id,
            set(),
        ).add(
            record.freshness_status
        )

    precedence = (
        "live",
        "cached",
        "static",
        "stale",
        "unavailable",
    )

    source_status = {
        layer_id: next(
            (
                status
                for status in precedence
                if status in statuses[layer_id]
            ),
            "unavailable",
        )
        for layer_id in grouped
    }

    return {
        layer_id: GISLayer(
            layer_id,
            layer_id.replace(
                "_",
                " ",
            ).title(),
            "vector",
            "Persisted provider GIS features.",
            features,
            source_status[layer_id],
            sources.get(layer_id),
        )
        for layer_id, features in grouped.items()
    }


@router.post(
    "/analyze",
    response_model=MapAnalysisResponse,
)
async def analyze(
    request: MapAnalysisRequest,
) -> MapAnalysisResponse:

    layers = (
        request.parameters.get("gis_layers")
        or _stored_layers()
    )

    result = GISAgent().interpret(
        {
            "query": request.analysis_type,
            "location": request.location.model_dump(),
            "metadata": {
                "gis_layers": layers,
                "gis_radius_km": request.parameters.get(
                    "radius_km",
                    25,
                ),
            },
        }
    )

    return MapAnalysisResponse(
        status=(
            "completed"
            if result["available"]
            else "unavailable"
        ),
        message=result["summary"],
        result=result,
    )


@router.post(
    "/route",
    response_model=RouteResponse,
)
async def route(
    request: RouteRequest,
) -> RouteResponse:

    tools = GISTool()

    origin = tools.validate_coordinate(
        request.origin.latitude,
        request.origin.longitude,
    )

    destination = tools.validate_coordinate(
        request.destination.latitude,
        request.destination.longitude,
    )

    geometry: dict[str, Any] = {
        "type": "LineString",
        "coordinates": [
            origin["geometry"]["coordinates"],
            destination["geometry"]["coordinates"],
        ],
    }

    layers = (
        normalize_layers(
            request.constraints.get(
                "gis_layers"
            )
        )
        or _stored_layers()
    )

    intersections = (
        tools.route_intersections(
            geometry,
            layers,
        )
        if layers
        else {}
    )

    data_status = (
        "static"
        if any(
            layer.available
            for layer in layers.values()
        )
        else "unavailable"
    )

    count = sum(
        len(features)
        for features in intersections.values()
    )

    message = (
        f"Route intersects {count} supplied zone feature(s)."
        if data_status == "static"
        else (
            "Route geometry is shown, but GIS data "
            "is unavailable; no safety conclusion "
            "can be made."
        )
    )

    return RouteResponse(
        status=(
            "completed"
            if data_status == "static"
            else "unavailable"
        ),
        message=message,
        route={
            "geometry": geometry,
            "distance_km": round(
                tools.distance_between(
                    origin["geometry"],
                    destination["geometry"],
                ),
                2,
            ),
            "intersections": intersections,
            "data_status": data_status,
        },
    )