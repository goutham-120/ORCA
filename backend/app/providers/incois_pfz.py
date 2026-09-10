"""
Official INCOIS PFZ WFS acquisition and normalization.
"""

from __future__ import annotations

import asyncio
from datetime import date, datetime, timezone
import re
from typing import Any

import requests

from app.models.spatial_feature import (
    SpatialFeatureRepository,
    spatial_features,
)
from app.schemas.spatial import SpatialFeatureCreate


PFZ_WFS_URL = (
    "https://incois.gov.in/geoserver/PFZ_Automation/ows"
    "?service=WFS"
    "&version=1.1.0"
    "&request=GetFeature"
    "&typeName=PFZ_Automation:pfzlines"
    "&outputFormat=application/json"
)

PFZ_ADVISORY_URL = (
    "https://incois.gov.in/MarineFisheries/"
    "TextDataHome?mfid=1&request_locale=en"
)


class PFZProviderError(RuntimeError):
    """Raised when the official PFZ source cannot be read."""


class IncoisPFZProvider:

    source = "INCOIS"
    layer = "pfz"

    async def fetch(self) -> dict[str, Any]:

        try:
            payload, advisory_html = await asyncio.gather(
                asyncio.to_thread(
                    self._get_json,
                    PFZ_WFS_URL,
                ),
                asyncio.to_thread(
                    self._get_text,
                    PFZ_ADVISORY_URL,
                ),
            )

            forecast_date, valid_until = (
                self._advisory_dates(
                    advisory_html
                )
            )

            features = self.normalize(
                payload,
                forecast_date,
                valid_until,
            )

            today = datetime.now(
                timezone.utc
            ).date()

            freshness = (
                "live"
                if forecast_date >= today
                else "stale"
            )

            if freshness == "stale":
                features = [
                    feature.model_copy(
                        update={
                            "freshness_status": "stale"
                        }
                    )
                    for feature in features
                ]

            return {
                "status": freshness,
                "source": self.source,
                "source_url": PFZ_WFS_URL,
                "forecast_date": forecast_date,
                "valid_until": valid_until,
                "features": features,
            }

        except Exception as exc:

            return {
                "status": "error",
                "source": self.source,
                "source_url": PFZ_WFS_URL,
                "features": [],
                "error": str(exc),
            }

    async def sync(
        self,
        repository: SpatialFeatureRepository = spatial_features,
    ) -> dict[str, Any]:

        result = await self.fetch()

        if result["status"] == "error":
            return result

        repository.delete_source_dataset(
            "PFZ",
            self.source,
        )

        persisted = 0

        for feature in result["features"]:
            repository.create(feature)
            persisted += 1

        return {
            key: value
            for key, value in result.items()
            if key != "features"
        } | {
            "persisted": persisted,
        }

    def seed_demo_fallback(
        self,
        repository: SpatialFeatureRepository = spatial_features,
    ) -> int:
        """Seed realistic demo PFZ features explicitly labeled DEMO/STATIC if repository is empty."""
        existing = repository.list(dataset="PFZ")
        if existing:
            return len(existing)
        demo_features = [
            SpatialFeatureCreate(
                id="demo-pfz-chennai-1",
                dataset="PFZ",
                layer="pfz",
                geometry={
                    "type": "LineString",
                    "coordinates": [
                        [80.33, 12.45],
                        [80.36, 12.55],
                        [80.38, 12.65],
                        [80.36, 12.75],
                    ],
                },
                properties={"name": "Chennai Offshore PFZ Track", "depth_m": 45, "bearing_deg": 115, "note": "DEMO/STATIC"},
                source="DEMO/STATIC",
                source_identifier="DEMO-PFZ-01",
                source_url="https://incois.gov.in",
                observed_at=datetime.now(timezone.utc).isoformat(),
                freshness_status="static",
            ),
            SpatialFeatureCreate(
                id="demo-pfz-vizag-1",
                dataset="PFZ",
                layer="pfz",
                geometry={
                    "type": "LineString",
                    "coordinates": [
                        [83.35, 17.65],
                        [83.42, 17.72],
                        [83.48, 17.80],
                    ],
                },
                properties={"name": "Visakhapatnam Shelf PFZ Track", "depth_m": 55, "bearing_deg": 90, "note": "DEMO/STATIC"},
                source="DEMO/STATIC",
                source_identifier="DEMO-PFZ-02",
                source_url="https://incois.gov.in",
                observed_at=datetime.now(timezone.utc).isoformat(),
                freshness_status="static",
            ),
        ]
        count = 0
        for f in demo_features:
            repository.create(f)
            count += 1
        return count


    @classmethod
    def normalize(
        cls,
        payload: dict[str, Any],
        forecast_date: date,
        valid_until: date | None,
    ) -> list[SpatialFeatureCreate]:

        if (
            payload.get("type")
            != "FeatureCollection"
            or not isinstance(
                payload.get("features"),
                list,
            )
        ):
            raise PFZProviderError(
                "INCOIS PFZ response is not a "
                "GeoJSON FeatureCollection."
            )

        normalized: list[
            SpatialFeatureCreate
        ] = []

        for item in payload["features"]:

            if (
                not isinstance(item, dict)
                or not isinstance(
                    item.get("geometry"),
                    dict,
                )
            ):
                raise PFZProviderError(
                    "INCOIS PFZ feature is missing geometry."
                )

            properties = dict(
                item.get("properties") or {}
            )

            uid = (
                properties.get("UID")
                or item.get("id")
            )

            if uid is None:
                raise PFZProviderError(
                    "INCOIS PFZ feature is missing "
                    "its advisory identifier."
                )

            sector_code = (
                str(
                    properties.get(
                        "SECTORBOUN"
                    )
                    or properties.get(
                        "SECTORBO_1"
                    )
                    or ""
                )
                or None
            )

            properties.update(
                {
                    "advisory_id": str(uid),
                    "forecast_date": (
                        forecast_date.isoformat()
                    ),
                    "valid_until": (
                        valid_until.isoformat()
                        if valid_until
                        else None
                    ),
                    "sector_code": sector_code,
                    "sector": (
                        properties.get(
                            "SECTORNAME"
                        )
                        or None
                    ),
                    "length_km": properties.get(
                        "Length"
                    ),
                    "category": properties.get(
                        "Category"
                    ),
                }
            )

            observed_at = datetime.combine(
                forecast_date,
                datetime.min.time(),
                tzinfo=timezone.utc,
            )

            valid_to = None

            if valid_until:
                valid_to = datetime.combine(
                    valid_until,
                    datetime.max.time(),
                    tzinfo=timezone.utc,
                )

            normalized.append(
                SpatialFeatureCreate(
                    dataset="PFZ",
                    layer=cls.layer,
                    geometry=item["geometry"],
                    properties=properties,
                    source=cls.source,
                    source_identifier=str(uid),
                    source_url=PFZ_WFS_URL,
                    observed_at=observed_at,
                    valid_from=observed_at,
                    valid_to=valid_to,
                    freshness_status="live",
                    quality={
                        "provider_format": (
                            "INCOIS GeoServer WFS GeoJSON"
                        )
                    },
                )
            )

        return normalized

    @staticmethod
    def _get_json(
        url: str,
    ) -> dict[str, Any]:

        response = requests.get(
            url,
            timeout=30,
        )

        response.raise_for_status()

        payload = response.json()

        if not isinstance(payload, dict):
            raise PFZProviderError(
                "INCOIS PFZ response is not an object."
            )

        return payload

    @staticmethod
    def _get_text(
        url: str,
    ) -> str:

        response = requests.get(
            url,
            timeout=30,
        )

        response.raise_for_status()

        return response.text

    @staticmethod
    def _advisory_dates(
        html: str,
    ) -> tuple[date, date | None]:

        plain = re.sub(
            r"<[^>]+>",
            " ",
            html,
        )

        dates = re.findall(
            r"\b(\d{1,2})\s+"
            r"([A-Z]{3})\s+"
            r"(\d{4})\b",
            plain,
            re.IGNORECASE,
        )

        if len(dates) < 2:
            raise PFZProviderError(
                "INCOIS advisory page did not expose "
                "forecast and validity dates."
            )

        months = {
            name: index
            for index, name in enumerate(
                (
                    "JAN",
                    "FEB",
                    "MAR",
                    "APR",
                    "MAY",
                    "JUN",
                    "JUL",
                    "AUG",
                    "SEP",
                    "OCT",
                    "NOV",
                    "DEC",
                ),
                1,
            )
        }

        parsed = []

        for day, month, year in dates:

            month_number = months.get(
                month.upper()
            )

            if month_number is None:
                continue

            parsed.append(
                date(
                    int(year),
                    month_number,
                    int(day),
                )
            )

        if len(parsed) < 2:
            raise PFZProviderError(
                "Unable to parse INCOIS advisory dates."
            )

        return parsed[-2], parsed[-1]


incois_pfz_provider = IncoisPFZProvider()