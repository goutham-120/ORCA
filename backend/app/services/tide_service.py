"""
Tide and Hydrodynamic Current Prediction Service for Indian Coastal Waters.

Provides astronomical/harmonic tidal predictions and surface drift current vectors
tailored for Indian coastal ports (Visakhapatnam, Chennai, Mumbai, Cochin, Paradip,
Kolkata, Mangalore, Veraval, Tuticorin, Goa, Kakinada, Port Blair).
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
import math
from typing import Any


COASTAL_TIDE_STATIONS = [
    {"name": "Visakhapatnam Fishing Harbour", "latitude": 17.6868, "longitude": 83.2185, "mean_high_m": 1.75, "mean_low_m": 0.35, "phase_offset_hours": 0.0},
    {"name": "Kasimedu Chennai Port", "latitude": 13.1250, "longitude": 80.2980, "mean_high_m": 1.45, "mean_low_m": 0.28, "phase_offset_hours": 0.8},
    {"name": "Sassoon Dock Mumbai", "latitude": 18.9160, "longitude": 72.8250, "mean_high_m": 4.80, "mean_low_m": 0.90, "phase_offset_hours": 4.5},
    {"name": "Neendakara Kollam / Cochin", "latitude": 9.9312, "longitude": 76.2673, "mean_high_m": 1.25, "mean_low_m": 0.25, "phase_offset_hours": 6.2},
    {"name": "Paradip Port Odisha", "latitude": 20.2644, "longitude": 86.6715, "mean_high_m": 2.80, "mean_low_m": 0.55, "phase_offset_hours": 1.1},
    {"name": "Diamond Harbour / Kolkata", "latitude": 22.1867, "longitude": 88.1906, "mean_high_m": 5.20, "mean_low_m": 1.10, "phase_offset_hours": 2.3},
    {"name": "Old Port Mangalore", "latitude": 12.8698, "longitude": 74.8430, "mean_high_m": 1.65, "mean_low_m": 0.35, "phase_offset_hours": 5.1},
    {"name": "Veraval Port Gujarat", "latitude": 20.9077, "longitude": 70.3678, "mean_high_m": 3.40, "mean_low_m": 0.70, "phase_offset_hours": 3.8},
    {"name": "Tuticorin / V.O.C. Port", "latitude": 8.7642, "longitude": 78.1348, "mean_high_m": 1.15, "mean_low_m": 0.30, "phase_offset_hours": 7.5},
    {"name": "Mormugao Port Goa", "latitude": 15.4167, "longitude": 73.8000, "mean_high_m": 2.30, "mean_low_m": 0.50, "phase_offset_hours": 4.9},
    {"name": "Kakinada Deepwater Port", "latitude": 16.9891, "longitude": 82.2858, "mean_high_m": 1.60, "mean_low_m": 0.32, "phase_offset_hours": 0.3},
    {"name": "Port Blair (Andaman)", "latitude": 11.6234, "longitude": 92.7265, "mean_high_m": 2.20, "mean_low_m": 0.40, "phase_offset_hours": 9.4},
]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def find_nearest_station(lat: float, lon: float) -> dict[str, Any]:
    nearest = COASTAL_TIDE_STATIONS[0]
    min_dist = float("inf")
    for st in COASTAL_TIDE_STATIONS:
        d = _haversine_km(lat, lon, st["latitude"], st["longitude"])
        if d < min_dist:
            min_dist = d
            nearest = st
    return {**nearest, "distance_to_station_km": round(min_dist, 1)}


class TidePredictionService:
    """Computes hydrodynamic tide conditions, lunar spring/neap phase, and surface drift."""

    M2_PERIOD_HOURS = 12.4206  # Principal lunar semidiurnal constituent
    S2_PERIOD_HOURS = 12.0000  # Principal solar semidiurnal constituent
    SYNODIC_MONTH_DAYS = 29.530588853

    # Reference epoch: 2026-01-01T00:00:00 UTC (New Moon approx)
    REF_EPOCH = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    def predict_tide(
        self,
        latitude: float,
        longitude: float,
        at: datetime | None = None,
    ) -> dict[str, Any]:
        """
        Calculate full tide telemetry for a given coordinate and timestamp.
        """
        target_time = at or datetime.now(timezone.utc)
        station = find_nearest_station(latitude, longitude)

        # Elapsed hours from reference epoch
        elapsed_hours = (target_time - self.REF_EPOCH).total_seconds() / 3600.0
        adjusted_hours = elapsed_hours - station["phase_offset_hours"]

        # Lunar phase calculation (Spring vs Neap tide)
        days_since_epoch = (target_time - self.REF_EPOCH).total_seconds() / 86400.0
        lunar_age_days = days_since_epoch % self.SYNODIC_MONTH_DAYS
        is_spring = (lunar_age_days < 3.5 or abs(lunar_age_days - 14.76) < 3.5 or lunar_age_days > 26.0)
        spring_neap_phase = "Spring Tide (Stronger Tidal Currents)" if is_spring else "Neap Tide (Moderate Tidal Currents)"
        amplitude_multiplier = 1.25 if is_spring else 0.85

        mean_range = station["mean_high_m"] - station["mean_low_m"]
        amplitude = (mean_range / 2.0) * amplitude_multiplier
        mean_level = (station["mean_high_m"] + station["mean_low_m"]) / 2.0

        # Semidiurnal harmonic wave
        omega_m2 = 2 * math.pi / self.M2_PERIOD_HOURS
        omega_s2 = 2 * math.pi / self.S2_PERIOD_HOURS

        # Current water height (m)
        current_m2 = amplitude * 0.85 * math.cos(omega_m2 * adjusted_hours)
        current_s2 = amplitude * 0.15 * math.cos(omega_s2 * adjusted_hours)
        current_height_m = round(mean_level + current_m2 + current_s2, 2)

        # Derivative for tide direction (Flood vs Ebb)
        rate_of_change = -(amplitude * 0.85 * omega_m2 * math.sin(omega_m2 * adjusted_hours))
        tide_state = "Flood (Rising Tide)" if rate_of_change > 0.02 else ("Ebb (Falling Tide)" if rate_of_change < -0.02 else "Slack Water")

        # Find next High and Low tides in the next 12.5 hours
        high_tide_time, high_tide_height = self._find_extremum(adjusted_hours, station, target_time, find_max=True, amp=amplitude, mean_lvl=mean_level)
        low_tide_time, low_tide_height = self._find_extremum(adjusted_hours, station, target_time, find_max=False, amp=amplitude, mean_lvl=mean_level)

        # Surface drift current estimation (knots & degrees)
        current_speed_knots = round(abs(rate_of_change) * 2.2 + (0.5 if is_spring else 0.25), 1)
        # Alongshore tidal flood direction on East vs West coast of India
        is_west_coast = longitude < 77.5
        if tide_state.startswith("Flood"):
            flow_dir_deg = 0.0 if is_west_coast else 30.0  # Northwards flood
            flow_cardinal = "N" if is_west_coast else "NNE"
        else:
            flow_dir_deg = 180.0 if is_west_coast else 210.0  # Southwards ebb
            flow_cardinal = "S" if is_west_coast else "SSW"

        return {
            "status": "available",
            "station_name": station["name"],
            "station_distance_km": station["distance_to_station_km"],
            "timestamp": target_time.isoformat(),
            "current_height_m": current_height_m,
            "tide_state": tide_state,
            "spring_neap_phase": spring_neap_phase,
            "tidal_range_m": round(amplitude * 2.0, 2),
            "next_high_tide": {
                "time": high_tide_time.isoformat(),
                "time_display": high_tide_time.strftime("%I:%M %p UTC"),
                "height_m": high_tide_height,
            },
            "next_low_tide": {
                "time": low_tide_time.isoformat(),
                "time_display": low_tide_time.strftime("%I:%M %p UTC"),
                "height_m": low_tide_height,
            },
            "current_velocity_knots": current_speed_knots,
            "current_direction_deg": flow_dir_deg,
            "current_direction_cardinal": flow_cardinal,
            "advisory": (
                "High tidal flow: Exercise caution during harbor entry/exit."
                if current_speed_knots >= 1.8
                else "Normal coastal tidal conditions."
            ),
        }

    def _find_extremum(
        self,
        base_hours: float,
        station: dict[str, Any],
        target_time: datetime,
        find_max: bool,
        amp: float,
        mean_lvl: float,
    ) -> tuple[datetime, float]:
        omega = 2 * math.pi / self.M2_PERIOD_HOURS
        # Check in 10-minute intervals over the next 13 hours
        best_time = target_time
        best_val = -float("inf") if find_max else float("inf")

        for minute_offset in range(0, 780, 10):
            future_adj = base_hours + (minute_offset / 60.0)
            h = mean_lvl + amp * math.cos(omega * future_adj)
            if (find_max and h > best_val) or (not find_max and h < best_val):
                best_val = h
                best_time = target_time + timedelta(minutes=minute_offset)

        return best_time, round(best_val, 2)


tide_service = TidePredictionService()
