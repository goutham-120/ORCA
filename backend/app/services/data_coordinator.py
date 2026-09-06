"""Interface boundary for provider/tool-backed data collection."""

from typing import Any, Protocol


class DataSource(Protocol):
    async def fetch(self, request: dict[str, Any]) -> dict[str, Any]: ...


class DataCoordinator:
    def __init__(self) -> None:
        self._sources: dict[str, DataSource] = {}

    def register(self, name: str, source: DataSource) -> None:
        self._sources[name] = source

    async def collect(self, names: list[str], request: dict[str, Any]) -> dict[str, dict[str, Any]]:
        return {name: await self._sources[name].fetch(request) for name in names if name in self._sources}
