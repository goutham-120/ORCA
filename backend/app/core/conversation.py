"""Evidence-grounded conversational synthesis kept outside domain agents."""

from __future__ import annotations

from typing import Any


def synthesize_answer(query: str, assessment: dict[str, Any], results: dict[str, Any], pending: list[str], context: dict[str, Any], language: str = "en") -> str:
    """Create a deterministic answer using only workflow outputs and context."""
    parts: list[str] = []
    level = assessment.get("level", "unknown")
    location = context.get("location") or {}
    label = location.get("label") if isinstance(location, dict) else None
    requested_place = context.get("requested_location")
    place = label or requested_place
    subject = f" for {place}" if place else ""
    incomplete = assessment.get("incomplete_domains", [])
    if incomplete:
        parts.append(f"ORCA cannot make a complete safety assessment{subject} because required evidence is unavailable or pending: {', '.join(incomplete)}.")
    elif level == "unknown":
        parts.append(f"ORCA cannot make a safety assessment{subject} from the currently available evidence.")
    else:
        parts.append(f"ORCA's combined assessment{subject} is {level} risk.")
    for domain in ("ocean", "weather", "gis"):
        result = results.get(domain)
        if not isinstance(result, dict):
            continue
        if result.get("data_status") in {"live", "cached", "static"}:
            observation = result.get("observation") or {}
            facts = _facts(domain, observation)
            parts.append((f"{domain.title()} evidence: " + "; ".join(facts) + ".") if facts else result.get("summary", ""))
        else:
            parts.append(f"{domain.title()} data is unavailable: {result.get('error') or result.get('summary', 'no source returned data')}")
    if not location and requested_place:
        parts.append(f"“{requested_place}” was retained as the requested place, but coordinates were not supplied, so location-dependent data could not be retrieved.")
    time_expression = context.get("time_expression")
    if time_expression:
        parts.append(f"You asked about {time_expression}. The configured providers return current observations only, so this is not a forecast for that requested time.")
    if "pfz" in pending:
        parts.append("PFZ information is unavailable because no PFZ data source is configured.")
    other_pending = [name for name in pending if name not in {"pfz", "safety"}]
    if other_pending:
        parts.append("Pending capability: " + ", ".join(other_pending) + ".")
    concerns = [concern for result in results.values() if isinstance(result, dict) for concern in result.get("concerns", [])]
    if concerns:
        parts.append("Risk factors: " + "; ".join(concerns) + ".")
    if language.lower() in {"hi", "hi-in"}:
        return _hindi_answer(level, results, pending, incomplete, time_expression)
    if language.lower() not in {"en", "en-in"}:
        parts.append("The requested response language is not supported; this evidence-grounded response is provided in English.")
    return " ".join(part for part in parts if part)


def _facts(domain: str, observation: dict[str, Any]) -> list[str]:
    fields = {
        "ocean": (("wave_height_m", "wave height", "m"), ("wave_period_s", "wave period", "s"), ("sea_surface_temperature_c", "sea-surface temperature", "°C")),
        "weather": (("condition", "condition", ""), ("wind_speed_mps", "wind", "m/s"), ("precipitation_mm", "precipitation", "mm"), ("air_temperature_c", "air temperature", "°C")),
    }
    facts = []
    for key, label, unit in fields.get(domain, ()):
        value = observation.get(key)
        if isinstance(value, (str, int, float)):
            facts.append(f"{label} {value}{(' ' + unit) if unit else ''}")
    return facts


def _hindi_answer(level: str, results: dict[str, Any], pending: list[str], incomplete: list[str], time_expression: str | None) -> str:
    # Controlled Hindi wrapper; all measurements below are copied from evidence.
    status = {"low": "कम", "moderate": "मध्यम", "high": "उच्च", "critical": "गंभीर", "unknown": "अज्ञात"}.get(level, "अज्ञात")
    facts = []
    for domain, label in (("ocean", "समुद्री"), ("weather", "मौसम")):
        result = results.get(domain, {})
        if result.get("data_status") in {"live", "cached"}:
            values = _facts(domain, result.get("observation") or {})
            if values:
                facts.append(f"{label} प्रमाण: " + "; ".join(values) + ".")
        elif domain in results:
            facts.append(f"{label} डेटा उपलब्ध नहीं है।")
    limitations = []
    if incomplete:
        limitations.append("पूर्ण सुरक्षा आकलन उपलब्ध नहीं है; आवश्यक प्रमाण अनुपलब्ध या लंबित हैं: " + ", ".join(incomplete) + "।")
    if "pfz" in pending:
        limitations.append("PFZ डेटा उपलब्ध नहीं है।")
    other_pending = [name for name in pending if name not in {"pfz", "safety"}]
    if other_pending:
        limitations.append("लंबित क्षमता: " + ", ".join(other_pending) + "।")
    if time_expression:
        limitations.append(f"आपने {time_expression} के बारे में पूछा था; कॉन्फ़िगर किए गए प्रदाता केवल वर्तमान अवलोकन देते हैं, पूर्वानुमान नहीं।")
    opening = "ORCA का संयुक्त जोखिम आकलन " + status + " है।" if not incomplete else "ORCA का सुरक्षा आकलन सीमित है।"
    return opening + " " + " ".join(facts + limitations) + " निर्णय से पहले स्रोत प्रमाण और नवीनतम स्थितियों की समीक्षा करें।"
