"""Optional LangGraph-compatible ORCA workflow foundation.

Agent imports are intentionally deferred: their implementations are owned by
separate modules and may not be installed while this service starts.
"""

from typing import Any
from app.core.context import QueryContext


class OrcaWorkflow:
    stages = ("query_understanding", "agent_selection", "agent_execution", "analysis", "recommendation")

    async def run(self, context: QueryContext) -> dict[str, Any]:
        # Integration point: invoke registered ocean/weather/GIS agents here.
        selected = context.parsed_query.requested_domains
        return {"agents_used": selected, "analysis_results": context.agent_results, "evidence": [], "answer": "ORCA understood this as a %s query. Live agent execution is pending integration." % context.parsed_query.intent}

    def build_langgraph(self) -> Any | None:
        """Return a LangGraph graph when langgraph is installed; otherwise None.

        This keeps runtime optional while exposing a stable extension point.
        """
        try:
            from langgraph.graph import StateGraph  # type: ignore[import-not-found]
        except ImportError:
            return None
        return StateGraph(dict)
