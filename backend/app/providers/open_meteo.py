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


INDIAN_COASTAL_REGISTRY = {
    # Tamil Nadu & Puducherry
    "chennai": (13.0827, 80.2707, "Chennai, Tamil Nadu"),
    "kasimedu": (13.1256, 80.2989, "Kasimedu, Chennai, Tamil Nadu"),
    "ennore": (13.2167, 80.3167, "Ennore, Tamil Nadu"),
    "cuddalore": (11.7480, 79.7714, "Cuddalore, Tamil Nadu"),
    "nagapattinam": (10.7656, 79.8424, "Nagapattinam, Tamil Nadu"),
    "rameswaram": (9.2876, 79.3129, "Rameswaram, Tamil Nadu"),
    "thoothukudi": (8.7642, 78.1348, "Thoothukudi, Tamil Nadu"),
    "tuticorin": (8.7642, 78.1348, "Thoothukudi, Tamil Nadu"),
    "kanyakumari": (8.0883, 77.5385, "Kanyakumari, Tamil Nadu"),
    "puducherry": (11.9416, 79.8083, "Puducherry"),
    "pondicherry": (11.9416, 79.8083, "Puducherry"),
    "karaikal": (10.9254, 79.8380, "Karaikal, Puducherry"),

    # Andhra Pradesh
    "visakhapatnam": (17.6868, 83.2185, "Visakhapatnam, Andhra Pradesh"),
    "vizag": (17.6868, 83.2185, "Visakhapatnam, Andhra Pradesh"),
    "bheemunipatnam": (17.8914, 83.4475, "Bheemunipatnam, Andhra Pradesh"),
    "kalingapatnam": (18.3370, 84.1260, "Kalingapatnam, Andhra Pradesh"),
    "kakinada": (16.9891, 82.2475, "Kakinada, Andhra Pradesh"),
    "machilipatnam": (16.1875, 81.1389, "Machilipatnam, Andhra Pradesh"),
    "nizampatnam": (15.9083, 80.6722, "Nizampatnam, Andhra Pradesh"),
    "vadarevu": (15.7833, 80.3500, "Vadarevu, Andhra Pradesh"),
    "krishnapatnam": (14.2500, 80.1167, "Krishnapatnam, Andhra Pradesh"),

    # Odisha & West Bengal
    "paradip": (20.3160, 86.6110, "Paradip, Odisha"),
    "puri": (19.8135, 85.8312, "Puri, Odisha"),
    "gopalpur": (19.2616, 84.9080, "Gopalpur, Odisha"),
    "dhamra": (20.8033, 86.9603, "Dhamra, Odisha"),
    "chandipur": (21.4697, 87.0210, "Chandipur, Odisha"),
    "digha": (21.6266, 87.5074, "Digha, West Bengal"),
    "shankarpur": (21.6366, 87.5683, "Shankarpur, West Bengal"),
    "kakdwip": (21.8767, 88.1856, "Kakdwip, West Bengal"),
    "kolkata": (22.5726, 88.3639, "Kolkata, West Bengal"),
    "haldia": (22.0667, 88.0698, "Haldia, West Bengal"),

    # Kerala
    "kochi": (9.9312, 76.2673, "Kochi, Kerala"),
    "cochin": (9.9312, 76.2673, "Kochi, Kerala"),
    "munambam": (10.1833, 76.1667, "Munambam, Kerala"),
    "thiruvananthapuram": (8.5241, 76.9366, "Thiruvananthapuram, Kerala"),
    "trivandrum": (8.5241, 76.9366, "Thiruvananthapuram, Kerala"),
    "vizhinjam": (8.3813, 76.9934, "Vizhinjam, Kerala"),
    "kollam": (8.8932, 76.6141, "Kollam, Kerala"),
    "alappuzha": (9.4981, 76.3388, "Alappuzha, Kerala"),
    "alleppey": (9.4981, 76.3388, "Alappuzha, Kerala"),
    "kozhikode": (11.2588, 75.7804, "Kozhikode, Kerala"),
    "calicut": (11.2588, 75.7804, "Kozhikode, Kerala"),
    "beypore": (11.1611, 75.8083, "Beypore, Kerala"),
    "kannur": (11.8745, 75.3704, "Kannur, Kerala"),
    "thalassery": (11.7491, 75.4890, "Thalassery, Kerala"),

    # Karnataka & Goa
    "mangalore": (12.8698, 74.8430, "Mangalore, Karnataka"),
    "mangaluru": (12.8698, 74.8430, "Mangalore, Karnataka"),
    "malpe": (13.3500, 74.7000, "Malpe, Karnataka"),
    "udupi": (13.3409, 74.7421, "Udupi, Karnataka"),
    "bhatkal": (13.9744, 74.5519, "Bhatkal, Karnataka"),
    "honnavar": (14.2797, 74.4439, "Honnavar, Karnataka"),
    "tadadi": (14.5264, 74.3644, "Tadadi, Karnataka"),
    "karwar": (14.8136, 74.1298, "Karwar, Karnataka"),
    "goa": (15.4909, 73.8278, "Goa, India"),
    "panaji": (15.4909, 73.8278, "Panaji, Goa"),
    "vasco": (15.3982, 73.8113, "Vasco da Gama, Goa"),
    "mormugao": (15.4125, 73.8015, "Mormugao, Goa"),

    # Maharashtra & Gujarat
    "mumbai": (18.9220, 72.8347, "Mumbai, Maharashtra"),
    "bombay": (18.9220, 72.8347, "Mumbai, Maharashtra"),
    "sassoon": (18.9133, 72.8258, "Sassoon Dock, Mumbai, Maharashtra"),
    "alibag": (18.6414, 72.8722, "Alibag, Maharashtra"),
    "ratnagiri": (16.9902, 73.3120, "Ratnagiri, Maharashtra"),
    "malvan": (16.0594, 73.4686, "Malvan, Maharashtra"),
    "veraval": (20.9077, 70.3679, "Veraval, Gujarat"),
    "porbandar": (21.6417, 69.6293, "Porbandar, Gujarat"),
    "okha": (22.4644, 69.0722, "Okha, Gujarat"),
    "kandla": (23.0033, 70.2189, "Kandla, Gujarat"),
    "mundra": (22.8394, 69.7258, "Mundra, Gujarat"),
    "surat": (21.1702, 72.8311, "Surat, Gujarat"),
    "diu": (20.7144, 70.9874, "Diu, Daman & Diu"),
    "daman": (20.3974, 72.8328, "Daman, Daman & Diu"),

    # Islands
    "port blair": (11.6234, 92.7265, "Port Blair, Andaman & Nicobar"),
    "kavaratti": (10.5667, 72.6417, "Kavaratti, Lakshadweep"),
    "agatti": (10.8533, 72.1931, "Agatti, Lakshadweep"),
}

INDIC_COASTAL_ALIASES = {
    # Hindi
    "विशाखापत्तनम": "visakhapatnam",
    "वाइजाग": "visakhapatnam",
    "चेन्नई": "chennai",
    "मद्रास": "chennai",
    "मुंबई": "mumbai",
    "बंबई": "mumbai",
    "कोलकाता": "kolkata",
    "कोच्चि": "kochi",
    "कोचीन": "kochi",
    "गोवा": "goa",
    "काकीनाड़ा": "kakinada",
    "काकीनाडा": "kakinada",
    "मछलीपट्टनम": "machilipatnam",
    "मंगलोर": "mangalore",
    "मंगलुरु": "mangalore",
    "पारादीप": "paradip",
    "पुरी": "puri",
    "तूतीकोरिन": "thoothukudi",
    "थूथुकुडी": "thoothukudi",
    "कन्याकुमारी": "kanyakumari",
    "रामेश्वरम": "rameswaram",
    "कांडला": "kandla",
    "पोरबंदर": "porbandar",
    "दीव": "diu",
    "वेरावल": "veraval",
    "सूरत": "surat",

    # Telugu
    "విశాఖపట్నం": "visakhapatnam",
    "వైజాగ్": "visakhapatnam",
    "చెన్నై": "chennai",
    "ముంబై": "mumbai",
    "కోల్‌కతా": "kolkata",
    "కోల్కతా": "kolkata",
    "కొచ్చి": "kochi",
    "గోవా": "goa",
    "కాకినాడ": "kakinada",
    "మచిలీపట్నం": "machilipatnam",
    "కృష్ణా": "machilipatnam",
    "మంగళూరు": "mangalore",
    "పారదీప్": "paradip",
    "పూరి": "puri",
    "తూత్తుకుడి": "thoothukudi",
    "కన్యాకుమారి": "kanyakumari",
    "రామేశ్వరం": "rameswaram",
    "భీమునిపట్నం": "bheemunipatnam",
    "కళింగపట్నం": "kalingapatnam",
    "వాడరేవు": "vadarevu",
    "నిజాంపట్నం": "nizampatnam",
    "కృష్ణపట్నం": "krishnapatnam",

    # Tamil
    "சென்னை": "chennai",
    "மதராஸ்": "chennai",
    "தூத்துக்குடி": "thoothukudi",
    "கன்னியாகுமரி": "kanyakumari",
    "ராமேஸ்வரம்": "rameswaram",
    "நாகப்பட்டினம்": "nagapattinam",
    "கடலூர்": "cuddalore",
    "பாண்டிச்சேரி": "puducherry",
    "புதுச்சேரி": "puducherry",
    "எண்ணூர்": "ennore",
    "விசாகப்பட்டினம்": "visakhapatnam",
    "விசாகப்பட்டணம்": "visakhapatnam",
    "மும்பை": "mumbai",
    "கொச்சி": "kochi",
    "கோவா": "goa",
}


class OpenMeteoGeocoder:
    endpoint = "https://geocoding-api.open-meteo.com/v1/search"

    async def resolve(self, place: str) -> dict[str, Any] | None:
        if not place:
            return None
        clean_place = place.strip().lower()
        
        # 1. Check direct match in Indian coastal registry
        if clean_place in INDIAN_COASTAL_REGISTRY:
            lat, lon, label = INDIAN_COASTAL_REGISTRY[clean_place]
            return {"latitude": lat, "longitude": lon, "label": label}

        # 2. Check Indic alias translation
        if clean_place in INDIC_COASTAL_ALIASES:
            alias_target = INDIC_COASTAL_ALIASES[clean_place]
            if alias_target in INDIAN_COASTAL_REGISTRY:
                lat, lon, label = INDIAN_COASTAL_REGISTRY[alias_target]
                return {"latitude": lat, "longitude": lon, "label": label}
            clean_place = alias_target

        # 3. Check partial/substring matches against registry keys
        for key, (lat, lon, label) in INDIAN_COASTAL_REGISTRY.items():
            if key == clean_place or key in clean_place or clean_place in key:
                return {"latitude": lat, "longitude": lon, "label": label}

        # 4. Fallback to OpenMeteo Geocoding API
        search_query = clean_place
        parameters = urlencode({"name": search_query, "count": 1, "language": "en", "format": "json"})
        try:
            payload = await asyncio.to_thread(self._read_json, f"{self.endpoint}?{parameters}")
        except (URLError, TimeoutError, json.JSONDecodeError):
            return None
        results = payload.get("results") if isinstance(payload, dict) else None
        item = results[0] if isinstance(results, list) and results else None
        if not isinstance(item, dict) or not isinstance(item.get("latitude"), (int, float)) or not isinstance(item.get("longitude"), (int, float)):
            return None
        label = ", ".join(str(value) for value in (item.get("name"), item.get("admin1"), item.get("country")) if value)
        return {"latitude": item["latitude"], "longitude": item["longitude"], "label": label or clean_place}

    @staticmethod
    def _read_json(url: str) -> dict[str, Any]:
        with urlopen(url, timeout=8) as response:  # nosec B310: fixed HTTPS provider URL
            payload = json.loads(response.read().decode("utf-8"))
        if not isinstance(payload, dict):
            raise ProviderError("Geocoder response was not an object.")
        return payload


geocoder = OpenMeteoGeocoder()
