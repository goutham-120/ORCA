"""Turn normalized analysis signals into an assessment contract."""

from typing import Any


def assess_results(results: dict[str, Any]) -> dict[str, Any]:
    """Accept agent/analysis output keyed by module and return a stable assessment."""
    risk_values = [value.get("risk_score") for value in results.values() if isinstance(value, dict) and isinstance(value.get("risk_score"), (int, float))]
    score = max(risk_values) if risk_values else None
    level = "unknown" if score is None else "critical" if score >= .85 else "high" if score >= .65 else "moderate" if score >= .35 else "low"
    factors = [f"{source}: {value.get('summary', 'result available')}" for source, value in results.items() if isinstance(value, dict)]
    return {"level": level, "summary": "Assessment is awaiting integrated data." if score is None else f"Combined risk assessment is {level}.", "factors": factors, "score": score}
