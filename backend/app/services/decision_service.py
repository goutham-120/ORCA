"""Deterministic decision products built from normalized ORCA evidence.

Risk rules use categorical thresholds combined with continuous Marine Safety Index (MSI):
waves (m) 1.5/2.5/4, wind (m/s) 8/13.9/20.8, and precipitation (mm) 5/20.
Missing inputs make an assessment partial (or unavailable when no required evidence exists).
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Mapping
from app.analysis.safety_index import compute_marine_safety_index
from app.gis.geometry import distance_km, point
from app.services.ecosystem_service import ecosystem_anomaly_service
from app.services.simulation_service import scenario_simulator
from app.services.spatial_query_service import SpatialQueryService
from app.services.tide_service import tide_service
from app.tools.gis_tools import GISTool
from app.tools.ocean_tools import OceanTool
from app.tools.weather_tools import WeatherTool

_ORDER = {"low": 0, "moderate": 1, "high": 2, "critical": 3}

class DecisionService:
    def __init__(self, weather: Any | None = None, ocean: Any | None = None, spatial: SpatialQueryService | None = None) -> None:
        self.weather, self.ocean = weather or WeatherTool(), ocean or OceanTool()
        self.spatial, self.gis = spatial or SpatialQueryService(), GISTool()

    async def _conditions(self, location: dict[str, Any], at: datetime | None = None) -> tuple[dict[str, Any], dict[str, Any]]:
        request = {"location": location}
        if at is not None:
            request["time_expression"] = at.isoformat()
        return await self.weather.fetch(request), await self.ocean.fetch(request)

    @staticmethod
    def _evidence(result: Mapping[str, Any], data_type: str, location: dict[str, Any], key: str, unit: str | None = None) -> dict[str, Any] | None:
        obs = result.get("observation") if isinstance(result.get("observation"), Mapping) else {}
        value = obs.get(key)
        if value is None: return None
        return {"source": result.get("provider", "unknown provider"), "data_type": data_type, "timestamp": obs.get("timestamp"), "location": location, "value": value, "unit": unit, "freshness": result.get("source_status"), "provenance": {"source_url": result.get("source_url")}}

    async def safety(self, location: dict[str, Any], at: datetime | None = None) -> dict[str, Any]:
        weather, ocean = await self._conditions(location, at)
        factors, evidence, missing, levels = [], [], [], []
        ocean_obs = ocean.get("observation") if isinstance(ocean.get("observation"), Mapping) else {}
        weather_obs = weather.get("observation") if isinstance(weather.get("observation"), Mapping) else {}

        wave = ocean_obs.get("wave_height_m")
        if isinstance(wave, (int, float)):
            level = "critical" if wave >= 4 else "high" if wave >= 2.5 else "moderate" if wave >= 1.5 else "low"
            levels.append(level); factors.append(f"Wave height {wave:g} m is {level} under ORCA operational thresholds.")
            evidence.append(self._evidence(ocean, "wave_height", location, "wave_height_m", "m"))
        else: missing.append("wave height")

        period = ocean_obs.get("wave_period_s")
        if isinstance(period, (int, float)):
            if period >= 12:
                levels.append("moderate")
                factors.append(f"Long-period swell ({period:g} s) introduces shoaling risk.")
            evidence.append(self._evidence(ocean, "wave_period", location, "wave_period_s", "s"))

        wind = weather_obs.get("wind_speed_mps")
        if isinstance(wind, (int, float)):
            level = "critical" if wind >= 20.8 else "high" if wind >= 13.9 else "moderate" if wind >= 8 else "low"
            levels.append(level); factors.append(f"Wind speed {wind:g} m/s is {level} under ORCA operational thresholds.")
            evidence.append(self._evidence(weather, "wind_speed", location, "wind_speed_mps", "m/s"))
        else: missing.append("wind")

        rain = weather_obs.get("precipitation_mm")
        if isinstance(rain, (int, float)):
            level = "high" if rain >= 20 else "moderate" if rain >= 5 else "low"; levels.append(level)
            evidence.append(self._evidence(weather, "precipitation", location, "precipitation_mm", "mm"))
        else: missing.append("precipitation")

        condition = str(weather_obs.get("condition") or "").lower()
        if "thunderstorm" in condition or "squall" in condition:
            levels.append("high")
            factors.append(f"Weather condition ({weather_obs.get('condition')}) presents high hazard.")
        elif "heavy rain" in condition or "violent rain" in condition:
            levels.append("high")
            factors.append(f"Weather condition ({weather_obs.get('condition')}) causes severe visibility loss.")
        elif "fog" in condition:
            levels.append("moderate")
            factors.append(f"Foggy conditions reduce navigational visibility.")

        evidence = [item for item in evidence if item]
        status = "available" if not missing else "partial" if evidence else "unavailable"
        risk = max(levels, key=lambda v: _ORDER[v]) if levels else "unavailable"
        assessment = f"Marine safety risk is {risk}." if status == "available" else ("Marine safety assessment is incomplete because " + ", ".join(missing) + " data is unavailable." if status == "partial" else "Marine safety assessment is unavailable because weather and marine observations are unavailable.")

        # Continuous Marine Safety Index (MSI)
        msi = compute_marine_safety_index(
            wave_height_m=wave if isinstance(wave, (int, float)) else None,
            wave_period_s=period if isinstance(period, (int, float)) else None,
            wind_speed_mps=wind if isinstance(wind, (int, float)) else None,
            precipitation_mm=rain if isinstance(rain, (int, float)) else None,
            weather_condition=condition,
        )

        # Tidal Hydrodynamics
        try:
            tide_info = tide_service.predict_tide(location["latitude"], location["longitude"], at)
        except Exception:
            tide_info = None

        return {
            "status": status,
            "risk_level": risk,
            "assessment": assessment,
            "factors": factors,
            "evidence": evidence,
            "warnings": ["Do not treat a partial assessment as a complete safety clearance."] if status != "available" else [],
            "unavailable_data": missing,
            "time": at,
            "marine_safety_index": msi,
            "tide": tide_info,
        }

    def _records(self, names: tuple[str, ...], at: datetime | None = None) -> list[Any]:
        try:
            records = self.spatial.filter()
        except Exception:
            return []
        reference_time = at or datetime.now(timezone.utc)
        return [
            record
            for record in records
            if (record.dataset or "").lower() in names or (record.layer or "").lower() in names
            if self._is_active(record, reference_time)
        ]

    @staticmethod
    def _is_active(record: Any, at: datetime) -> bool:
        """Exclude PFZ or hazard records outside their declared validity window."""
        valid_from = getattr(record, "valid_from", None)
        valid_to = getattr(record, "valid_to", None)
        if valid_from and valid_from > at:
            return False
        if valid_to and valid_to < at:
            return False
        return True

    async def nearby_pfz(self, location: dict[str, Any], radius_km: float, at: datetime | None = None) -> dict[str, Any]:
        records = self._records(("pfz", "potential_fishing_zone"), at)
        if not records:
            return {"status":"unavailable", "assessment":"PFZ data is unavailable because no current authorized advisory is loaded. Ask ORCA can refresh the official INCOIS source when network access is available.", "suitability":"unavailable", "warnings":["ORCA does not create synthetic PFZ geometry."], "unavailable_data":["authorized PFZ source"], "features":[], "evidence":[]}
        allowed_ids = {record.id for record in records}
        found = [item for item in self.spatial.nearby(location["latitude"], location["longitude"], radius_km) if item["feature"].id in allowed_ids]
        features = [{"id":x["feature"].id,"geometry":x["feature"].geometry,"distance_km":round(x["distance_km"],2),"source":x["feature"].source,"source_identifier":x["feature"].source_identifier,"source_url":str(x["feature"].source_url) if x["feature"].source_url else None,"observed_at":x["feature"].observed_at,"freshness":x["feature"].freshness_status,"properties":x["feature"].properties,"suitability":"unavailable"} for x in found]
        return {"status":"available", "assessment":f"Found {len(features)} authorized PFZ feature(s) within {radius_km:g} km.","suitability":"unavailable","risk_level":"unavailable","features":features,"evidence":[{"source":f["source"],"data_type":"pfz_feature","timestamp":f["observed_at"],"location":location,"value":f["id"],"freshness":f["freshness"]} for f in features],"warnings":["PFZ presence alone is not a fishing safety clearance."],"unavailable_data":[]}

    async def fishing(self, location: dict[str, Any], at: datetime | None = None) -> dict[str, Any]:
        pfz = await self.nearby_pfz(location, 50, at); safety = await self.safety(location, at)
        if pfz["status"] == "unavailable":
            return {**pfz, "status":"partial" if safety["status"] != "unavailable" else "unavailable", "risk_level": safety["risk_level"], "assessment":"Fishing suitability cannot be completed because authorized PFZ data is unavailable. " + safety["assessment"], "evidence": safety["evidence"], "unavailable_data": list(set(pfz["unavailable_data"] + safety["unavailable_data"]))}
        suitability = self._pfz_suitability(pfz, safety)
        features = [{**feature, "suitability": suitability} for feature in pfz["features"]]
        return {**pfz, "status":"available" if safety["status"] == "available" else "partial", "risk_level": safety["risk_level"], "suitability":suitability, "features":features, "assessment":f"Fishing suitability is {suitability}; {safety['assessment']}", "evidence":pfz["evidence"] + safety["evidence"], "warnings":pfz["warnings"] + safety["warnings"], "unavailable_data":safety["unavailable_data"]}

    @staticmethod
    def _pfz_suitability(pfz: Mapping[str, Any], safety: Mapping[str, Any]) -> str:
        if not pfz.get("features"):
            return "unavailable"
        if safety.get("risk_level") in {"high", "critical"}:
            return "unfavorable"
        if safety.get("status") != "available" or safety.get("risk_level") == "moderate":
            return "moderate"
        return "favorable"

    async def hazard(self, location: dict[str, Any], at: datetime | None = None) -> dict[str, Any]:
        records = self._records(("ibtracs", "cyclone", "cyclones"), at)
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
        weather, ocean = await self._conditions(location, at)
        wave = (ocean.get("observation") or {}).get("wave_height_m")
        sst = (ocean.get("observation") or {}).get("sea_surface_temperature_c")
        wind = (weather.get("observation") or {}).get("wind_speed_mps")

        if not isinstance(wave, (int, float)):
            return {
                "status": "unavailable",
                "assessment": "Wave source is unavailable, so marine anomaly assessment cannot be made.",
                "anomaly_status": "source_unavailable",
                "evidence": [],
                "warnings": [],
                "unavailable_data": ["wave height"],
            }

        ev = self._evidence(ocean, "wave_height", location, "wave_height_m", "m")

        # Deep Ecosystem & Productivity Diagnostics
        eco_diag = ecosystem_anomaly_service.diagnose_productivity_decline(
            latitude=location["latitude"],
            longitude=location["longitude"],
            current_sst=sst if isinstance(sst, (int, float)) else None,
            wind_speed_mps=wind if isinstance(wind, (int, float)) else None,
            observed_at=at,
        )

        wave_condition = "Notable high-wave condition (>= 2.5 m) detected." if wave >= 2.5 else "No operational high-wave condition detected. A true anomaly needs historical reference data."
        combined_assessment = f"{wave_condition} {eco_diag['diagnosis_summary']}"

        return {
            "status": "partial",
            "assessment": combined_assessment,
            "anomaly_status": "notable_condition" if wave >= 2.5 else "insufficient_reference_data",
            "evidence": [ev] if ev else [],
            "warnings": ["Historical/reference baseline is not configured; this is a threshold condition, not a statistical anomaly."],
            "unavailable_data": ["historical wave reference"],
            "ecosystem_diagnosis": eco_diag,
        }

    async def simulation(self, location: dict[str, Any], perturbations: dict[str, Any] | None = None, at: datetime | None = None) -> dict[str, Any]:
        sim_res = await scenario_simulator.simulate(location, perturbations or {}, at)
        baseline = sim_res["baseline"]
        sim = sim_res["simulated"]
        ev = [
            {"source": "Scenario Simulation (Baseline)", "data_type": "baseline_conditions", "location": location, "value": f"SST={baseline['sst_c']}°C, Wave={baseline['wave_height_m']}m, Wind={baseline['wind_speed_mps']}m/s", "freshness": "computed"},
            {"source": "Scenario Simulation (Simulated)", "data_type": "simulated_conditions", "location": location, "value": f"SST={sim['sst_c']}°C, Wave={sim['wave_height_m']}m, Wind={sim['wind_speed_mps']}m/s, MSI={sim['msi']['score']}", "freshness": "simulated"},
        ]
        return {
            "status": "available",
            "assessment": sim_res["scenario_summary"],
            "risk_level": "high" if sim["msi"]["tier"] == "hazardous" else "moderate" if sim["msi"]["tier"] == "marginal" else "low",
            "scenario_simulation": sim_res,
            "marine_safety_index": sim["msi"],
            "evidence": ev,
            "warnings": [f"This is a hypothetical simulation based on applied perturbations: {sim_res['perturbations_applied']}."],
            "unavailable_data": [],
        }

    async def route(self, origin: dict[str, Any], destination: dict[str, Any], route_geometry: dict[str, Any] | None = None, at: datetime | None = None) -> dict[str, Any]:
        self.gis.validate_coordinate(origin["latitude"], origin["longitude"])
        self.gis.validate_coordinate(destination["latitude"], destination["longitude"])
        from app.services.route_analysis_service import RouteAnalysisService
        router_svc = RouteAnalysisService()
        detailed = await router_svc.analyze_route(
            origin_lat=origin["latitude"],
            origin_lon=origin["longitude"],
            dest_lat=destination["latitude"],
            dest_lon=destination["longitude"],
        )

        direct_geometry = route_geometry or {
            "type": "LineString",
            "coordinates": [[origin["longitude"], origin["latitude"]], [destination["longitude"], destination["latitude"]]],
        }
        geometry = detailed.get("route_geometry") if detailed.get("alternative_used") else direct_geometry

        hazards = self._records(("hazard", "hazards", "cyclone", "ibtracs"))
        hits = []
        for r in hazards:
            if r.geometry and (self._route_intersects(direct_geometry, r.geometry) or self._route_intersects(geometry, r.geometry)):
                hits.append({"feature_id": r.id, "source": r.source, "geometry": r.geometry, "reason": "Route intersects loaded hazard feature."})

        distance = detailed.get("route_distance_km") or round(self.gis.distance_between(point(origin["latitude"], origin["longitude"]), point(destination["latitude"], destination["longitude"])), 2)
        status = "partial" if not hazards else "available"
        risk = "high" if (hits and not detailed.get("alternative_used")) else ("moderate" if detailed.get("alternative_used") else ("low" if hazards else "unavailable"))

        assessment = detailed.get("explanation") or (
            "Route intersects hazard feature(s)." if hits
            else "No loaded hazard feature intersects the route." if hazards
            else "Route geometry is valid, but hazard data is unavailable; no safety conclusion can be made."
        )

        return {
            "status": status,
            "assessment": assessment,
            "risk_level": risk,
            "route_geometry": geometry,
            "distance_km": distance,
            "hazard_segments": hits,
            "waypoints": detailed.get("waypoints", []),
            "estimated_travel_time": detailed.get("estimated_travel_time"),
            "marine_safety_index": detailed.get("marine_safety_index"),
            "evidence": [{"source": x["source"], "data_type": "route_hazard_intersection", "value": x["feature_id"], "freshness": "loaded"} for x in hits],
            "warnings": [
                "This is a supplied/direct geometry analysis, not navigational routing." if not detailed.get("alternative_used") else "Route utilizes calculated navigational waypoint bypass.",
                "Safer alternative generation is not supported by current routing infrastructure." if not detailed.get("alternative_used") and not hazards else "Navigational bypass active.",
            ],
            "unavailable_data": [] if hazards else ["route hazard data"],
            "safer_alternatives_supported": detailed.get("alternative_used", False),
            "detailed_analysis": detailed,
        }

    @staticmethod
    def _geometry_centre(geometry: Mapping[str, Any]) -> list[float] | None:
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
            if route.get("type") != "LineString" or feature.get("type") != "Point": return False
            coords, candidate = route.get("coordinates", []), feature.get("coordinates", [])
            if len(candidate) != 2 or len(coords) < 2: return False
            x, y = candidate
            for i in range(len(coords) - 1):
                (x1, y1), (x2, y2) = coords[i], coords[i+1]
                cross = abs((x - x1) * (y2 - y1) - (y - y1) * (x2 - x1))
                if cross < 1e-5 and min(x1, x2) - 1e-6 <= x <= max(x1, x2) + 1e-6 and min(y1, y2) - 1e-6 <= y <= max(y1, y2) + 1e-6:
                    return True
            return False
