"""Turn normalized analysis signals into an assessment contract."""

from typing import Any


def assess_results(
    results: dict[str, Any],
    *,
    required_domains: list[str] | None = None,
    pending_domains: list[str] | None = None,
) -> dict[str, Any]:
    """Accept agent/analysis output keyed by module and return a stable assessment."""
    risk_values = [value.get("risk_score") for value in results.values() if isinstance(value, dict) and isinstance(value.get("risk_score"), (int, float))]
    available_statuses = {"live", "cached", "static"}
    incomplete = [
        domain for domain in required_domains or []
        if not isinstance(results.get(domain), dict) or results[domain].get("data_status") not in available_statuses
    ]
    for domain in pending_domains or []:
        if domain in (required_domains or []) and domain not in incomplete:
            incomplete.append(domain)
    score = None if incomplete else max(risk_values) if risk_values else None
    level = "unknown" if score is None else "critical" if score >= .85 else "high" if score >= .65 else "moderate" if score >= .35 else "low"
    factors = [f"{source}: {value.get('summary', 'result available')}" for source, value in results.items() if isinstance(value, dict)]
    if incomplete:
        factors.append("Required evidence incomplete: " + ", ".join(incomplete) + ".")
    summary = (
        "Safety assessment is limited because required evidence is unavailable or pending: " + ", ".join(incomplete) + "."
        if incomplete else "Assessment is awaiting integrated data." if score is None else f"Combined risk assessment is {level}."
    )
    return {"level": level, "summary": summary, "factors": factors, "score": score, "incomplete_domains": incomplete}
