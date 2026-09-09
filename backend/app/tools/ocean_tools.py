"""Marine data operation exposed to the workflow."""

from typing import Any
from app.providers.open_meteo import marine_forecast_provider, marine_provider


class OceanTool:
    async def fetch(self, request: dict[str, Any]) -> dict[str, Any]:
        return await marine_provider.fetch(request)


class OceanForecastTool:
    async def fetch(self, request: dict[str, Any]) -> dict[str, Any]:
        return await marine_forecast_provider.fetch(request)


class CurrentTool(OceanForecastTool):
    """Current forecast records are a subset of Open-Meteo marine forecasts."""
