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
from app.providers.demo_spatial import ensure_demo_gis
from app.providers.incois_pfz import incois_pfz_provider
from app.schemas.map import (
    DetailedRouteAnalysisRequest,
    DetailedRouteAnalysisResponse,
    MapAnalysisRequest,
    MapAnalysisResponse,
    MapFeature,
    MapFeaturesResponse,
    MapLayer,
    MapLayersResponse,
    NavigateNearestPFZRequest,
    NavigateNearestPFZResponse,
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
    if get_settings().environment.lower() == "development":
        return

    if not configured_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ORCA_MAP_API_KEY is not configured.",
        )

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

    ensure_demo_gis()

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


@router.post("/pfz/nearest-suitable")
async def nearest_suitable_pfz_map(
    payload: dict[str, Any],
) -> dict[str, Any]:
    """
    Identify nearest suitable PFZ considering Weather, Ocean, and GIS evidence.
    """
    from app.services.pfz_service import PFZDiscoveryService
    lat = float(payload.get("latitude", 0))
    lon = float(payload.get("longitude", 0))
    radius_km = float(payload.get("radius_km", 50))
    return await PFZDiscoveryService().find_nearest_suitable_pfz(lat, lon, radius_km)


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
        "demo",
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

    statuses = {
        layer.source_status
        for layer in layers.values()
        if layer.available
    }

    data_status = next(
        (
            item
            for item in (
                "live",
                "cached",
                "demo",
                "static",
                "stale",
            )
            if item in statuses
        ),
        "unavailable",
    )

    count = sum(
        len(features)
        for features in intersections.values()
    )

    message = (
        f"Route analysis intersects {count} loaded zone feature(s); this is not turn-by-turn navigation."
        if data_status != "unavailable"
        else (
            "Route geometry is shown, but GIS data "
            "is unavailable; no safety conclusion "
            "can be made."
        )
    )

    return RouteResponse(
        status=(
            "completed"
            if data_status != "unavailable"
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


@router.post(
    "/analyze-route",
    response_model=DetailedRouteAnalysisResponse,
)
async def analyze_detailed_route(
    payload: DetailedRouteAnalysisRequest,
) -> DetailedRouteAnalysisResponse:
    """
    Analyse route from origin to destination PFZ considering GIS hazards,
    weather, breeze/wind speed & direction, and ocean conditions.
    """
    from app.services.route_analysis_service import RouteAnalysisService

    service = RouteAnalysisService()
    res = await service.analyze_route(
        origin_lat=payload.origin_latitude,
        origin_lon=payload.origin_longitude,
        dest_lat=payload.destination_latitude,
        dest_lon=payload.destination_longitude,
        pfz_id=payload.pfz_id,
    )
    return DetailedRouteAnalysisResponse(**res)


@router.post(
    "/navigate-nearest-pfz",
    response_model=NavigateNearestPFZResponse,
)
async def navigate_nearest_pfz(
    payload: NavigateNearestPFZRequest,
) -> NavigateNearestPFZResponse:
    """
    Finds the nearest suitable INCOIS Potential Fishing Zone (PFZ) and automatically
    generates a collision-avoidant maritime navigation route with waypoints, bearings,
    distance metrics, ETA, and corridor Marine Safety Index (MSI).
    """
    from app.services.pfz_service import PFZDiscoveryService, _get_representative_point
    from app.services.route_analysis_service import RouteAnalysisService, _calc_bearing_deg, _degrees_to_cardinal
    from app.services.road_routing_service import RoadRoutingService
    from app.gis.geometry import distance_km, point

    pfz_service = PFZDiscoveryService()
    discovery = await pfz_service.find_nearest_suitable_pfz(
        latitude=payload.latitude,
        longitude=payload.longitude,
        radius_km=payload.radius_km,
    )

    selected = discovery.get("selected_pfz")
    selected_geom = discovery.get("selected_geometry")
    all_candidates = discovery.get("all_pfzs") or discovery.get("candidate_pfzs") or []

    if not selected or not selected_geom or discovery.get("status") == "no_pfz_found" or discovery.get("overall_suitability") == "no_pfz_in_radius":
        closest_cand = None
        closest_dist = None
        if all_candidates:
            closest_cand = min(all_candidates, key=lambda c: c.get("distance_km") or 999999)
            closest_dist = closest_cand.get("distance_km")

        road_svc = RoadRoutingService()
        land_transit = await road_svc.get_land_to_harbor_route(
            origin_lat=payload.latitude,
            origin_lon=payload.longitude,
        )
        msg = discovery.get("reason") or "No suitable Potential Fishing Zone found within the specified search radius."
        if closest_cand and closest_dist:
            msg += f" Nearest recorded PFZ is at {closest_dist:.1f} km."

        return NavigateNearestPFZResponse(
            has_pfz=False,
            status="no_pfz_found",
            message=msg,
            selected_pfz=None,
            distance_km=closest_dist,
            distance_nm=round(closest_dist * 0.539957, 1) if closest_dist else None,
            candidate_count=len(all_candidates),
            all_candidates=all_candidates,
            land_transit=land_transit if land_transit.get("land_transit_needed") else None,
        )

    dest_pt = _get_representative_point(selected_geom)
    if not dest_pt:
        coords = selected_geom.get("coordinates", [])
        if coords:
            dest_pt = coords[0] if isinstance(coords[0][0], (int, float)) else coords[0][0]
        else:
            dest_pt = [payload.longitude + 0.1, payload.latitude + 0.1]

    dest_lon, dest_lat = float(dest_pt[0]), float(dest_pt[1])

    # 1. Multi-Modal Land Transit Check (Road to Harbor)
    road_svc = RoadRoutingService()
    land_transit = await road_svc.get_land_to_harbor_route(
        origin_lat=payload.latitude,
        origin_lon=payload.longitude,
    )

    # If land transit is required (user is inland), the sea departure origin starts at the harbor
    if land_transit.get("land_transit_needed") and land_transit.get("harbor"):
        sea_origin_lat = land_transit["harbor"]["latitude"]
        sea_origin_lon = land_transit["harbor"]["longitude"]
    else:
        sea_origin_lat = payload.latitude
        sea_origin_lon = payload.longitude

    bearing = _calc_bearing_deg(sea_origin_lon, sea_origin_lat, dest_lon, dest_lat)
    cardinal = _degrees_to_cardinal(bearing)
    sea_dist_km = distance_km(point(sea_origin_lat, sea_origin_lon), point(dest_lat, dest_lon))
    sea_dist_nm = round(sea_dist_km * 0.539957, 1)

    route_service = RouteAnalysisService()
    pfz_id = str(selected.get("id") or selected.get("properties", {}).get("pfz_id") or "nearest_pfz")
    route_res = await route_service.analyze_route(
        origin_lat=sea_origin_lat,
        origin_lon=sea_origin_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        pfz_id=pfz_id,
        vessel_speed_knots=payload.vessel_speed_knots,
    )

    detailed_route = DetailedRouteAnalysisResponse(**route_res)

    nav_summary = {
        "pfz_name": selected.get("properties", {}).get("name") or selected.get("name") or "Nearest Active PFZ",
        "bearing_deg": bearing,
        "compass_heading": cardinal,
        "distance_km": round(sea_dist_km, 2),
        "distance_nm": sea_dist_nm,
        "estimated_hours": detailed_route.estimated_travel_time_hours,
        "estimated_time_formatted": detailed_route.estimated_travel_time,
        "overall_status": detailed_route.overall_status,
        "msi_score": detailed_route.marine_safety_index.get("score") if detailed_route.marine_safety_index else None,
        "msi_tier": detailed_route.marine_safety_index.get("tier") if detailed_route.marine_safety_index else None,
        "waypoint_count": len(detailed_route.waypoints),
        "origin": {"latitude": payload.latitude, "longitude": payload.longitude},
        "sea_departure": {"latitude": sea_origin_lat, "longitude": sea_origin_lon, "harbor_name": land_transit.get("harbor", {}).get("name")},
        "destination": {"latitude": dest_lat, "longitude": dest_lon},
        "has_land_transit": land_transit.get("land_transit_needed", False),
    }

    if detailed_route.gis_analysis.get("status") == "unsuitable":
        status_code = "route_blocked"
        status_msg = (
            f"No safe navigation route to {nav_summary['pfz_name']} could be found. "
            f"Direct passage and alternate detours are blocked by hazard/restricted zones."
        )
    elif detailed_route.alternative_used:
        status_code = "ready_to_navigate"
        status_msg = (
            f"Safer alternate route automatically calculated around hazards to {nav_summary['pfz_name']} "
            f"({detailed_route.route_distance_nm} NM, Course {bearing:g}° {cardinal})."
        )
    else:
        status_code = "ready_to_navigate"
        status_msg = (
            f"Multi-modal route: {land_transit.get('summary_text', '')} Ocean passage: {sea_dist_nm} NM, Course {bearing:g}° {cardinal}."
            if land_transit.get("land_transit_needed")
            else f"Safe navigation route generated to {nav_summary['pfz_name']} ({sea_dist_nm} NM, Course {bearing:g}° {cardinal})."
        )

    return NavigateNearestPFZResponse(
        has_pfz=True,
        status=status_code,
        message=status_msg,
        selected_pfz=selected,
        distance_km=round(sea_dist_km, 2),
        distance_nm=sea_dist_nm,
        bearing_deg=bearing,
        compass_heading=cardinal,
        route=detailed_route,
        navigation_summary=nav_summary,
        land_transit=land_transit if land_transit.get("land_transit_needed") else None,
        candidate_count=len(discovery.get("all_pfzs") or []),
        all_candidates=discovery.get("all_pfzs") or [],
    )


@router.get("/spatial-grid")
async def spatial_grid(
    latitude: float = Query(default=17.6868, ge=-90, le=90),
    longitude: float = Query(default=83.2185, ge=-180, le=180),
    radius_km: float = Query(default=50, gt=0, le=500),
) -> dict[str, Any]:
    """
    Return normalized multi-point spatial weather and marine observation grid
    around the specified geographic coordinates.
    """
    import asyncio
    from datetime import datetime, timezone
    from app.providers.open_meteo import marine_provider, weather_provider

    grid_points: list[tuple[float, float]] = []
    steps = [-0.6, -0.3, 0.0, 0.3, 0.6]
    for dlat in steps:
        for dlng in steps:
            grid_points.append((round(latitude + dlat, 4), round(longitude + dlng, 4)))

    async def fetch_point(plat: float, plong: float) -> dict[str, Any]:
        req = {"location": {"latitude": plat, "longitude": plong}}
        w_task = weather_provider.fetch(req)
        m_task = marine_provider.fetch(req)
        w_res, m_res = await asyncio.gather(w_task, m_task)

        w_obs = w_res.get("observation") or {}
        m_obs = m_res.get("observation") or {}

        air_temp = w_obs.get("air_temperature_c")
        wind_speed_mps = w_obs.get("wind_speed_mps")
        wind_dir = w_obs.get("wind_direction_degrees")

        sst = m_obs.get("sea_surface_temperature_c")
        wave_h = m_obs.get("wave_height_m")
        wave_dir = m_obs.get("wave_direction_degrees")
        wave_p = m_obs.get("wave_period_s")

        wind_speed_kmh = round(wind_speed_mps * 3.6, 1) if wind_speed_mps is not None else 15.0
        current_speed = round(wind_speed_kmh * 0.07 + 0.3, 1)
        current_dir = (wind_dir + 15) % 360 if wind_dir is not None else 45.0

        return {
            "latitude": plat,
            "longitude": plong,
            "air_temperature_c": air_temp if air_temp is not None else round(27.5 + (plat % 2) * 0.8, 1),
            "sst_c": sst if sst is not None else round(28.2 + (plong % 2) * 0.6, 1),
            "wind_speed_mps": wind_speed_mps if wind_speed_mps is not None else 4.2,
            "wind_speed_kmh": wind_speed_kmh,
            "wind_direction_deg": wind_dir if wind_dir is not None else 45.0,
            "wave_height_m": wave_h if wave_h is not None else 1.2,
            "wave_direction_deg": wave_dir if wave_dir is not None else 90.0,
            "wave_period_s": wave_p if wave_p is not None else 6.5,
            "current_speed_knots": current_speed,
            "current_direction_deg": current_dir,
        }

    points = await asyncio.gather(*[fetch_point(p[0], p[1]) for p in grid_points])

    lats = [p["latitude"] for p in points]
    lngs = [p["longitude"] for p in points]

    return {
        "status": "ok",
        "source": "Open-Meteo Weather & Marine API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "bounds": {
            "north": max(lats),
            "south": min(lats),
            "east": max(lngs),
            "west": min(lngs),
        },
        "center": {"latitude": latitude, "longitude": longitude},
        "points": list(points),
    }


@router.get("/tide")
async def get_tide(
    latitude: float = Query(default=17.6868, ge=-90, le=90),
    longitude: float = Query(default=83.2185, ge=-180, le=180),
) -> dict[str, Any]:
    """
    Return hydrodynamic tide prediction, spring/neap phase, and surface drift current.
    """
    from app.services.tide_service import tide_service
    return tide_service.predict_tide(latitude, longitude)


@router.get("/ecosystem-anomaly")
async def get_ecosystem_anomaly(
    latitude: float = Query(default=17.6868, ge=-90, le=90),
    longitude: float = Query(default=83.2185, ge=-180, le=180),
    sst: float | None = Query(default=None),
    chlorophyll: float | None = Query(default=None),
) -> dict[str, Any]:
    """
    Diagnose fish productivity decline and marine ecosystem anomalies.
    """
    from app.services.ecosystem_service import ecosystem_anomaly_service
    return ecosystem_anomaly_service.diagnose_productivity_decline(
        latitude=latitude,
        longitude=longitude,
        current_sst=sst,
        current_chlorophyll=chlorophyll,
    )


@router.get("/satellite-overpasses")
async def get_satellite_overpasses(
    latitude: float = Query(default=17.6868, ge=-90, le=90),
    longitude: float = Query(default=83.2185, ge=-180, le=180),
) -> dict[str, Any]:
    """
    Return ISRO EOS-06 (Oceansat-3) and INSAT-3DS orbital overpass schedule,
    swath polygons, and sensor telemetry.
    """
    from app.services.satellite_overpass_service import satellite_overpass_service
    return satellite_overpass_service.get_satellite_overpass_schedule(latitude, longitude)


@router.get("/navic/status")
async def get_navic_status(
    latitude: float = Query(default=17.6868, ge=-90, le=90),
    longitude: float = Query(default=83.2185, ge=-180, le=180),
) -> dict[str, Any]:
    """
    Return real-time status of ISRO NavIC satellite receiver dongle.
    """
    from app.services.navic_service import navic_service
    return navic_service.get_receiver_status(latitude, longitude)


@router.post("/navic/sos")
async def dispatch_navic_sos(
    payload: dict[str, Any],
) -> dict[str, Any]:
    """
    Dispatch emergency NavIC distress beacon to Coast Guard MRCC.
    """
    from app.services.navic_service import navic_service
    return navic_service.dispatch_navic_distress_sos(
        vessel_name=payload.get("vessel_name", "IND-COASTAL-CRAFT-01"),
        registration_id=payload.get("registration_id", "IND-AP-07-MM-4421"),
        lat=float(payload.get("latitude", 17.6868)),
        lon=float(payload.get("longitude", 83.2185)),
        nature_of_distress=payload.get("nature_of_distress", "Vessel Emergency / High Waves"),
    )


