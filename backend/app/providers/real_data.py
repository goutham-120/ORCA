"""Real-data provider boundaries for PFZ, ocean colour, and tropical cyclones.

These providers deliberately have no synthetic fallback.  A caller receives either
normalised source data, a genuine cached response, or an explicit unavailable state.
"""

import asyncio
import csv
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import io
import json
import math
import os
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

from app.providers.open_meteo import ProviderError, _number, _timestamp
from app.gis.geometry import normalize_geometry

INCOIS_PFZ_REFERENCE = "https://www.incois.gov.in/MarineFisheries/PfzWebGis"
NOAA_IBTRACS_URL = (
    "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-"
    "stewardship-ibtracs/v04r01/access/csv/ibtracs.last3years.list.v04r01.csv"
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso_now() -> str:
    return _now().isoformat()


def _csv_number(value: Any, *, minimum: float | None = None, maximum: float | None = None) -> float | None:
    """Validate a numeric IBTrACS CSV cell without loosening JSON-provider parsing."""
    if isinstance(value, bool) or not isinstance(value, (str, int, float)):
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(result) or (minimum is not None and result < minimum) or (maximum is not None and result > maximum):
        return None
    return result


def unavailable(provider: str, source_url: str, error: str) -> dict[str, Any]:
    return {"available": False, "source_status": "unavailable", "provider": provider,
            "source_url": source_url, "fetched_at": _iso_now(), "data": [], "error": error}


class CachedHttpProvider:
    """HTTPS retrieval with bounded retry and cache states based on actual fetches."""

    provider = "Unnamed provider"
    source_url = ""
    cache_ttl = timedelta(hours=6)

    def __init__(self) -> None:
        self._cache: dict[str, dict[str, Any]] = {}

    async def _read(self, url: str, headers: dict[str, str] | None = None) -> bytes:
        last_error: Exception | None = None
        for _ in range(2):
            try:
                request = Request(url, headers=headers or {"Accept": "application/json"})
                return await asyncio.to_thread(self._read_sync, request)
            except (URLError, TimeoutError, OSError) as error:
                last_error = error
        raise ProviderError(str(last_error or "request failed"))

    @staticmethod
    def _read_sync(request: Request) -> bytes:
        with urlopen(request, timeout=12) as response:  # nosec B310: provider URL is HTTPS/configured by deployer
            return response.read()

    def _cached_or_unavailable(self, key: str, error: Exception) -> dict[str, Any]:
        cached = self._cache.get(key)
        if not cached:
            return unavailable(self.provider, self.source_url, f"Live provider unavailable: {error}")
        result = deepcopy(cached)
        fetched_at = datetime.fromisoformat(result["fetched_at"])
        result["source_status"] = "cached" if _now() - fetched_at <= self.cache_ttl else "stale"
        result["error"] = f"Live provider unavailable: {error}"
        return result


def normalize_pfz_geojson(payload: dict[str, Any], *, source_url: str, fetched_at: str | None = None) -> dict[str, Any]:
    """Normalize genuine PFZ GeoJSON supplied by an authorised endpoint.

    INCOIS' public WebGIS is interactive and does not document a stable data API.
    Deployments must therefore set ORCA_PFZ_GEOJSON_URL to an authorised INCOIS or
    other official GeoJSON endpoint; this function never infers zones from imagery.
    """
    features = payload.get("features") if payload.get("type") == "FeatureCollection" else None
    if not isinstance(features, list):
        raise ProviderError("PFZ response must be a GeoJSON FeatureCollection.")
    zones: list[dict[str, Any]] = []
    for feature in features:
        if not isinstance(feature, dict) or not isinstance(feature.get("properties"), dict):
            continue
        try:
            geometry = normalize_geometry(feature.get("geometry"))
        except (TypeError, ValueError) as error:
            raise ProviderError(f"PFZ feature geometry is invalid: {error}") from error
        properties = feature["properties"]
        zone_id = properties.get("zone_id") or properties.get("id") or properties.get("pfz_id")
        observed_at = _timestamp(properties.get("observed_at") or properties.get("observation_time") or properties.get("date"))
        valid_from = _timestamp(properties.get("valid_from"))
        valid_to = _timestamp(properties.get("valid_to") or properties.get("valid_until"))
        zones.append({"geometry": geometry, "zone_identifier": str(zone_id) if zone_id is not None else None,
                      "observed_at": observed_at, "valid_from": valid_from, "valid_to": valid_to,
                      "quality": properties.get("quality") if isinstance(properties.get("quality"), dict) else {},
                      "properties": properties})
    if not zones:
        raise ProviderError("PFZ response contained no valid GeoJSON features.")
    return {"available": True, "source_status": "live", "provider": "INCOIS PFZ / configured authorised source",
            "source_url": source_url, "fetched_at": fetched_at or _iso_now(), "data": zones}


class PFZProvider(CachedHttpProvider):
    provider = "INCOIS PFZ WebGIS"
    source_url = INCOIS_PFZ_REFERENCE

    async def fetch(self, request: dict[str, Any]) -> dict[str, Any]:
        endpoint = os.getenv("ORCA_PFZ_GEOJSON_URL")
        if not endpoint:
            return unavailable(self.provider, self.source_url,
                               "PFZ WebGIS has no configured authorised GeoJSON endpoint (set ORCA_PFZ_GEOJSON_URL).")
        self.source_url = endpoint
        try:
            payload = json.loads((await self._read(endpoint)).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ProviderError("PFZ response was not a JSON object.")
            result = normalize_pfz_geojson(payload, source_url=endpoint)
            self._cache[endpoint] = deepcopy(result)
            return result
        except (ProviderError, ValueError, TypeError, URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
            return self._cached_or_unavailable(endpoint, error)


def normalize_chlorophyll_geojson(payload: dict[str, Any], *, source_url: str) -> dict[str, Any]:
    features = payload.get("features") if payload.get("type") == "FeatureCollection" else None
    if not isinstance(features, list):
        raise ProviderError("Chlorophyll response must be a GeoJSON FeatureCollection.")
    observations = []
    for feature in features:
        props = feature.get("properties") if isinstance(feature, dict) else None
        if not isinstance(props, dict):
            continue
        value = _number(props.get("chlorophyll_mg_m3", props.get("chlorophyll")), minimum=0)
        try:
            geometry = normalize_geometry(feature.get("geometry"))
        except (TypeError, ValueError) as error:
            raise ProviderError(f"Chlorophyll feature geometry is invalid: {error}") from error
        if value is None:
            continue
        observations.append({"geometry": geometry, "chlorophyll_mg_m3": value,
                             "observed_at": _timestamp(props.get("observed_at") or props.get("time")),
                             "quality": props.get("quality") if isinstance(props.get("quality"), dict) else {},
                             "properties": props})
    if not observations:
        raise ProviderError("Chlorophyll response contained no valid observations.")
    return {"available": True, "source_status": "live", "provider": "Copernicus/configured ocean-colour source",
            "source_url": source_url, "fetched_at": _iso_now(), "data": observations}


class ChlorophyllProvider(CachedHttpProvider):
    provider = "Copernicus/configured ocean-colour source"
    source_url = "https://data.marine.copernicus.eu/"

    async def fetch(self, request: dict[str, Any]) -> dict[str, Any]:
        endpoint = os.getenv("ORCA_CHLOROPHYLL_GEOJSON_URL")
        if not endpoint:
            return unavailable(self.provider, self.source_url,
                               "No authorised chlorophyll GeoJSON endpoint is configured (set ORCA_CHLOROPHYLL_GEOJSON_URL).")
        headers = {"Accept": "application/geo+json, application/json"}
        token = os.getenv("ORCA_CHLOROPHYLL_TOKEN")
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self.source_url = endpoint
        try:
            payload = json.loads((await self._read(endpoint, headers)).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ProviderError("Chlorophyll response was not a JSON object.")
            result = normalize_chlorophyll_geojson(payload, source_url=endpoint)
            self._cache[endpoint] = deepcopy(result)
            return result
        except (ProviderError, ValueError, TypeError, URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
            return self._cached_or_unavailable(endpoint, error)


def normalize_ibtracs_csv(payload: str, *, source_url: str) -> dict[str, Any]:
    # IBTrACS CSV has a names row followed by units; DictReader consumes both, so skip units.
    reader = csv.DictReader(io.StringIO(payload))
    next(reader, None)
    records: list[dict[str, Any]] = []
    for row in reader:
        # csv.DictReader yields text cells. IBTrACS has a header followed by a
        # units row, which is skipped above; data rows remain strings by design.
        latitude, longitude = _csv_number(row.get("LAT"), minimum=-90, maximum=90), _csv_number(row.get("LON"), minimum=-180, maximum=180)
        timestamp = _timestamp(row.get("ISO_TIME"))
        if latitude is None or longitude is None or timestamp is None:
            continue
        records.append({"storm_identifier": row.get("SID") or None, "name": row.get("NAME") or None,
                        "timestamp": timestamp, "latitude": latitude, "longitude": longitude,
                        "intensity_knots": _csv_number(row.get("USA_WIND"), minimum=0),
                        "pressure_hpa": _csv_number(row.get("USA_PRES"), minimum=0),
                        "movement_speed_knots": _csv_number(row.get("STORM_SPEED"), minimum=0),
                        "movement_direction_degrees": _csv_number(row.get("STORM_DIR"), minimum=0, maximum=360),
                        "agency": row.get("USA_AGENCY") or row.get("WMO_AGENCY") or None,
                        "quality": {"nature": row.get("NATURE"), "track_type": row.get("TRACK_TYPE")}})
    if not records:
        raise ProviderError("IBTrACS response contained no valid storm positions.")
    return {"available": True, "source_status": "live", "provider": "NOAA NCEI IBTrACS v04r01",
            "source_url": source_url, "fetched_at": _iso_now(), "data": records}


class IBTrACSCycloneProvider(CachedHttpProvider):
    provider = "NOAA NCEI IBTrACS v04r01"
    source_url = NOAA_IBTRACS_URL
    cache_ttl = timedelta(days=4)

    async def fetch(self, request: dict[str, Any]) -> dict[str, Any]:
        try:
            response = (await self._read(self.source_url, {"Accept": "text/csv"})).decode("utf-8-sig")
            result = normalize_ibtracs_csv(response, source_url=self.source_url)
            self._cache[self.source_url] = deepcopy(result)
            return result
        except (ProviderError, URLError, TimeoutError, OSError, UnicodeDecodeError) as error:
            return self._cached_or_unavailable(self.source_url, error)


pfz_provider = PFZProvider()
chlorophyll_provider = ChlorophyllProvider()
cyclone_provider = IBTrACSCycloneProvider()
