"""Produce predictable recommendations from a normalized assessment."""

from typing import Any


def build_recommendations(assessment: dict[str, Any], results: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    level = assessment.get("level", "unknown")
    action = "Gather live ocean, weather, and GIS data before proceeding." if level == "unknown" else "Review conditions and proceed with caution." if level in {"low", "moderate"} else "Delay or revise the plan until conditions are reassessed."
    priority = "medium" if level in {"unknown", "low", "moderate"} else "high" if level == "high" else "urgent"
    return [{"action": action, "rationale": assessment.get("summary", "No assessment summary available."), "priority": priority, "confidence": 0.25 if level == "unknown" else 0.7, "next_steps": ["Refresh source data", "Review supporting evidence"]}]
