from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.analysis.safety_index import compute_marine_safety_index
from app.gis.geometry import distance_km, point
from app.models.spatial_feature import spatial_features
from app.providers.open_meteo import marine_provider, weather_provider
from app.schemas.resources import AlertResponse


class AlertService:
    def __init__(self) -> None:
        self._alerts: dict[str, AlertResponse] = {}
        self._seed_default_advisories()

    def _seed_default_advisories(self) -> None:
        now = datetime.now(timezone.utc)
        defaults = [
            AlertResponse(
                id="alert-incois-swas-01",
                title="INCOIS High Wave & Ocean State Alert (Bay of Bengal)",
                severity="high",
                status="active",
                created_at=now,
                details={
                    "message": "Rough sea state with swell wave heights 2.2m to 2.8m expected off Andhra Pradesh & North Tamil Nadu coast. Small craft operators advised to exercise caution.",
                    "source": "INCOIS / IMD",
                },
            ),
            AlertResponse(
                id="alert-imbl-security-01",
                title="International Maritime Boundary Line (IMBL) Vigilance Notice",
                severity="low",
                status="active",
                created_at=now,
                details={
                    "message": "All fishing craft operating in Palk Bay and Gulf of Mannar are reminded to remain well within Indian territorial waters (at least 5 NM inside IMBL).",
                    "source": "Indian Coast Guard",
                },
            ),
        ]
        for alert in defaults:
            self._alerts[alert.id] = alert

    def list(self) -> list[AlertResponse]:
        return sorted(self._alerts.values(), key=lambda item: item.created_at, reverse=True)

    def get(self, alert_id: str) -> AlertResponse | None:
        return self._alerts.get(alert_id)

    async def check_location_alerts(self, latitude: float, longitude: float) -> list[dict[str, Any]]:
        """Evaluate real-time telemetry and spatial boundaries around user coordinates to generate proactive alerts."""
        alerts: list[dict[str, Any]] = []
        now = datetime.now(timezone.utc).isoformat()
        user_pt = point(latitude, longitude)

        # 1. Fetch live weather & ocean telemetry
        try:
            req = {"location": {"latitude": latitude, "longitude": longitude}}
            w_res, m_res = await asyncio.gather(
                weather_provider.fetch(req),
                marine_provider.fetch(req),
                return_exceptions=True,
            )

            w_obs = w_res.get("observation") or {} if isinstance(w_res, dict) else {}
            m_obs = m_res.get("observation") or {} if isinstance(m_res, dict) else {}

            wave_h = m_obs.get("wave_height_m")
            wave_p = m_obs.get("wave_period_s")
            wind_mps = w_obs.get("wind_speed_mps")
            precip_mm = w_obs.get("precipitation_mm")
            cond = str(w_obs.get("condition") or "").lower()

            # A. High Wave / Sea State Hazard
            if isinstance(wave_h, (int, float)):
                if wave_h >= 3.5:
                    alerts.append({
                        "id": f"alert-wave-{uuid4().hex[:8]}",
                        "category": "ocean_hazard",
                        "severity": "critical",
                        "title": f"🛑 Critical Sea State Alert ({wave_h:.1f}m Waves)",
                        "message": f"Dangerous high waves ({wave_h:.1f}m) detected near your area. Severe capsizing risk.",
                        "action": "Immediate Halt: Cancel departures, secure moorings, and do not venture offshore.",
                        "timestamp": now,
                    })
                elif wave_h >= 2.2:
                    alerts.append({
                        "id": f"alert-wave-{uuid4().hex[:8]}",
                        "category": "ocean_hazard",
                        "severity": "warning",
                        "title": f"⚠️ Rough Sea Warning ({wave_h:.1f}m Waves)",
                        "message": f"Wave height exceeds 2.2m. Choppy sea state unsafe for open dinghies and small craft.",
                        "action": "Proceed with caution; small fishing boats advised to stay in sheltered coastal waters.",
                        "timestamp": now,
                    })

            # B. Gale Force Winds & Gusts
            if isinstance(wind_mps, (int, float)):
                kts = round(wind_mps * 1.94384, 1)
                if wind_mps >= 17.2:
                    alerts.append({
                        "id": f"alert-wind-{uuid4().hex[:8]}",
                        "category": "weather_hazard",
                        "severity": "critical",
                        "title": f"🛑 Gale Force Wind Alert ({wind_mps:.1f} m/s / {kts} kts)",
                        "message": "Storm/Gale-force winds active. Navigational danger and severe sea heaps.",
                        "action": "Suspend harbor departures and maintain radio watch on VHF Channel 16.",
                        "timestamp": now,
                    })
                elif wind_mps >= 10.8:
                    alerts.append({
                        "id": f"alert-wind-{uuid4().hex[:8]}",
                        "category": "weather_hazard",
                        "severity": "warning",
                        "title": f"⚠️ Strong Wind Advisory ({wind_mps:.1f} m/s / {kts} kts)",
                        "message": "Fresh to strong breeze generating steep wind chop.",
                        "action": "Small craft caution in effect; wear SOLAS life jackets.",
                        "timestamp": now,
                    })

            # C. Convective Thunderstorm / Lightning
            if any(term in cond for term in ("thunderstorm", "squall", "lightning", "cyclone")):
                alerts.append({
                    "id": f"alert-storm-{uuid4().hex[:8]}",
                    "category": "convective_hazard",
                    "severity": "high",
                    "title": "⚡ Thunderstorm & Convective Squall Alert",
                    "message": f"Convective storm detected ({cond}). High risk of lightning and sudden erratic wind squalls.",
                    "action": "Lower all electrical antennas and navigate away from dark convective cloud walls.",
                    "timestamp": now,
                })

        except Exception:
            pass

        # 2. Check GIS Restricted Waters & Geofence Boundaries
        try:
            records = spatial_features.list()
            for r in records:
                if not r.geometry:
                    continue
                layer_type = (r.layer or r.dataset or "").lower()
                name = r.properties.get("name") or r.source_identifier or "Restricted Zone"

                # Check proximity / intersection
                coords = None
                if r.geometry.get("type") == "Polygon" and r.geometry.get("coordinates"):
                    poly_coords = r.geometry["coordinates"][0]
                    c_lon = sum(p[0] for p in poly_coords) / len(poly_coords)
                    c_lat = sum(p[1] for p in poly_coords) / len(poly_coords)
                    dist = distance_km(user_pt, point(c_lat, c_lon))

                    if layer_type in ("restricted_zones", "naval_exclusion", "mpa") and dist <= 12.0:
                        alerts.append({
                            "id": f"alert-geofence-{r.id}",
                            "category": "geofence",
                            "severity": "high" if dist <= 5.0 else "warning",
                            "title": f"📍 Geofence Proximity Alert: {name}",
                            "message": f"You are {dist:.1f} km from a regulated boundary ({name}). Entry without clearance is prohibited.",
                            "action": "Alter course immediately to maintain mandatory clearance corridor.",
                            "timestamp": now,
                        })
                    elif layer_type in ("hazards", "cyclone", "ibtracs") and dist <= 15.0:
                        alerts.append({
                            "id": f"alert-hazard-{r.id}",
                            "category": "spatial_hazard",
                            "severity": "high" if dist <= 8.0 else "warning",
                            "title": f"⚠️ Navigational Hazard Proximity: {name}",
                            "message": f"Submerged hazard / reef / traffic corridor detected within {dist:.1f} km.",
                            "action": "Verify navigational charts and maintain active visual lookout.",
                            "timestamp": now,
                        })
        except Exception:
            pass

        return alerts

