"""Open-Meteo weather and marine data access with normalized responses."""

import asyncio
from copy import deepcopy
from datetime import datetime, timezone
from datetime import date, timedelta
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
MARINE_FIELDS = "sea_surface_temperature,wave_height,wave_direction,wave_period"


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


def _requested_date(request: dict[str, Any]) -> date | None:
    expression = request.get("metadata", {}).get("time_expression") if isinstance(request.get("metadata"), dict) else None
    expression = expression or request.get("time_expression")
    if not isinstance(expression, str):
        return None
    lowered = expression.lower()
    if lowered.startswith("tomorrow"):
        return datetime.now(timezone.utc).date() + timedelta(days=1)
    if lowered == "today" or lowered == "tonight":
        return datetime.now(timezone.utc).date()
    try:
        return date.fromisoformat(expression[:10])
    except ValueError:
        return None


def _weather_description(code: Any) -> str | None:
    descriptions = {0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "rime fog", 51: "light drizzle", 53: "moderate drizzle", 55: "dense drizzle", 61: "slight rain", 63: "moderate rain", 65: "heavy rain", 71: "slight snow", 73: "moderate snow", 75: "heavy snow", 80: "rain showers", 81: "moderate rain showers", 82: "violent rain showers", 95: "thunderstorm", 96: "thunderstorm with hail", 99: "severe thunderstorm with hail"}
    return descriptions.get(code) if isinstance(code, int) else None


class OpenMeteoProvider:
    """Small provider with in-memory recent-value caching and retry handling."""

    def __init__(self, endpoint: str, fields: str, normalizer: Any) -> None:
        self.endpoint = endpoint
        self.fields = fields
        self.normalizer = normalizer
        self._cache: dict[tuple[float, float], dict[str, Any]] = {}

    async def fetch(self, request: dict[str, Any]) -> dict[str, Any]:
        try:
            latitude, longitude = _coordinates(request)
        except ProviderError as error:
            return {"available": False, "source_status": "unavailable", "provider": "Open-Meteo", "error": str(error), "observation": None}
        key = (latitude, longitude)
        try:
            requested_date = _requested_date(request)
            future = requested_date and requested_date > datetime.now(timezone.utc).date()
            payload = await self._request(latitude, longitude, requested_date) if future else await self._request(latitude, longitude)
            normalized = self.normalizer(payload, latitude, longitude, requested_date) if future else self.normalizer(payload, latitude, longitude)
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

    async def _request(self, latitude: float, longitude: float, requested_date: date | None = None) -> dict[str, Any]:
        if requested_date and requested_date > datetime.now(timezone.utc).date():
            parameters = urlencode({"latitude": latitude, "longitude": longitude, "hourly": self.fields, "start_date": requested_date.isoformat(), "end_date": requested_date.isoformat(), "timezone": "GMT", "wind_speed_unit": "ms"})
        else:
            parameters = urlencode({"latitude": latitude, "longitude": longitude, "current": self.fields, "timezone": "GMT", "wind_speed_unit": "ms"})
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


def _first_hour(payload: dict[str, Any], fields: tuple[str, ...]) -> dict[str, Any] | None:
    hourly = payload.get("hourly")
    if not isinstance(hourly, dict) or not isinstance(hourly.get("time"), list) or not hourly["time"]:
        return None
    return {field: hourly.get(field, [None])[0] for field in fields} | {"time": hourly["time"][0]}


def normalize_weather(payload: dict[str, Any], latitude: float, longitude: float, requested_date: date | None = None) -> dict[str, Any]:
    current = payload.get("current") or _first_hour(payload, ("temperature_2m", "wind_speed_10m", "wind_direction_10m", "precipitation", "pressure_msl", "relative_humidity_2m", "weather_code"))
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


def normalize_marine(payload: dict[str, Any], latitude: float, longitude: float, requested_date: date | None = None) -> dict[str, Any]:
    current = payload.get("current") or _first_hour(payload, ("sea_surface_temperature", "wave_height", "wave_direction", "wave_period"))
    if not isinstance(current, dict) or _timestamp(current.get("time")) is None:
        raise ProviderError("Provider response omitted a valid current marine observation.")
    observation = {
        "latitude": _number(payload.get("latitude"), minimum=-90, maximum=90) or latitude,
        "longitude": _number(payload.get("longitude"), minimum=-180, maximum=180) or longitude,
        "timestamp": _timestamp(current["time"]), "sea_surface_temperature_c": _number(current.get("sea_surface_temperature")),
        "wave_height_m": _number(current.get("wave_height"), minimum=0), "wave_direction_degrees": _number(current.get("wave_direction"), minimum=0, maximum=360),
        "wave_period_s": _number(current.get("wave_period"), minimum=0), "current": None,
    }
    return {"available": True, "source_status": "live", "provider": "Open-Meteo Marine API", "source_url": MARINE_URL, "observation": observation}


weather_provider = OpenMeteoProvider(WEATHER_URL, WEATHER_FIELDS, normalize_weather)
marine_provider = OpenMeteoProvider(MARINE_URL, MARINE_FIELDS, normalize_marine)


class OpenMeteoGeocoder:
    endpoint = "https://geocoding-api.open-meteo.com/v1/search"

    async def resolve(self, place: str) -> dict[str, Any] | None:
        parameters = urlencode({"name": place, "count": 1, "language": "en", "format": "json"})
        try:
            payload = await asyncio.to_thread(self._read_json, f"{self.endpoint}?{parameters}")
        except (URLError, TimeoutError, json.JSONDecodeError):
            return None
        results = payload.get("results") if isinstance(payload, dict) else None
        item = results[0] if isinstance(results, list) and results else None
        if not isinstance(item, dict) or not isinstance(item.get("latitude"), (int, float)) or not isinstance(item.get("longitude"), (int, float)):
            return None
        label = ", ".join(str(value) for value in (item.get("name"), item.get("admin1"), item.get("country")) if value)
        return {"latitude": item["latitude"], "longitude": item["longitude"], "label": label or place}

    @staticmethod
    def _read_json(url: str) -> dict[str, Any]:
        with urlopen(url, timeout=8) as response:  # nosec B310: fixed HTTPS provider URL
            payload = json.loads(response.read().decode("utf-8"))
        if not isinstance(payload, dict):
            raise ProviderError("Geocoder response was not an object.")
        return payload


geocoder = OpenMeteoGeocoder()
