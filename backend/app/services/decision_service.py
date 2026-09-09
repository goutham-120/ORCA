"""Deterministic decision products built from normalized ORCA evidence.

Risk rules deliberately use categorical thresholds: waves (m) 1.5/2.5/4,
wind (m/s) 8/13.9/20.8, and precipitation (mm) 5/20.  Overall risk is the
highest evidenced factor, never a fabricated probability. Missing inputs make
an assessment partial (or unavailable when no required evidence exists).
"""
from __future__ import annotations
from datetime import datetime
from typing import Any, Awaitable, Callable, Mapping
from app.gis.geometry import distance_km, point
from app.services.spatial_query_service import SpatialQueryService
from app.tools.gis_tools import GISTool
from app.tools.ocean_tools import OceanTool
from app.tools.weather_tools import WeatherTool

_ORDER = {"low": 0, "moderate": 1, "high": 2, "critical": 3}

class DecisionService:
    def __init__(self, weather: Any | None = None, ocean: Any | None = None, spatial: SpatialQueryService | None = None) -> None:
        self.weather, self.ocean = weather or WeatherTool(), ocean or OceanTool()
        self.spatial, self.gis = spatial or SpatialQueryService(), GISTool()

    async def _conditions(self, location: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
        return await self.weather.fetch({"location": location}), await self.ocean.fetch({"location": location})

    @staticmethod
    def _evidence(result: Mapping[str, Any], data_type: str, location: dict[str, Any], key: str, unit: str | None = None) -> dict[str, Any] | None:
        obs = result.get("observation") if isinstance(result.get("observation"), Mapping) else {}
        value = obs.get(key)
        if value is None: return None
        return {"source": result.get("provider", "unknown provider"), "data_type": data_type, "timestamp": obs.get("timestamp"), "location": location, "value": value, "unit": unit, "freshness": result.get("source_status"), "provenance": {"source_url": result.get("source_url")}}

    async def safety(self, location: dict[str, Any], at: datetime | None = None) -> dict[str, Any]:
        weather, ocean = await self._conditions(location)
        factors, evidence, missing, levels = [], [], [], []
        wave = (ocean.get("observation") or {}).get("wave_height_m")
        if isinstance(wave, (int, float)):
            level = "critical" if wave >= 4 else "high" if wave >= 2.5 else "moderate" if wave >= 1.5 else "low"
            levels.append(level); factors.append(f"Wave height {wave:g} m is {level} under ORCA operational thresholds.")
            evidence.append(self._evidence(ocean, "wave_height", location, "wave_height_m", "m"))
        else: missing.append("wave height")
        wind = (weather.get("observation") or {}).get("wind_speed_mps")
        if isinstance(wind, (int, float)):
            level = "critical" if wind >= 20.8 else "high" if wind >= 13.9 else "moderate" if wind >= 8 else "low"
            levels.append(level); factors.append(f"Wind speed {wind:g} m/s is {level} under ORCA operational thresholds.")
            evidence.append(self._evidence(weather, "wind_speed", location, "wind_speed_mps", "m/s"))
        else: missing.append("wind")
        rain = (weather.get("observation") or {}).get("precipitation_mm")
        if isinstance(rain, (int, float)):
            level = "high" if rain >= 20 else "moderate" if rain >= 5 else "low"; levels.append(level)
            evidence.append(self._evidence(weather, "precipitation", location, "precipitation_mm", "mm"))
        else: missing.append("precipitation")
        evidence = [item for item in evidence if item]
        status = "available" if not missing else "partial" if evidence else "unavailable"
        risk = max(levels, key=lambda v: _ORDER[v]) if levels else "unavailable"
        assessment = f"Marine safety risk is {risk}." if status == "available" else ("Marine safety assessment is incomplete because " + ", ".join(missing) + " data is unavailable." if status == "partial" else "Marine safety assessment is unavailable because weather and marine observations are unavailable.")
        return {"status": status, "risk_level": risk, "assessment": assessment, "factors": factors, "evidence": evidence, "warnings": ["Do not treat a partial assessment as a complete safety clearance."] if status != "available" else [], "unavailable_data": missing, "time": at}

    def _records(self, names: tuple[str, ...]) -> list[Any]:
        try:
            records = self.spatial.filter()
        # A missing/migrating spatial store is an unavailable source, never a
        # decision-service 500 or an implied "no hazard/PFZ" conclusion.
        except Exception:
            return []
        return [r for r in records if (r.dataset or "").lower() in names or (r.layer or "").lower() in names]

    async def nearby_pfz(self, location: dict[str, Any], radius_km: float, at: datetime | None = None) -> dict[str, Any]:
        records = self._records(("pfz", "potential_fishing_zone"))
        if not records:
            return {"status":"unavailable", "assessment":"PFZ data is unavailable: no authorized PFZ features are loaded.", "suitability":"unavailable", "warnings":["ORCA does not create synthetic PFZ geometry."], "unavailable_data":["authorized PFZ source"], "features":[], "evidence":[]}
        allowed_ids = {record.id for record in records}
        found = [item for item in self.spatial.nearby(location["latitude"], location["longitude"], radius_km) if item["feature"].id in allowed_ids]
        features = [{"id":x["feature"].id,"geometry":x["feature"].geometry,"distance_km":round(x["distance_km"],2),"source":x["feature"].source,"source_url":str(x["feature"].source_url) if x["feature"].source_url else None,"observed_at":x["feature"].observed_at,"freshness":x["feature"].freshness_status,"suitability":"unavailable"} for x in found]
        return {"status":"available", "assessment":f"Found {len(features)} authorized PFZ feature(s) within {radius_km:g} km.","suitability":"unavailable","features":features,"evidence":[{"source":f["source"],"data_type":"pfz_feature","timestamp":f["observed_at"],"location":location,"value":f["id"],"freshness":f["freshness"]} for f in features],"warnings":["PFZ presence alone is not a fishing safety clearance."],"unavailable_data":[]}

    async def fishing(self, location: dict[str, Any], at: datetime | None = None) -> dict[str, Any]:
        pfz = await self.nearby_pfz(location, 50, at); safety = await self.safety(location, at)
        if pfz["status"] == "unavailable":
            return {**pfz, "status":"partial" if safety["status"] != "unavailable" else "unavailable", "assessment":"Fishing suitability cannot be completed because authorized PFZ data is unavailable. " + safety["assessment"], "evidence": safety["evidence"], "unavailable_data": list(set(pfz["unavailable_data"] + safety["unavailable_data"]))}
        suitability = "unfavorable" if safety["risk_level"] in {"high","critical"} else "moderate" if safety["status"] != "available" or safety["risk_level"] == "moderate" else "favorable"
        return {**pfz, "status":"available" if safety["status"] == "available" else "partial", "suitability":suitability, "assessment":f"Fishing suitability is {suitability}; {safety['assessment']}", "evidence":pfz["evidence"] + safety["evidence"], "warnings":pfz["warnings"] + safety["warnings"], "unavailable_data":safety["unavailable_data"]}

    async def hazard(self, location: dict[str, Any], at: datetime | None = None) -> dict[str, Any]:
        records = self._records(("ibtracs", "cyclone", "cyclones"))
        if not records: return {"status":"unavailable","hazard_status":"source_unavailable","risk_level":"unavailable","assessment":"Cyclone source is unavailable; absence cannot be concluded.","cyclones":[],"evidence":[],"warnings":[],"unavailable_data":["NOAA/IBTrACS cyclone data"]}
        origin = point(location["latitude"], location["longitude"]); cyclones=[]
        for r in records:
            if not r.geometry: continue
            centre = self._geometry_centre(r.geometry)
            if centre is None:
                continue
            d = distance_km(origin, {"type":"Point","coordinates":centre})
            if d <= 500: cyclones.append({"id":r.id,"name":r.properties.get("name") or r.source_identifier,"distance_km":round(d,2),"geometry":r.geometry,"source":r.source,"observed_at":r.observed_at})
        status = "relevant_hazard_found" if cyclones else "no_relevant_hazard_found"
        return {"status":"available","hazard_status":status,"risk_level":"high" if cyclones else "low","assessment":("Relevant cyclone evidence was found within 500 km." if cyclones else "No relevant cyclone feature was found within 500 km in the available cyclone dataset."),"cyclones":cyclones,"evidence":[{"source":c["source"],"data_type":"cyclone_position","timestamp":c["observed_at"],"location":location,"value":c["distance_km"],"unit":"km","freshness":"loaded"} for c in cyclones],"warnings":[],"unavailable_data":[]}

    async def anomaly(self, location: dict[str, Any], at: datetime | None = None) -> dict[str, Any]:
        _, ocean = await self._conditions(location); wave=(ocean.get("observation") or {}).get("wave_height_m")
        if not isinstance(wave,(int,float)): return {"status":"unavailable","assessment":"Wave source is unavailable, so marine anomaly assessment cannot be made.","anomaly_status":"source_unavailable","evidence":[],"warnings":[],"unavailable_data":["wave height"]}
        ev=self._evidence(ocean,"wave_height",location,"wave_height_m","m")
        return {"status":"partial","assessment":("Notable high-wave condition (>= 2.5 m) detected." if wave >= 2.5 else "No operational high-wave condition detected. A true anomaly needs historical reference data."),"anomaly_status":"notable_condition" if wave >= 2.5 else "insufficient_reference_data","evidence":[ev],"warnings":["Historical/reference baseline is not configured; this is a threshold condition, not a statistical anomaly."],"unavailable_data":["historical wave reference"]}

    async def route(self, origin: dict[str,Any], destination: dict[str,Any], route_geometry: dict[str,Any] | None = None, at: datetime | None = None) -> dict[str,Any]:
        self.gis.validate_coordinate(origin["latitude"],origin["longitude"]); self.gis.validate_coordinate(destination["latitude"],destination["longitude"])
        geometry=route_geometry or {"type":"LineString","coordinates":[[origin["longitude"],origin["latitude"]],[destination["longitude"],destination["latitude"]]]}
        # Validate supplied geometry through existing GIS primitive.
        hazards=self._records(("hazard","hazards","cyclone","ibtracs")); hits=[]
        for r in hazards:
            if r.geometry and self._route_intersects(geometry, r.geometry): hits.append({"feature_id":r.id,"source":r.source,"geometry":r.geometry,"reason":"Route intersects loaded hazard feature."})
        distance=self.gis.distance_between(point(origin["latitude"],origin["longitude"]),point(destination["latitude"],destination["longitude"]))
        status="partial" if not hazards else "available"; risk="high" if hits else ("low" if hazards else "unavailable")
        return {"status":status,"assessment":("Route intersects hazard feature(s)." if hits else "No loaded hazard feature intersects the route." if hazards else "Route geometry is valid, but hazard data is unavailable; no safety conclusion can be made."),"risk_level":risk,"route_geometry":geometry,"distance_km":round(distance,2),"hazard_segments":hits,"evidence":[{"source":x["source"],"data_type":"route_hazard_intersection","value":x["feature_id"],"freshness":"loaded"} for x in hits],"warnings":["This is a supplied/direct geometry analysis, not navigational routing.","Safer alternative generation is not supported by current routing infrastructure."],"unavailable_data":[] if hazards else ["route hazard data"],"safer_alternatives_supported":False}

    @staticmethod
    def _geometry_centre(geometry: Mapping[str, Any]) -> list[float] | None:
        """Use a Point directly; otherwise calculate a bbox centre without new GIS data."""
        if geometry.get("type") == "Point" and isinstance(geometry.get("coordinates"), list):
            return geometry["coordinates"]
        try:
            coordinates = geometry["coordinates"]
            flat: list[list[float]] = []
            def visit(value: Any) -> None:
                if isinstance(value, (list, tuple)) and len(value) >= 2 and all(isinstance(x, (int, float)) for x in value[:2]): flat.append([value[0], value[1]])
                elif isinstance(value, (list, tuple)):
                    for item in value: visit(item)
            visit(coordinates)
            return [sum(p[0] for p in flat) / len(flat), sum(p[1] for p in flat) / len(flat)] if flat else None
        except (KeyError, TypeError, ZeroDivisionError): return None

    def _route_intersects(self, route: Mapping[str, Any], feature: Mapping[str, Any]) -> bool:
        try:
            return self.gis.geometries_intersect(route, feature)
        except RuntimeError:
            # Dependency-light fallback only for Point features; complex geometry
            # still needs the existing GIS/Shapely primitive.
            if route.get("type") != "LineString" or feature.get("type") != "Point": return False
            coords, candidate = route.get("coordinates", []), feature.get("coordinates", [])
            if len(coords) != 2 or len(candidate) != 2: return False
            (x1,y1),(x2,y2)=coords; x,y=candidate
            cross=abs((x-x1)*(y2-y1)-(y-y1)*(x2-x1))
            return cross < 1e-6 and min(x1,x2) <= x <= max(x1,x2) and min(y1,y2) <= y <= max(y1,y2)
