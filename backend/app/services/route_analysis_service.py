"""
Route Analysis Service for ORCA Marine Decision-Support System.

Evaluates route origin and destination against:
1. GIS hazards and restricted maritime zones (with alternative waypoint routing when path intersects obstacles).
2. Live Weather conditions (precipitation, conditions, warnings).
3. Wind / Breeze conditions (speed, direction, thresholds).
4. Ocean conditions (wave height, SST).

Outputs fisherman-friendly safety classifications: SAFE, CAUTION, UNSAFE, DATA UNAVAILABLE.
Reuses WeatherTool, OceanTool, GISTool, and SpatialFeatureRepository.
"""

from __future__ import annotations

import asyncio
import math
from typing import Any, Mapping

from app.gis.geometry import distance_km
from app.models.spatial_feature import SpatialFeatureRepository, spatial_features
from app.tools.gis_tools import GISTool
from app.tools.ocean_tools import OceanTool
from app.tools.weather_tools import WeatherTool


def _degrees_to_cardinal(deg: float | None) -> str | None:
    if deg is None or not isinstance(deg, (int, float)):
        return None
    val = float(deg) % 360
    directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = int((val + 11.25) / 22.5) % 16
    return directions[idx]


class RouteAnalysisService:
    def __init__(
        self,
        repository: SpatialFeatureRepository | None = None,
        weather: WeatherTool | None = None,
        ocean: OceanTool | None = None,
        gis: GISTool | None = None,
    ) -> None:
        self.repository = repository or spatial_features
        self.weather = weather or WeatherTool()
        self.ocean = ocean or OceanTool()
        self.gis = gis or GISTool()

    async def analyze_route(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        pfz_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Analyze proposed route from (origin_lat, origin_lon) to (dest_lat, dest_lon).
        Returns comprehensive evidence-based route safety assessment.
        """
        # Validate coordinates
        origin_validated = self.gis.validate_coordinate(origin_lat, origin_lon)
        dest_validated = self.gis.validate_coordinate(dest_lat, dest_lon)

        orig_pt = [origin_validated["longitude"], origin_validated["latitude"]]
        dest_pt = [dest_validated["longitude"], dest_validated["latitude"]]

        # 1. Fetch active hazard & restricted features
        hazard_and_restricted = [
            r for r in self.repository.list()
            if (getattr(r, "layer", "") or "").lower() in ("hazards", "restricted_zones")
               or (getattr(r, "dataset", "") or "").lower() in ("hazards", "restricted_zones")
        ]

        # 2. GIS Route & Obstacle Analysis
        direct_line = {
            "type": "LineString",
            "coordinates": [orig_pt, dest_pt],
        }

        intersected_hazards = []
        for feat in hazard_and_restricted:
            if not feat.geometry:
                continue
            if self.gis.geometries_intersect(direct_line, feat.geometry):
                name = feat.properties.get("name") or feat.source_identifier or feat.layer or "Hazard/Restricted Zone"
                layer_type = (feat.layer or feat.dataset or "").replace("_", " ").title()
                intersected_hazards.append(f"{layer_type}: {name}")

        alternative_used = False
        final_route_geom = direct_line

        if intersected_hazards:
            # Attempt alternative routing by placing a mid-way offset waypoint around obstacle
            alt_geom = self._try_alternative_waypoint(orig_pt, dest_pt, hazard_and_restricted)
            if alt_geom:
                final_route_geom = alt_geom
                alternative_used = True
                gis_status = "caution"
                gis_label = "Caution"
                gis_summary = f"Direct route intersected {len(intersected_hazards)} hazard/restricted zone(s). Safe alternative route calculated around obstacles."
            else:
                gis_status = "unsuitable"
                gis_label = "Risk detected"
                gis_summary = f"Route passes directly through {len(intersected_hazards)} marine hazard / restricted zone(s): {', '.join(intersected_hazards)}."
        else:
            gis_status = "suitable"
            gis_label = "Safe"
            gis_summary = "No known GIS hazards or restricted maritime zones detected along route."

        # Compute exact distance along final route geometry
        route_coords = final_route_geom["coordinates"]
        dist_km = 0.0
        for i in range(len(route_coords) - 1):
            p1 = {"type": "Point", "coordinates": route_coords[i]}
            p2 = {"type": "Point", "coordinates": route_coords[i + 1]}
            dist_km += self.gis.distance_between(p1, p2)
        dist_km = round(dist_km, 1)

        # Estimate travel time assuming typical fishing vessel speed (~12 knots / ~22 km/h)
        travel_time_hours = round(dist_km / 22.2, 1) if dist_km > 0 else 0.0
        travel_time_str = f"{int(travel_time_hours * 60)} mins" if travel_time_hours < 1.0 else f"{travel_time_hours} hrs"

        # 3. Concurrent Weather & Ocean telemetry fetches for destination/route
        weather_res, ocean_res = await asyncio.gather(
            self._fetch_weather({"latitude": dest_lat, "longitude": dest_lon}),
            self._fetch_ocean({"latitude": dest_lat, "longitude": dest_lon}),
        )

        weather_analysis = weather_res["weather"]
        wind_analysis = weather_res["wind"]
        ocean_analysis = ocean_res

        # 4. Synthesize Overall Route Safety Classification
        detected_risks = []
        detected_obstacles = list(intersected_hazards)

        if gis_status == "unsuitable":
            detected_risks.append("Passes through hazard/restricted zone")
        elif gis_status == "caution":
            detected_risks.append("Alternative route needed around hazard/restricted zone")

        if weather_analysis["status"] == "unsuitable":
            detected_risks.append("Heavy rain or severe weather")
        if wind_analysis["status"] == "unsuitable":
            detected_risks.append(f"Strong wind speed ({wind_analysis['speed_mps']} m/s)")
        elif wind_analysis["status"] == "caution":
            detected_risks.append(f"Moderate wind speed ({wind_analysis['speed_mps']} m/s)")

        if ocean_analysis["status"] == "unsuitable":
            detected_risks.append(f"High wave height ({ocean_analysis['wave_height_m']} m)")
        elif ocean_analysis["status"] == "caution":
            detected_risks.append(f"Moderate wave height ({ocean_analysis['wave_height_m']} m)")

        # Overall Status Rules:
        # - UNSAFE: If GIS is unsuitable (hazard conflict with no bypass), or Weather/Wind/Ocean is unsuitable.
        # - CAUTION: If GIS is caution (alternative route used), or Weather/Wind/Ocean is caution.
        # - DATA UNAVAILABLE: If any critical source is unavailable AND no explicit UNSAFE/CAUTION condition was triggered.
        # - SAFE: All checks are suitable.
        statuses = [gis_status, weather_analysis["status"], wind_analysis["status"], ocean_analysis["status"]]

        if "unsuitable" in statuses:
            overall_status = "UNSAFE"
        elif "caution" in statuses:
            overall_status = "CAUTION"
        elif "unavailable" in statuses:
            overall_status = "DATA UNAVAILABLE"
        else:
            overall_status = "SAFE"

        # 5. Generate Fisherman-Friendly Explanation
        explanation = self._generate_explanation(
            overall_status=overall_status,
            gis_status=gis_status,
            weather_analysis=weather_analysis,
            wind_analysis=wind_analysis,
            ocean_analysis=ocean_analysis,
            intersected_hazards=intersected_hazards,
            alternative_used=alternative_used,
        )

        return {
            "status": "completed",
            "overall_status": overall_status,
            "route_distance_km": dist_km,
            "estimated_travel_time": travel_time_str,
            "estimated_travel_time_hours": travel_time_hours,
            "route_geometry": final_route_geom,
            "alternative_used": alternative_used,
            "gis_analysis": {
                "status": gis_status,
                "label": gis_label,
                "summary": gis_summary,
                "intersected_count": len(intersected_hazards),
            },
            "weather_analysis": weather_analysis,
            "wind_analysis": wind_analysis,
            "ocean_analysis": ocean_analysis,
            "explanation": explanation,
            "detected_obstacles": detected_obstacles,
            "detected_risks": detected_risks,
        }

    def _try_alternative_waypoint(
        self,
        orig_pt: list[float],
        dest_pt: list[float],
        hazard_records: list[Any],
    ) -> dict[str, Any] | None:
        """Attempt to construct a 3-point route line avoiding hazard polygons."""
        mid_lon = (orig_pt[0] + dest_pt[0]) / 2.0
        mid_lat = (orig_pt[1] + dest_pt[1]) / 2.0

        dx = dest_pt[0] - orig_pt[0]
        dy = dest_pt[1] - orig_pt[1]
        length = math.sqrt(dx * dx + dy * dy) or 1e-6

        # Perpendicular vector
        px = -dy / length
        py = dx / length

        offsets = [0.15, -0.15, 0.25, -0.25]  # approx 15km - 25km offsets

        for offset in offsets:
            waypoint = [mid_lon + px * offset, mid_lat + py * offset]
            test_geom = {
                "type": "LineString",
                "coordinates": [orig_pt, waypoint, dest_pt],
            }

            has_conflict = False
            for feat in hazard_records:
                if feat.geometry and self.gis.geometries_intersect(test_geom, feat.geometry):
                    has_conflict = True
                    break

            if not has_conflict:
                return test_geom

        return None

    async def _fetch_weather(self, location: dict[str, float]) -> dict[str, Any]:
        try:
            res = await self.weather.fetch({"location": location})
            if not res.get("available") or not res.get("observation"):
                return {
                    "weather": {"status": "unavailable", "label": "Unavailable", "summary": "Weather telemetry data unavailable.", "details": {}},
                    "wind": {"status": "unavailable", "label": "Unavailable", "summary": "Wind data unavailable", "speed_mps": None, "direction_degrees": None, "cardinal_direction": None},
                }

            obs = res["observation"]
            wind_mps = obs.get("wind_speed_mps")
            wind_deg = obs.get("wind_direction_degrees")
            rain_mm = obs.get("precipitation_mm")
            condition = obs.get("condition") or "Clear"
            temp_c = obs.get("air_temperature_c")

            cardinal = _degrees_to_cardinal(wind_deg)

            # Weather status
            if isinstance(rain_mm, (int, float)) and rain_mm >= 20.0:
                w_status = "unsuitable"
                w_label = "Unsuitable"
                w_summary = f"Unsuitable weather: Heavy rain ({rain_mm:g} mm)"
            elif isinstance(rain_mm, (int, float)) and rain_mm >= 5.0:
                w_status = "caution"
                w_label = "Caution"
                w_summary = f"Caution: Light to moderate rain ({rain_mm:g} mm)"
            else:
                w_status = "suitable"
                w_label = "Suitable"
                w_summary = f"Suitable weather ({condition}, Rain: {rain_mm or 0:g} mm)"

            # Wind status
            if wind_mps is None:
                wind_status = "unavailable"
                wind_label = "Unavailable"
                wind_summary = "Wind data unavailable"
            elif wind_mps >= 13.9:  # ~27+ knots
                wind_status = "unsuitable"
                wind_label = "Unsuitable"
                wind_summary = f"Unsuitable wind: High speed ({wind_mps:.1f} m/s from {cardinal or 'N/A'})"
            elif wind_mps >= 8.0:   # ~15-27 knots
                wind_status = "caution"
                wind_label = "Caution"
                wind_summary = f"Cautionary breeze ({wind_mps:.1f} m/s from {cardinal or 'N/A'})"
            else:
                wind_status = "suitable"
                wind_label = "Suitable"
                wind_summary = f"Favorable breeze ({wind_mps:.1f} m/s from {cardinal or 'N/A'})"

            return {
                "weather": {
                    "status": w_status,
                    "label": w_label,
                    "summary": w_summary,
                    "details": {
                        "condition": condition,
                        "precipitation_mm": rain_mm,
                        "air_temperature_c": temp_c,
                    },
                },
                "wind": {
                    "status": wind_status,
                    "label": wind_label,
                    "summary": wind_summary,
                    "speed_mps": round(wind_mps, 1) if wind_mps is not None else None,
                    "direction_degrees": wind_deg,
                    "cardinal_direction": cardinal,
                },
            }
        except Exception as exc:
            return {
                "weather": {"status": "unavailable", "label": "Unavailable", "summary": f"Weather data unavailable ({exc}).", "details": {}},
                "wind": {"status": "unavailable", "label": "Unavailable", "summary": "Wind data unavailable", "speed_mps": None, "direction_degrees": None, "cardinal_direction": None},
            }

    async def _fetch_ocean(self, location: dict[str, float]) -> dict[str, Any]:
        try:
            res = await self.ocean.fetch({"location": location})
            if not res.get("available") or not res.get("observation"):
                return {
                    "status": "unavailable",
                    "label": "Unavailable",
                    "summary": "Ocean data unavailable",
                    "wave_height_m": None,
                    "details": {},
                }

            obs = res["observation"]
            wave_m = obs.get("wave_height_m")
            wave_period = obs.get("wave_period_s")
            sst = obs.get("sea_surface_temperature_c")

            if wave_m is None:
                o_status = "unavailable"
                o_label = "Unavailable"
                o_summary = "Ocean data unavailable"
            elif wave_m >= 2.5:
                o_status = "unsuitable"
                o_label = "Unsuitable"
                o_summary = f"Unsuitable ocean: High wave height ({wave_m:.1f} m)"
            elif wave_m >= 1.5:
                o_status = "caution"
                o_label = "Caution"
                o_summary = f"Moderate wave conditions ({wave_m:.1f} m)"
            else:
                o_status = "suitable"
                o_label = "Suitable"
                o_summary = f"Safe wave conditions ({wave_m:.1f} m)"

            return {
                "status": o_status,
                "label": o_label,
                "summary": o_summary,
                "wave_height_m": round(wave_m, 1) if wave_m is not None else None,
                "details": {
                    "wave_period_s": wave_period,
                    "sea_surface_temperature_c": sst,
                },
            }
        except Exception as exc:
            return {
                "status": "unavailable",
                "label": "Unavailable",
                "summary": f"Ocean data unavailable ({exc}).",
                "wave_height_m": None,
                "details": {},
            }

    def _generate_explanation(
        self,
        overall_status: str,
        gis_status: str,
        weather_analysis: dict[str, Any],
        wind_analysis: dict[str, Any],
        ocean_analysis: dict[str, Any],
        intersected_hazards: list[str],
        alternative_used: bool,
    ) -> str:
        if overall_status == "UNSAFE":
            reasons = []
            if gis_status == "unsuitable":
                reasons.append("route passes directly through a restricted maritime / hazard zone")
            if weather_analysis["status"] == "unsuitable":
                reasons.append("heavy rain/adverse weather conditions are present")
            if wind_analysis["status"] == "unsuitable":
                reasons.append(f"strong wind speed ({wind_analysis.get('speed_mps')} m/s) is detected")
            if ocean_analysis["status"] == "unsuitable":
                reasons.append(f"dangerous wave height ({ocean_analysis.get('wave_height_m')} m) is present")

            return f"UNSAFE — {', '.join(reasons).capitalize()}. Avoid travelling along this route at this time."

        if overall_status == "CAUTION":
            reasons = []
            if alternative_used:
                reasons.append("the route avoids restricted zones via an alternative waypoint")
            if wind_analysis["status"] == "caution":
                reasons.append(f"moderate wind conditions ({wind_analysis.get('speed_mps')} m/s) are present")
            if ocean_analysis["status"] == "caution":
                reasons.append(f"moderate wave height ({ocean_analysis.get('wave_height_m')} m) is detected")
            if weather_analysis["status"] == "caution":
                reasons.append("light rain is expected")

            return f"CAUTION — {', '.join(reasons).capitalize()}. Travel with care and check local forecasts."

        if overall_status == "DATA UNAVAILABLE":
            return "DATA UNAVAILABLE — Live Weather/Ocean telemetry could not be fully retrieved. Safety cannot be fully assessed."

        return "SAFE — Favorable wind, calm ocean wave conditions, and clear GIS passage to destination."
