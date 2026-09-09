"""Evidence-grounded conversational synthesis kept outside domain agents."""

from __future__ import annotations

from typing import Any


def synthesize_answer(
    query: str,
    assessment: dict[str, Any],
    results: dict[str, Any],
    pending: list[str],
    context: dict[str, Any],
    language: str = "en",
    decision: dict[str, Any] | None = None,
) -> str:
    """Create a deterministic answer using only workflow outputs and context."""

    parts: list[str] = []
    decision = decision or results.get("decision")

    level = assessment.get("level", "unknown")

    location = context.get("location") or {}

    label = (
        location.get("label")
        if isinstance(location, dict)
        else None
    )

    requested_place = context.get("requested_location")

    place = label or requested_place

    subject = f" for {place}" if place else ""

    incomplete = assessment.get("incomplete_domains", [])

    # ---------------------------------------------------------
    # Overall assessment
    # ---------------------------------------------------------

    if context.get("decision_type") == "pfz" and isinstance(decision, dict):
        parts.append(str(decision.get("assessment", "No current PFZ advisory was returned.")))
    elif incomplete:
        parts.append(
            f"ORCA cannot make a complete safety assessment{subject} "
            f"because required evidence is unavailable or pending: "
            f"{', '.join(incomplete)}."
        )

    elif level == "unknown":
        parts.append(
            f"ORCA cannot make a safety assessment{subject} "
            "from the currently available evidence."
        )

    else:
        parts.append(
            f"ORCA's combined assessment{subject} is {level} risk."
        )

    # ---------------------------------------------------------
    # Domain evidence
    # ---------------------------------------------------------

    for domain in ("ocean", "weather", "gis"):

        result = results.get(domain)

        if not isinstance(result, dict):
            continue

        # If only a place name was supplied and no coordinates
        # are available, do not present location-dependent data
        # as retrieved evidence.
        if (
            not location
            and requested_place
            and domain in {"ocean", "weather", "gis"}
        ):
            parts.append(
                f"{domain.title()} data is unavailable: "
                "coordinates were not supplied."
            )
            continue

        # -----------------------------------------------------
        # Available evidence
        # -----------------------------------------------------

        if result.get("data_status") in {
            "live",
            "cached",
            "static",
        }:

            observation = result.get("observation") or {}

            facts = _facts(
                domain,
                observation,
            )

            if facts:
                parts.append(
                    f"{domain.title()} evidence: "
                    + "; ".join(facts)
                    + "."
                )
            else:
                parts.append(
                    result.get("summary", "")
                )

        # -----------------------------------------------------
        # Unavailable evidence
        # -----------------------------------------------------

        else:
            parts.append(
                f"{domain.title()} data is unavailable: "
                f"{result.get('error') or result.get('summary', 'no source returned data')}"
            )

    # ---------------------------------------------------------
    # Requested place without coordinates
    # ---------------------------------------------------------

    if not location and requested_place:
        parts.append(
            f"“{requested_place}” was retained as the requested place, "
            "but coordinates were not supplied, so location-dependent "
            "data could not be retrieved."
        )

    # ---------------------------------------------------------
    # Time expression
    # ---------------------------------------------------------

    time_expression = context.get("time_expression")

    if time_expression:
        has_forecast_evidence = any(
            isinstance(result, dict)
            and isinstance(result.get("observation"), dict)
            and result["observation"].get("timestamp")
            for result in results.values()
        )
        parts.append(
            f"These are the available provider forecasts for {time_expression}; "
            "conditions can change, so check the latest advisories before deciding."
            if has_forecast_evidence
            else f"You asked about {time_expression}, but no forecast evidence was returned for that time."
        )

    # ---------------------------------------------------------
    # PFZ pending information
    # ---------------------------------------------------------

    if "pfz" in pending:
        parts.append(
            "PFZ information is unavailable because no PFZ data source is configured."
        )

    # ---------------------------------------------------------
    # Other pending capabilities
    # ---------------------------------------------------------

    other_pending = [
        name
        for name in pending
        if name not in {"pfz", "safety"}
    ]

    if other_pending:
        parts.append(
            "Pending capability: "
            + ", ".join(other_pending)
            + "."
        )

    # ---------------------------------------------------------
    # Risk concerns
    # ---------------------------------------------------------

    concerns = [
        concern
        for result in results.values()
        if isinstance(result, dict)
        for concern in result.get("concerns", [])
    ]

    if concerns:
        parts.append(
            "Risk factors: "
            + "; ".join(concerns)
            + "."
        )

    # ---------------------------------------------------------
    # Decision intelligence
    # ---------------------------------------------------------

    if isinstance(decision, dict):
        parts.append(
            "Decision intelligence: "
            + str(
                decision.get(
                    "assessment",
                    "No decision assessment available.",
                )
            )
        )

        if decision.get("unavailable_data"):
            parts.append(
                "Decision limitations: "
                + ", ".join(decision["unavailable_data"])
                + "."
            )

    # ---------------------------------------------------------
    # Hindi response
    # ---------------------------------------------------------

    if language.lower() in {"hi", "hi-in"}:
        return _hindi_answer(
            level,
            results,
            pending,
            incomplete,
            time_expression,
        )

    # ---------------------------------------------------------
    # Unsupported language
    # ---------------------------------------------------------

    if language.lower() not in {"en", "en-in"}:
        parts.append(
            "The requested response language is not supported; "
            "this evidence-grounded response is provided in English."
        )

    return " ".join(
        part
        for part in parts
        if part
    )


def _facts(
    domain: str,
    observation: dict[str, Any],
) -> list[str]:

    fields = {
        "ocean": (
            (
                "wave_height_m",
                "wave height",
                "m",
            ),
            (
                "wave_period_s",
                "wave period",
                "s",
            ),
            (
                "sea_surface_temperature_c",
                "sea-surface temperature",
                "°C",
            ),
        ),
        "weather": (
            (
                "condition",
                "condition",
                "",
            ),
            (
                "wind_speed_mps",
                "wind",
                "m/s",
            ),
            (
                "precipitation_mm",
                "precipitation",
                "mm",
            ),
            (
                "air_temperature_c",
                "air temperature",
                "°C",
            ),
        ),
    }

    facts = []

    for key, label, unit in fields.get(domain, ()):

        value = observation.get(key)

        if isinstance(
            value,
            (str, int, float),
        ):
            facts.append(
                f"{label} {value}"
                f"{(' ' + unit) if unit else ''}"
            )

    return facts


def _hindi_answer(
    level: str,
    results: dict[str, Any],
    pending: list[str],
    incomplete: list[str],
    time_expression: str | None,
) -> str:

    # Controlled Hindi wrapper; all measurements below are copied from evidence.

    status = {
        "low": "कम",
        "moderate": "मध्यम",
        "high": "उच्च",
        "critical": "गंभीर",
        "unknown": "अज्ञात",
    }.get(
        level,
        "अज्ञात",
    )

    facts = []

    for domain, label in (
        ("ocean", "समुद्री"),
        ("weather", "मौसम"),
    ):

        result = results.get(
            domain,
            {},
        )

        if result.get("data_status") in {
            "live",
            "cached",
        }:

            values = _facts(
                domain,
                result.get("observation") or {},
            )

            if values:
                facts.append(
                    f"{label} प्रमाण: "
                    + "; ".join(values)
                    + "."
                )

        elif domain in results:

            facts.append(
                f"{label} डेटा उपलब्ध नहीं है।"
            )

    limitations = []

    if incomplete:
        limitations.append(
            "पूर्ण सुरक्षा आकलन उपलब्ध नहीं है; "
            "आवश्यक प्रमाण अनुपलब्ध या लंबित हैं: "
            + ", ".join(incomplete)
            + "।"
        )

    if "pfz" in pending:
        limitations.append(
            "PFZ डेटा उपलब्ध नहीं है।"
        )

    other_pending = [
        name
        for name in pending
        if name not in {"pfz", "safety"}
    ]

    if other_pending:
        limitations.append(
            "लंबित क्षमता: "
            + ", ".join(other_pending)
            + "।"
        )

    if time_expression:
        limitations.append(
            f"आपने {time_expression} के बारे में पूछा था; "
            "कॉन्फ़िगर किए गए प्रदाता केवल वर्तमान अवलोकन देते हैं, "
            "पूर्वानुमान नहीं।"
        )

    opening = (
        "ORCA का संयुक्त जोखिम आकलन "
        + status
        + " है।"
        if not incomplete
        else "ORCA का सुरक्षा आकलन सीमित है।"
    )

    return (
        opening
        + " "
        + " ".join(facts + limitations)
        + " निर्णय से पहले स्रोत प्रमाण और नवीनतम स्थितियों की समीक्षा करें।"
    )