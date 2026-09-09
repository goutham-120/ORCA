"""Weather data operation exposed to the workflow."""

from typing import Any
from app.providers.open_meteo import weather_forecast_provider, weather_provider


class WeatherTool:
    async def fetch(self, request: dict[str, Any]) -> dict[str, Any]:
        return await weather_provider.fetch(request)


class WeatherForecastTool:
    async def fetch(self, request: dict[str, Any]) -> dict[str, Any]:
        return await weather_forecast_provider.fetch(request)
