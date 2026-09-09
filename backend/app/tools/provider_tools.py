"""Provider-facing tools; decision workflows deliberately do not call these yet."""

from typing import Any

from app.providers.real_data import chlorophyll_provider, cyclone_provider, pfz_provider


class PFZTool:
    async def fetch(self, request: dict[str, Any]) -> dict[str, Any]:
        return await pfz_provider.fetch(request)


class ChlorophyllTool:
    async def fetch(self, request: dict[str, Any]) -> dict[str, Any]:
        return await chlorophyll_provider.fetch(request)


class CycloneTool:
    async def fetch(self, request: dict[str, Any]) -> dict[str, Any]:
        return await cyclone_provider.fetch(request)
