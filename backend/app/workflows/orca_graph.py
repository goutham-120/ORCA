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
from app.services.decision_service import DecisionService


class OrcaWorkflow:
    stages = ("query_understanding", "agent_selection", "agent_execution", "analysis", "recommendation")

    def __init__(self, coordinator: DataCoordinator | None = None) -> None:
        self.coordinator = coordinator or DataCoordinator()
        if "weather" not in self.coordinator._sources:
            self.coordinator.register("weather", WeatherTool())
        if "ocean" not in self.coordinator._sources:
            self.coordinator.register("ocean", OceanTool())
        self._agents = {"weather": WeatherAgent(), "ocean": OceanAgent(), "gis": GISAgent()}
        # Reuse the workflow's registered provider/tool sources. This preserves
        # caching, test fixtures, and the Provider -> Tool boundary.
        self.decisions = DecisionService(weather=self.coordinator._sources["weather"], ocean=self.coordinator._sources["ocean"])

    async def run(self, context: QueryContext) -> dict[str, Any]:
        # Preserve the existing coordinator boundary and only retrieve selected domains.
        requested = context.parsed_query.requested_domains
        # GIS needs a location to perform a meaningful spatial operation. Keep it
        # pending when absent, preserving the prior route/safety workflow result.
        selected = [name for name in requested if name in self._agents and (name != "gis" or context.location is not None)]
        pending_domains = [name for name in requested if name not in selected]
        context.metadata["pending_domains"] = pending_domains
        context.metadata["plan"] = {
            "intent": context.parsed_query.intent,
            "requested_domains": requested,
            "selected_agents": selected,
            "evidence_needed": ["ocean observation" if name == "ocean" else "weather observation" if name == "weather" else "spatial layers" for name in selected],
        }
        if not selected:
            decision = await self._decision_for(context)
            if decision:
                return {"agents_used": ["decision"], "analysis_results": {"decision": decision}, "evidence": [], "pending_domains": pending_domains, "answer": decision.get("assessment", "Decision assessment completed.")}
            return {"agents_used": [], "analysis_results": {}, "evidence": [], "pending_domains": pending_domains, "answer": "ORCA did not identify an ocean or weather data request."}
        provider_domains = [name for name in selected if name in {"weather", "ocean"}]
        collected = await self.coordinator.collect(provider_domains, context.as_dict())
        results = {name: self._agents[name].interpret(context.as_dict() if name == "gis" else collected.get(name, {})) for name in selected}
        # A place name is retained for conversation context but is never silently
        # geocoded. Ignore any coordinate-less fixture/provider output here.
        if context.location is None and context.parsed_query.requested_location:
            for name in ("weather", "ocean"):
                if name in results:
                    results[name] = {"summary": f"{name.title()} data is unavailable because coordinates were not supplied.", "risk_score": None, "concerns": [], "data_status": "unavailable", "error": "Coordinates were not supplied."}
        context.agent_results.update(results)
        evidence = []
        for name, data in collected.items():
            observation = data.get("observation") or {}
            evidence.append({
                "source": data.get("provider", "unavailable provider"),
                "summary": f"{name.title()} data status: {data.get('source_status', 'unavailable')}",
                "url": data.get("source_url"),
                "observed_at": observation.get("timestamp"),
                "metadata": {"domain": name, "data_status": data.get("source_status", "unavailable"), "error": data.get("error"), "measurements": observation},
            })
        if "gis" in results:
            gis_result = results["gis"]
            evidence.append({"source": "caller-supplied GIS layers" if gis_result.get("available") else "GIS integration", "summary": f"GIS data status: {gis_result.get('data_status', 'unavailable')}", "url": None, "observed_at": None, "metadata": {"domain": "gis", "data_status": gis_result.get("data_status", "unavailable"), "operation": gis_result.get("operation"), "layers": gis_result.get("layer_metadata", []), "results": gis_result.get("results", {}), "error": gis_result.get("error")}})
        # Decision products are an optional final stage in the same workflow.
        # They consume providers/services directly and never ask the LLM for facts.
        decision = await self._decision_for(context)
        if decision:
            results["decision"] = decision
            evidence.extend({"source": item.get("source", "unknown provider"), "summary": item.get("data_type", "decision evidence"), "url": item.get("provenance", {}).get("source_url"), "observed_at": item.get("timestamp"), "metadata": {"domain": "decision", "value": item.get("value"), "unit": item.get("unit"), "freshness": item.get("freshness")}} for item in decision.get("evidence", []))
        available = [name for name, result in results.items() if result.get("data_status") in {"live", "cached", "static"}]
        unavailable = [name for name in selected if name not in available]
        answer = "ORCA processed " + (", ".join(available) if available else "no available live or cached") + " intelligence."
        if unavailable:
            answer += " Unavailable: " + ", ".join(unavailable) + "."
        return {"agents_used": selected, "analysis_results": results, "evidence": evidence, "pending_domains": pending_domains, "answer": answer}

    async def _decision_for(self, context: QueryContext) -> dict[str, Any] | None:
        """Route explicit decision language, leaving general chat untouched."""
        query = context.parsed_query.normalized.lower()
        location = context.location
        if not location:
            return None
        if any(term in query for term in ("cyclone", "hurricane", "typhoon")):
            return await self.decisions.hazard(location)
        if any(term in query for term in ("route", "navigate", "voyage", "path")):
            # Ask ORCA has no reliable destination-coordinate resolver yet.
            return {"status": "unavailable", "assessment": "Route analysis requires validated origin and destination coordinates.", "risk_level": "unavailable", "evidence": [], "warnings": [], "unavailable_data": ["destination coordinates"]}
        if any(term in query for term in ("fish", "fishing", "pfz")):
            return await self.decisions.fishing(location)
        if any(term in query for term in ("safe", "safety", "risk", "hazard")):
            return await self.decisions.safety(location)
        return None

    def build_langgraph(self) -> Any | None:
        """Return a LangGraph graph when langgraph is installed; otherwise None.

        This keeps runtime optional while exposing a stable extension point.
        """
        try:
            from langgraph.graph import StateGraph  # type: ignore[import-not-found]
        except ImportError:
            return None
        return StateGraph(dict)
