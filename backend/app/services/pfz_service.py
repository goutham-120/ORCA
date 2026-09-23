"""
Nearest Suitable Potential Fishing Zone (PFZ) discovery engine.

Evaluates ALL PFZs against selected location and search radius.
Calculates authoritative minimum geometry distance and within_radius flag for every PFZ.
Selects the candidate with the shortest geographic distance that satisfies Weather, Ocean, and GIS suitability.
"""

from __future__ import annotations

import asyncio
from typing import Any, Mapping
from app.services.spatial_query_service import SpatialQueryService, _distance_to_geojson_km
from app.tools.weather_tools import WeatherTool
from app.tools.ocean_tools import OceanTool
from app.tools.gis_tools import GISTool
from app.models.spatial_feature import spatial_features, SpatialFeatureRepository


class PFZDiscoveryService:
    def __init__(
        self,
        repository: SpatialFeatureRepository | None = None,
        weather: WeatherTool | None = None,
        ocean: OceanTool | None = None,
        gis: GISTool | None = None,
    ) -> None:
        self.repository = repository or spatial_features
        self.spatial = SpatialQueryService(self.repository)
        self.weather = weather or WeatherTool()
        self.ocean = ocean or OceanTool()
        self.gis = gis or GISTool()

    async def find_nearest_suitable_pfz(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 50.0,
    ) -> dict[str, Any]:
        """
        Find nearest suitable PFZ within radius_km evaluating Weather, Ocean, and GIS evidence.
        Provides authoritative geometry distance_km and within_radius boolean for ALL PFZs.
        """
        if radius_km <= 0:
            raise ValueError("Radius must be greater than 0.")

        print(f"\n[PFZ Discovery Engine] --- NEW DISCOVERY REQUEST ---")
        print(f"[PFZ Discovery Engine] Selected Location: {latitude:.4f}°N, {longitude:.4f}°E | Radius: {radius_km:g} km")

        # 1. Fetch authorized PFZ records from repository (case-insensitive dataset/layer search)
        pfz_records = self.repository.list(dataset="PFZ")
        if not pfz_records:
            pfz_records = self.repository.list(layer="pfz")
        if not pfz_records:
            pfz_records = [
                r for r in self.repository.list()
                if (getattr(r, "dataset", "") or "").lower() == "pfz"
                or (getattr(r, "layer", "") or "").lower() == "pfz"
            ]

        print(f"[PFZ Discovery Engine] Retrieved {len(pfz_records)} total PFZ record(s) from database.")

        if not pfz_records:
            print("[PFZ Discovery Engine] Result: ZERO PFZ records found in database.")
            return {
                "selected_pfz": None,
                "selected_geometry": None,
                "distance_km": None,
                "requested_radius_km": radius_km,
                "weather_status": "unavailable",
                "weather_evidence": {"summary": "PFZ database records unavailable.", "status": "unavailable"},
                "ocean_status": "unavailable",
                "ocean_evidence": {"summary": "PFZ database records unavailable.", "status": "unavailable"},
                "gis_status": "unavailable",
                "gis_evidence": {"summary": "PFZ database records unavailable.", "status": "unavailable"},
                "overall_suitability": "no_pfz_found",
                "reason": "PFZ dataset is currently empty or unpopulated.",
                "candidate_pfzs": [],
                "all_pfzs": [],
                "route_geometry": None,
            }

        # Fetch active hazard/restricted features for GIS evaluation
        hazard_records = [
            r for r in self.repository.list()
            if (getattr(r, "layer", "") or "").lower() in ("hazards", "restricted_zones")
               or (getattr(r, "dataset", "") or "").lower() in ("hazards", "restricted_zones")
        ]

        # 2. Compute authoritative minimum geometry distance for EVERY PFZ record
        all_evaluated_pfzs = []
        in_radius_candidates = []

        for record in pfz_records:
            if not record.geometry:
                continue

            dist = _distance_to_geojson_km(latitude, longitude, record.geometry)
            if dist is None:
                continue

            dist_km = round(dist, 2)
            within_radius = bool(dist_km <= radius_km)
            rep_pt = _get_representative_point(record.geometry) or [longitude, latitude]

            pfz_info = {
                "id": str(record.id),
                "name": record.properties.get("name") or record.source_identifier or str(record.id),
                "layer": record.layer,
                "source": record.source,
                "distance_km": dist_km,
                "within_radius": within_radius,
                "geometry": record.geometry,
                "properties": record.properties,
                "rep_point": rep_pt,
                "weather_status": "pending",
                "ocean_status": "pending",
                "gis_status": "pending",
                "suitability": "pending",
            }

            all_evaluated_pfzs.append(pfz_info)
            if within_radius:
                in_radius_candidates.append(pfz_info)

        print(f"[PFZ Discovery Engine] Candidates inside search radius ({radius_km:g} km): {len(in_radius_candidates)} of {len(all_evaluated_pfzs)}")
        # Multi-Modal Land Transit Check (Road to Shore vs Sea Voyage)
        from app.services.road_routing_service import RoadRoutingService
        road_svc = RoadRoutingService()
        land_transit = await road_svc.get_land_to_harbor_route(latitude, longitude)

        # 2. Check if candidates exist inside search radius
        if not in_radius_candidates:
            nearest_outside = all_evaluated_pfzs[0] if all_evaluated_pfzs else None
            outside_dist_str = f" Nearest PFZ outside radius is at {nearest_outside['distance_km']} km." if nearest_outside else ""
            print(f"[PFZ Discovery Engine] Result: no_pfz_found.{outside_dist_str}")
            return {
                "selected_pfz": None,
                "selected_geometry": None,
                "distance_km": None,
                "requested_radius_km": radius_km,
                "weather_status": "unavailable",
                "weather_evidence": {"summary": "No PFZ candidates inside search radius.", "status": "unavailable"},
                "ocean_status": "unavailable",
                "ocean_evidence": {"summary": "No PFZ candidates inside search radius.", "status": "unavailable"},
                "gis_status": "unavailable",
                "gis_evidence": {"summary": "No PFZ candidates inside search radius.", "status": "unavailable"},
                "overall_suitability": "no_pfz_found",
                "reason": f"No PFZ found within the selected radius of {radius_km:g} km.{outside_dist_str}",
                "candidate_pfzs": [],
                "all_pfzs": all_evaluated_pfzs,
                "route_geometry": None,
                "land_transit": land_transit if land_transit.get("land_transit_needed") else None,
            }

        # 3. Sort candidates within radius by distance ascending (nearest first)
        in_radius_candidates.sort(key=lambda c: c["distance_km"])

        # 4. Evaluate candidates in distance order (run Weather, Ocean, GIS concurrently)
        async def evaluate_single_candidate(cand: dict[str, Any]) -> dict[str, Any]:
            rec_geom = cand["geometry"]
            cand_lon, cand_lat = cand["rep_point"]
            cand_location = {"latitude": cand_lat, "longitude": cand_lon}

            # Concurrent Weather + Ocean evaluation; GIS is local
            weather_res, ocean_res = await asyncio.gather(
                self._evaluate_weather(cand_location),
                self._evaluate_ocean(cand_location),
            )
            gis_res = self._evaluate_gis(rec_geom, hazard_records)

            w_status = weather_res["status"]
            o_status = ocean_res["status"]
            g_status = gis_res["status"]

            # Suitability determination rules:
            # - If all 3 pass -> "suitable"
            # - Else if any is explicitly "unsuitable" (e.g. hazard conflict, high wind/waves) -> "unsuitable"
            # - Else (if any status is "unavailable" and none is "unsuitable") -> "data_unavailable"
            if w_status == "suitable" and o_status == "suitable" and g_status == "suitable":
                cand_overall = "suitable"
            elif "unsuitable" in (w_status, o_status, g_status):
                cand_overall = "unsuitable"
            else:
                cand_overall = "data_unavailable"

            updated_cand = dict(cand)
            updated_cand["weather_status"] = w_status
            updated_cand["weather_summary"] = weather_res["summary"]
            updated_cand["ocean_status"] = o_status
            updated_cand["ocean_summary"] = ocean_res["summary"]
            updated_cand["gis_status"] = g_status
            updated_cand["gis_summary"] = gis_res["summary"]
            updated_cand["suitability"] = cand_overall

            print(
                f"[PFZ Discovery Candidate] ID={updated_cand['id']} ({updated_cand['name']}) | "
                f"Dist={updated_cand['distance_km']} km | InRadius=True | "
                f"Weather={w_status} | Ocean={o_status} | GIS={g_status} | Final={cand_overall}"
            )
            return updated_cand

        evaluated_candidates = await asyncio.gather(*(evaluate_single_candidate(c) for c in in_radius_candidates))

        # 5. Select shortest distance candidate based on overall suitability preference
        suitable_candidates = [c for c in evaluated_candidates if c["suitability"] == "suitable"]
        data_unavailable_candidates = [c for c in evaluated_candidates if c["suitability"] == "data_unavailable"]

        if suitable_candidates:
            # Pick nearest suitable candidate
            selected = min(suitable_candidates, key=lambda c: c["distance_km"])
            overall_status = "suitable"
            reason = (
                f"Nearest suitable PFZ ({selected['name']}) found at minimum distance of {selected['distance_km']} km "
                f"within {radius_km:g} km radius satisfying Weather, Ocean, and GIS suitability conditions."
            )
        elif data_unavailable_candidates:
            # Candidates exist inside radius, but telemetry APIs were partially unavailable
            selected = min(data_unavailable_candidates, key=lambda c: c["distance_km"])
            overall_status = "data_unavailable"
            reason = (
                f"PFZ candidate(s) found within {radius_km:g} km radius (nearest: {selected['name']} at {selected['distance_km']} km), "
                f"but some required telemetry (Weather/Ocean/GIS) could not be retrieved."
            )
        else:
            # Candidates exist inside radius, but failed safety thresholds (e.g. hazard conflicts or wind/waves)
            selected = evaluated_candidates[0]
            overall_status = "unsuitable"
            reason = (
                f"PFZ candidate(s) found within {radius_km:g} km radius (nearest: {selected['name']} at {selected['distance_km']} km), "
                f"but failed safety or environmental suitability thresholds."
            )
        route_geom = None
        if selected and selected.get("rep_point"):
            if land_transit.get("land_transit_needed") and land_transit.get("harbor"):
                h_lon = land_transit["harbor"]["longitude"]
                h_lat = land_transit["harbor"]["latitude"]
                # Straight marine track from harbor to offshore PFZ
                route_geom = {
                    "type": "LineString",
                    "coordinates": [
                        [h_lon, h_lat],
                        selected["rep_point"],
                    ],
                }
            else:
                route_geom = {
                    "type": "LineString",
                    "coordinates": [
                        [longitude, latitude],
                        selected["rep_point"],
                    ],
                }

        print(f"[PFZ Discovery Result] Overall Suitability: '{overall_status}'")
        print(f"[PFZ Discovery Result] Selected PFZ: {selected['name'] if selected else 'None'} | Distance: {selected['distance_km'] if selected else 'N/A'} km")
        print(f"[PFZ Discovery Engine] --- DISCOVERY COMPLETE ---\n")

        return {
            "selected_pfz": selected if overall_status == "suitable" else selected,
            "selected_geometry": selected["geometry"] if selected else None,
            "distance_km": selected["distance_km"] if selected else None,
            "requested_radius_km": radius_km,
            "weather_status": selected["weather_status"] if selected else "unavailable",
            "weather_evidence": {"status": selected.get("weather_status", "unavailable"), "summary": selected.get("weather_summary", "No weather summary") if selected else "N/A"},
            "ocean_status": selected["ocean_status"] if selected else "unavailable",
            "ocean_evidence": {"status": selected.get("ocean_status", "unavailable"), "summary": selected.get("ocean_summary", "No ocean summary") if selected else "N/A"},
            "gis_status": selected["gis_status"] if selected else "unavailable",
            "gis_evidence": {"status": selected.get("gis_status", "unavailable"), "summary": selected.get("gis_summary", "No GIS summary") if selected else "N/A"},
            "overall_suitability": overall_status,
            "reason": reason,
            "candidate_pfzs": evaluated_candidates,
            "all_pfzs": all_evaluated_pfzs,
            "route_geometry": route_geom,
            "land_transit": land_transit if land_transit.get("land_transit_needed") else None,
        }

    async def _evaluate_weather(self, location: dict[str, Any]) -> dict[str, Any]:
        try:
            res = await self.weather.fetch({"location": location})
            obs = res.get("observation") or {}
            wind = obs.get("wind_speed_mps")
            rain = obs.get("precipitation_mm")
            condition = str(obs.get("condition") or "").lower()

            if wind is None and rain is None and not condition:
                return {"status": "unavailable", "summary": "Weather telemetry data unavailable."}

            issues = []
            if isinstance(wind, (int, float)) and wind >= 13.9:
                issues.append(f"High wind speed ({wind:g} m/s)")
            if isinstance(rain, (int, float)) and rain >= 20.0:
                issues.append(f"Heavy precipitation ({rain:g} mm)")
            if "thunderstorm" in condition or "squall" in condition:
                issues.append(f"Convective activity ({obs.get('condition')})")

            if issues:
                return {"status": "unsuitable", "summary": "Weather unfavorable: " + ", ".join(issues)}
            return {"status": "suitable", "summary": f"Weather favorable (Wind: {wind or 0:g} m/s, Rain: {rain or 0:g} mm)"}
        except Exception as exc:
            return {"status": "unavailable", "summary": f"Weather telemetry unavailable ({exc})."}

    async def _evaluate_ocean(self, location: dict[str, Any]) -> dict[str, Any]:
        try:
            res = await self.ocean.fetch({"location": location})
            obs = res.get("observation") or {}
            wave = obs.get("wave_height_m")

            if wave is None:
                return {"status": "unavailable", "summary": "Ocean telemetry data unavailable."}

            if isinstance(wave, (int, float)) and wave >= 2.5:
                return {"status": "unsuitable", "summary": f"Ocean unfavorable: High wave height ({wave:g} m)"}

            return {"status": "suitable", "summary": f"Ocean favorable (Wave height: {wave:g} m)"}
        except Exception as exc:
            return {"status": "unavailable", "summary": f"Ocean telemetry unavailable ({exc})."}

    def _evaluate_gis(self, geometry: Mapping[str, Any], hazard_records: list[Any]) -> dict[str, Any]:
        try:
            conflicts = []
            for hazard in hazard_records:
                if not hazard.geometry:
                    continue
                if self.gis.geometries_intersect(geometry, hazard.geometry):
                    haz_name = hazard.properties.get("name") or hazard.source_identifier or "Hazard area"
                    conflicts.append(f"Intersects {haz_name}")

            if conflicts:
                return {"status": "unsuitable", "summary": "GIS conflict: " + ", ".join(conflicts)}
            return {"status": "suitable", "summary": "GIS favorable (No hazard or restricted zone conflicts)"}
        except Exception as exc:
            return {"status": "unavailable", "summary": f"GIS evaluation error ({exc})."}


def _get_representative_point(geometry: Mapping[str, Any]) -> list[float] | None:
    coordinates = geometry.get("coordinates")
    kind = geometry.get("type")
    if kind == "Point" and isinstance(coordinates, list) and len(coordinates) >= 2:
        return [float(coordinates[0]), float(coordinates[1])]
    
    flat: list[list[float]] = []
    def visit(val: Any) -> None:
        if isinstance(val, (list, tuple)) and len(val) >= 2 and all(isinstance(x, (int, float)) for x in val[:2]):
            flat.append([float(val[0]), float(val[1])])
        elif isinstance(val, (list, tuple)):
            for item in val:
                visit(item)
    visit(coordinates)
    if flat:
        avg_lon = sum(p[0] for p in flat) / len(flat)
        avg_lat = sum(p[1] for p in flat) / len(flat)
        return [avg_lon, avg_lat]
    return None

