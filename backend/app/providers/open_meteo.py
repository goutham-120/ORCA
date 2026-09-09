"""Open-Meteo weather and marine data access with normalized responses."""

import asyncio
from copy import deepcopy
from datetime import datetime, timezone
import json
from typing import Any
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen


WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
WEATHER_FIELDS = (
    "temperature_2m,relative_humidity_2m,precipitation,pressure_msl,"
    "wind_speed_10m,wind_direction_10m,weather_code"
)
MARINE_FIELDS = "sea_surface_temperature,wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction"
WEATHER_FORECAST_FIELDS = "temperature_2m,precipitation,wind_speed_10m,wind_direction_10m"
MARINE_FORECAST_FIELDS = "sea_surface_temperature,wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction"


class ProviderError(RuntimeError):
    """Raised when a provider cannot return a valid payload."""


def _timestamp(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=timezone.utc).isoformat()
    except ValueError:
        return None


def _number(value: Any, *, minimum: float | None = None, maximum: float | None = None) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    result = float(value)
    if (minimum is not None and result < minimum) or (maximum is not None and result > maximum):
        return None
    return result


def _coordinates(request: dict[str, Any]) -> tuple[float, float]:
    location = request.get("location") or {}
    latitude = _number(location.get("latitude"), minimum=-90, maximum=90)
    longitude = _number(location.get("longitude"), minimum=-180, maximum=180)
    if latitude is None or longitude is None:
        raise ProviderError("A valid latitude and longitude are required for live data.")
    return latitude, longitude


def _weather_description(code: Any) -> str | None:
    descriptions = {0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "rime fog", 51: "light drizzle", 53: "moderate drizzle", 55: "dense drizzle", 61: "slight rain", 63: "moderate rain", 65: "heavy rain", 71: "slight snow", 73: "moderate snow", 75: "heavy snow", 80: "rain showers", 81: "moderate rain showers", 82: "violent rain showers", 95: "thunderstorm", 96: "thunderstorm with hail", 99: "severe thunderstorm with hail"}
    return descriptions.get(code) if isinstance(code, int) else None


class OpenMeteoProvider:
    """Small provider with in-memory recent-value caching and retry handling."""

    def __init__(self, endpoint: str, fields: str, normalizer: Any, *, parameter: str = "current") -> None:
        self.endpoint = endpoint
        self.fields = fields
        self.normalizer = normalizer
        self.parameter = parameter
        self._cache: dict[tuple[float, float], dict[str, Any]] = {}

    async def fetch(self, request: dict[str, Any]) -> dict[str, Any]:
        try:
            latitude, longitude = _coordinates(request)
        except ProviderError as error:
            return {"available": False, "source_status": "unavailable", "provider": "Open-Meteo", "error": str(error), "observation": None}
        key = (latitude, longitude)
        try:
            payload = await self._request(latitude, longitude)
            normalized = self.normalizer(payload, latitude, longitude)
            self._cache[key] = deepcopy(normalized)
            return normalized
        except (ProviderError, URLError, TimeoutError, json.JSONDecodeError) as error:
            cached = self._cache.get(key)
            if cached:
                result = deepcopy(cached)
                result["source_status"] = "cached"
                result["error"] = f"Live provider unavailable: {error}"
                return result
            return {"available": False, "source_status": "unavailable", "provider": "Open-Meteo", "error": f"Live provider unavailable: {error}", "observation": None}

    async def _request(self, latitude: float, longitude: float) -> dict[str, Any]:
        parameters_dict: dict[str, Any] = {"latitude": latitude, "longitude": longitude, self.parameter: self.fields, "timezone": "GMT", "wind_speed_unit": "ms"}
        if self.parameter == "hourly":
            # Open-Meteo validates range constraints; clamp requests to published limits.
            parameters_dict["forecast_days"] = 3
            parameters_dict["cell_selection"] = "sea" if self.endpoint == MARINE_URL else "land"
        parameters = urlencode(parameters_dict)
        url = f"{self.endpoint}?{parameters}"
        last_error: Exception | None = None
        for _ in range(2):
            try:
                return await asyncio.to_thread(self._read_json, url)
            except (URLError, TimeoutError, json.JSONDecodeError) as error:
                last_error = error
        raise ProviderError(str(last_error or "request failed"))

    @staticmethod
    def _read_json(url: str) -> dict[str, Any]:
        with urlopen(url, timeout=8) as response:  # nosec B310: fixed HTTPS provider URL
            payload = json.loads(response.read().decode("utf-8"))
        if not isinstance(payload, dict):
            raise ProviderError("Provider response was not an object.")
        return payload


def normalize_weather(payload: dict[str, Any], latitude: float, longitude: float) -> dict[str, Any]:
    current = payload.get("current")
    if not isinstance(current, dict) or _timestamp(current.get("time")) is None:
        raise ProviderError("Provider response omitted a valid current weather observation.")
    observation = {
        "latitude": _number(payload.get("latitude"), minimum=-90, maximum=90) or latitude,
        "longitude": _number(payload.get("longitude"), minimum=-180, maximum=180) or longitude,
        "timestamp": _timestamp(current["time"]), "air_temperature_c": _number(current.get("temperature_2m")),
        "wind_speed_mps": _number(current.get("wind_speed_10m"), minimum=0), "wind_direction_degrees": _number(current.get("wind_direction_10m"), minimum=0, maximum=360),
        "precipitation_mm": _number(current.get("precipitation"), minimum=0), "pressure_hpa": _number(current.get("pressure_msl"), minimum=800, maximum=1100),
        "humidity_percent": _number(current.get("relative_humidity_2m"), minimum=0, maximum=100), "condition": _weather_description(current.get("weather_code")),
    }
    return {"available": True, "source_status": "live", "provider": "Open-Meteo Forecast API", "source_url": WEATHER_URL, "observation": observation}


def normalize_marine(payload: dict[str, Any], latitude: float, longitude: float) -> dict[str, Any]:
    current = payload.get("current")
    if not isinstance(current, dict) or _timestamp(current.get("time")) is None:
        raise ProviderError("Provider response omitted a valid current marine observation.")
    observation = {
        "latitude": _number(payload.get("latitude"), minimum=-90, maximum=90) or latitude,
        "longitude": _number(payload.get("longitude"), minimum=-180, maximum=180) or longitude,
        "timestamp": _timestamp(current["time"]), "sea_surface_temperature_c": _number(current.get("sea_surface_temperature")),
        "wave_height_m": _number(current.get("wave_height"), minimum=0), "wave_direction_degrees": _number(current.get("wave_direction"), minimum=0, maximum=360),
        "wave_period_s": _number(current.get("wave_period"), minimum=0),
        # Open-Meteo's marine API returns ocean-current velocity in km/h by default.
        "current": {"speed_kmh": _number(current.get("ocean_current_velocity"), minimum=0), "direction_degrees": _number(current.get("ocean_current_direction"), minimum=0, maximum=360)} if current.get("ocean_current_velocity") is not None else None,
    }
    return {"available": True, "source_status": "live", "provider": "Open-Meteo Marine API", "source_url": MARINE_URL, "observation": observation}


def _hourly_records(payload: dict[str, Any], latitude: float, longitude: float, fields: dict[str, tuple[str, float | None, float | None]]) -> list[dict[str, Any]]:
    hourly = payload.get("hourly")
    times = hourly.get("time") if isinstance(hourly, dict) else None
    if not isinstance(times, list):
        raise ProviderError("Provider response omitted hourly timestamps.")
    records = []
    for index, value in enumerate(times):
        timestamp = _timestamp(value)
        if timestamp is None:
            continue
        record = {"latitude": _number(payload.get("latitude"), minimum=-90, maximum=90) or latitude,
                  "longitude": _number(payload.get("longitude"), minimum=-180, maximum=180) or longitude,
                  "timestamp": timestamp}
        for output, (field, minimum, maximum) in fields.items():
            values = hourly.get(field)
            record[output] = _number(values[index], minimum=minimum, maximum=maximum) if isinstance(values, list) and index < len(values) else None
        records.append(record)
    if not records:
        raise ProviderError("Provider response contained no valid hourly observations.")
    return records


def normalize_weather_forecast(payload: dict[str, Any], latitude: float, longitude: float) -> dict[str, Any]:
    records = _hourly_records(payload, latitude, longitude, {"air_temperature_c": ("temperature_2m", None, None), "precipitation_mm": ("precipitation", 0, None), "wind_speed_mps": ("wind_speed_10m", 0, None), "wind_direction_degrees": ("wind_direction_10m", 0, 360)})
    return {"available": True, "source_status": "live", "provider": "Open-Meteo Forecast API", "source_url": WEATHER_URL, "fetched_at": datetime.now(timezone.utc).isoformat(), "forecast": records}


def normalize_marine_forecast(payload: dict[str, Any], latitude: float, longitude: float) -> dict[str, Any]:
    records = _hourly_records(payload, latitude, longitude, {"sea_surface_temperature_c": ("sea_surface_temperature", None, None), "wave_height_m": ("wave_height", 0, None), "wave_direction_degrees": ("wave_direction", 0, 360), "wave_period_s": ("wave_period", 0, None), "current_speed_kmh": ("ocean_current_velocity", 0, None), "current_direction_degrees": ("ocean_current_direction", 0, 360)})
    return {"available": True, "source_status": "live", "provider": "Open-Meteo Marine API", "source_url": MARINE_URL, "fetched_at": datetime.now(timezone.utc).isoformat(), "forecast": records}


weather_provider = OpenMeteoProvider(WEATHER_URL, WEATHER_FIELDS, normalize_weather)
marine_provider = OpenMeteoProvider(MARINE_URL, MARINE_FIELDS, normalize_marine)
weather_forecast_provider = OpenMeteoProvider(WEATHER_URL, WEATHER_FORECAST_FIELDS, normalize_weather_forecast, parameter="hourly")
marine_forecast_provider = OpenMeteoProvider(MARINE_URL, MARINE_FORECAST_FIELDS, normalize_marine_forecast, parameter="hourly")
