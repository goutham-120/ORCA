"""Optional LangGraph-compatible ORCA workflow foundation.

Agent imports are intentionally deferred: their implementations are owned by
separate modules and may not be installed while this service starts.
"""

from typing import Any
from app.agents.ocean_agent import OceanAgent
from app.agents.weather_agent import WeatherAgent
from app.agents.gis_agent import GISAgent
from app.core.context import QueryContext
from app.services.data_coordinator import DataCoordinator
from app.tools.ocean_tools import OceanTool
from app.tools.weather_tools import WeatherTool


class OrcaWorkflow:
    stages = ("query_understanding", "agent_selection", "agent_execution", "analysis", "recommendation")

    def __init__(self, coordinator: DataCoordinator | None = None) -> None:
        self.coordinator = coordinator or DataCoordinator()
        if "weather" not in self.coordinator._sources:
            self.coordinator.register("weather", WeatherTool())
        if "ocean" not in self.coordinator._sources:
            self.coordinator.register("ocean", OceanTool())
        self._agents = {"weather": WeatherAgent(), "ocean": OceanAgent(), "gis": GISAgent()}

    async def run(self, context: QueryContext) -> dict[str, Any]:
        # Preserve the existing coordinator boundary and only retrieve selected domains.
        requested = context.parsed_query.requested_domains
        # GIS needs a location to perform a meaningful spatial operation. Keep it
        # pending when absent, preserving the prior route/safety workflow result.
        selected = [name for name in requested if name in self._agents and (name != "gis" or context.location is not None)]
        pending_domains = [name for name in requested if name not in selected]
        context.metadata["pending_domains"] = pending_domains
        if not selected:
            return {"agents_used": [], "analysis_results": {}, "evidence": [], "pending_domains": pending_domains, "answer": "ORCA did not identify an ocean or weather data request."}
        provider_domains = [name for name in selected if name in {"weather", "ocean"}]
        collected = await self.coordinator.collect(provider_domains, context.as_dict())
        results = {name: self._agents[name].interpret(context.as_dict() if name == "gis" else collected.get(name, {})) for name in selected}
        context.agent_results.update(results)
        evidence = []
        for name, data in collected.items():
            observation = data.get("observation") or {}
            evidence.append({
                "source": data.get("provider", "unavailable provider"),
                "summary": f"{name.title()} data status: {data.get('source_status', 'unavailable')}",
                "url": data.get("source_url"),
                "observed_at": observation.get("timestamp"),
                "metadata": {"domain": name, "data_status": data.get("source_status", "unavailable"), "error": data.get("error")},
            })
        if "gis" in results:
            gis_result = results["gis"]
            evidence.append({"source": "caller-supplied GIS layers" if gis_result.get("available") else "GIS integration", "summary": f"GIS data status: {gis_result.get('data_status', 'unavailable')}", "url": None, "observed_at": None, "metadata": {"domain": "gis", "data_status": gis_result.get("data_status", "unavailable"), "operation": gis_result.get("operation"), "layers": gis_result.get("layer_metadata", [])}})
        available = [name for name, result in results.items() if result.get("data_status") in {"live", "cached", "static"}]
        unavailable = [name for name in selected if name not in available]
        answer = "ORCA processed " + (", ".join(available) if available else "no available live or cached") + " intelligence."
        if unavailable:
            answer += " Unavailable: " + ", ".join(unavailable) + "."
        return {"agents_used": selected, "analysis_results": results, "evidence": evidence, "pending_domains": pending_domains, "answer": answer}

    def build_langgraph(self) -> Any | None:
        """Return a LangGraph graph when langgraph is installed; otherwise None.

        This keeps runtime optional while exposing a stable extension point.
        """
        try:
            from langgraph.graph import StateGraph  # type: ignore[import-not-found]
        except ImportError:
            return None
        return StateGraph(dict)
