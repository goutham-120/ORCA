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
            "demo",
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
            "PFZ information is unavailable because no current authorized advisory is loaded. Ask ORCA can refresh the official INCOIS source when network access is available."
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

    if context.get("map_follow_up"):
        parts.append("View the source-backed features in Map Explorer.")

    # ---------------------------------------------------------
    # Decision intelligence
    # ---------------------------------------------------------

    if isinstance(decision, dict) and not (context.get("decision_type") == "pfz" and decision.get("assessment")):
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
    # Telugu & Hindi response
    # ---------------------------------------------------------

    if language.lower() in {"hi", "hi-in"}:
        return _hindi_answer(
            level,
            results,
            pending,
            incomplete,
            time_expression,
            location_name=place,
            decision=decision,
        )

    if language.lower() in {"te", "te-in"}:
        return _telugu_answer(
            level,
            results,
            pending,
            incomplete,
            time_expression,
            location_name=place,
            decision=decision,
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
    lang: str = "en",
) -> list[str]:
    if lang.lower() in {"te", "te-in"}:
        fields = {
            "ocean": (
                ("wave_height_m", "అలల ఎత్తు (Wave Height)", "m"),
                ("wave_period_s", "అలల సమయం (Wave Period)", "s"),
                ("sea_surface_temperature_c", "సముద్ర ఉపరితల ఉష్ణోగ్రత (SST)", "°C"),
            ),
            "weather": (
                ("condition", "వాతావరణ పరిస్థితి", ""),
                ("wind_speed_mps", "గాలి వేగం (Wind Speed)", "m/s"),
                ("precipitation_mm", "వర్షపాతం", "mm"),
                ("air_temperature_c", "గాలి ఉష్ణోగ్రత", "°C"),
            ),
        }
    elif lang.lower() in {"hi", "hi-in"}:
        fields = {
            "ocean": (
                ("wave_height_m", "तरंग ऊंचाई (Wave Height)", "m"),
                ("wave_period_s", "तरंग अवधि (Wave Period)", "s"),
                ("sea_surface_temperature_c", "समुद्री सतह तापमान (SST)", "°C"),
            ),
            "weather": (
                ("condition", "मौसम स्थिति", ""),
                ("wind_speed_mps", "हवा की गति (Wind Speed)", "m/s"),
                ("precipitation_mm", "वर्षा", "mm"),
                ("air_temperature_c", "वायु तापमान", "°C"),
            ),
        }
    else:
        fields = {
            "ocean": (
                ("wave_height_m", "wave height", "m"),
                ("wave_period_s", "wave period", "s"),
                ("sea_surface_temperature_c", "sea-surface temperature", "°C"),
            ),
            "weather": (
                ("condition", "condition", ""),
                ("wind_speed_mps", "wind", "m/s"),
                ("precipitation_mm", "precipitation", "mm"),
                ("air_temperature_c", "air temperature", "°C"),
            ),
        }

    facts = []

    for key, label, unit in fields.get(domain, ()):
        value = observation.get(key)
        if isinstance(value, (str, int, float)):
            facts.append(f"{label}: {value}{(' ' + unit) if unit else ''}")

    return facts


def _hindi_answer(
    level: str,
    results: dict[str, Any],
    pending: list[str],
    incomplete: list[str],
    time_expression: str | None,
    location_name: str | None = None,
    decision: dict[str, Any] | None = None,
) -> str:
    status_map = {
        "low": "कम जोखिम (अनुकूल स्थिति)",
        "moderate": "मध्यम जोखिम (सावधानी आवश्यक)",
        "high": "उच्च जोखिम (गंभीर चेतावनी)",
        "critical": "अत्यधिक गंभीर जोखिम",
        "unknown": "अज्ञात",
    }

    status = status_map.get(level, "अज्ञात")
    loc_suffix = f" [{location_name}]" if location_name else ""

    opening = (
        f"ORCA का संयुक्त समुद्री जोखिम आकलन{loc_suffix}: {status}।"
        if not incomplete
        else f"ORCA का सुरक्षा आकलन{loc_suffix} सीमित है।"
    )

    facts = []
    for domain, label in (("ocean", "🌊 समुद्री आंकड़े"), ("weather", "🌤️ मौसम आंकड़े")):
        result = results.get(domain, {})
        if result.get("data_status") in {"live", "cached", "demo", "static"}:
            values = _facts(domain, result.get("observation") or {}, lang="hi")
            if values:
                facts.append(f"{label}: " + "; ".join(values) + "।")
        elif domain in results:
            facts.append(f"{label}: डेटा उपलब्ध नहीं है।")

    guidance = []
    if level == "low":
        guidance.append("💡 सलाह: तटीय गतिविधियां, नौकायन और मछली पकड़ने के लिए समुद्र अनुकूल है।")
    elif level == "moderate":
        guidance.append("💡 सलाह: समुद्र में गतिविधियां करते समय सावधानी बरतें और मौसम अपडेट पर नजर रखें।")
    elif level in {"high", "critical"}:
        guidance.append("⚠️ चेतावनी: समुद्र में जाने से बचें। तेज हवाएं और ऊंची लहरें सक्रिय हैं।")

    if isinstance(decision, dict) and decision.get("assessment"):
        guidance.append(f"📌 निर्णय विश्लेषण: {decision.get('assessment')}")

    limitations = []
    if incomplete:
        limitations.append("आवश्यक डेटा अभी पूरी तरह उपलब्ध नहीं है।")

    parts = [opening]
    if facts:
        parts.append(" ".join(facts))
    if guidance:
        parts.append(" ".join(guidance))
    if limitations:
        parts.append(" ".join(limitations))

    return "\n\n".join(parts)


def _telugu_answer(
    level: str,
    results: dict[str, Any],
    pending: list[str],
    incomplete: list[str],
    time_expression: str | None,
    location_name: str | None = None,
    decision: dict[str, Any] | None = None,
) -> str:
    status_map = {
        "low": "తక్కువ ప్రమాదం (అనుకూల పరిస్థితి)",
        "moderate": "మధ్యస్థ ప్రమాదం (జాగ్రత్త అవసరం)",
        "high": "అధిక ప్రమాదం (తీవ్రమైన హెచ్చరిక)",
        "critical": "అత్యంత ప్రమాదకరం",
        "unknown": "అజ్ఞాతం",
    }

    status = status_map.get(level, "అజ్ఞాతం")
    loc_suffix = f" [{location_name}]" if location_name else ""

    opening = (
        f"ORCA సముద్ర ప్రమాద అంచనా{loc_suffix}: {status}."
        if not incomplete
        else f"ORCA భద్రతా అంచనా{loc_suffix} పరిమితంగా ఉంది."
    )

    facts = []
    for domain, label in (("ocean", "🌊 సముద్ర వివరాలు"), ("weather", "🌤️ వాతావరణ వివరాలు")):
        result = results.get(domain, {})
        if result.get("data_status") in {"live", "cached", "demo", "static"}:
            values = _facts(domain, result.get("observation") or {}, lang="te")
            if values:
                facts.append(f"{label}: " + "; ".join(values) + "।")
        elif domain in results:
            facts.append(f"{label}: సమాచారం అందుబాటులో లేదు.")

    guidance = []
    if level == "low":
        guidance.append("💡 సలహా: తీరప్రాంత కార్యకలాపాలు, పడవ ప్రయాణం మరియు చేపల వేటకు సముద్రం అనుకూలంగా ఉంది.")
    elif level == "moderate":
        guidance.append("💡 సలహా: సముద్రంలో కార్యకలాపాలు నిర్వహించేటప్పుడు జాగ్రత్త వహించండి. చిన్న పడవలు అప్రమత్తంగా ఉండాలి.")
    elif level in {"high", "critical"}:
        guidance.append("⚠️ హెచ్చరిక: సముద్రంలోకి వెళ్లవద్దు. ఈదురు గాలులు మరియు ఎత్తైన అలలు ఉన్నాయి.")

    if isinstance(decision, dict) and decision.get("assessment"):
        guidance.append(f"📌 విశ్లేషణ: {decision.get('assessment')}")

    limitations = []
    if incomplete:
        limitations.append("అవసరమైన సమాచారం ఇంకా పూర్తి స్థాయిలో అందుబాటులో లేదు.")

    parts = [opening]
    if facts:
        parts.append(" ".join(facts))
    if guidance:
        parts.append(" ".join(guidance))
    if limitations:
        parts.append(" ".join(limitations))

    return "\n\n".join(parts)
