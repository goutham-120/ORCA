"""Normalized context passed between orchestration layers."""

from dataclasses import dataclass, field
from typing import Any
from app.core.query_parser import ParsedQuery


@dataclass
class QueryContext:
    parsed_query: ParsedQuery
    location: dict[str, Any] | None = None
    time_range: tuple[Any, Any] | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    agent_results: dict[str, dict[str, Any]] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {"query": self.parsed_query.normalized, "intent": self.parsed_query.intent, "location": self.location, "time_range": self.time_range, "metadata": self.metadata, "agent_results": self.agent_results}
