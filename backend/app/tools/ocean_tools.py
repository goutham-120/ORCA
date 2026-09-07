"""Marine data operation exposed to the workflow."""

from typing import Any
from app.providers.open_meteo import marine_provider


class OceanTool:
    async def fetch(self, request: dict[str, Any]) -> dict[str, Any]:
        return await marine_provider.fetch(request)
