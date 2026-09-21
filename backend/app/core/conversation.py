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
    elif context.get("decision_type") == "simulation" and isinstance(decision, dict) and decision.get("scenario_simulation"):
        sim = decision["scenario_simulation"]
        parts.append(f"🧪 Marine Scenario Simulation Report{subject}: {sim.get('scenario_summary')}")
        sim_msi = sim.get("simulated", {}).get("msi", {})
        parts.append(f"Projected Marine Safety Index: {sim_msi.get('score')}/100 ({sim_msi.get('tier_label')}), Shift: {sim.get('msi_delta', 0):+d} points.")
        vessels = sim.get("vessel_advisories", [])
        if vessels:
            v_summary = "; ".join(f"{v['category']}: {v['status']} ({v['advisory']})" for v in vessels)
            parts.append(f"Vessel Category Advisories: {v_summary}.")
        species = sim.get("species_impacts", [])
        disrupted = [s for s in species if s.get("severity") in {"high", "critical"}]
        if disrupted:
            s_summary = "; ".join(f"{s['species'].split(' (')[0]}: {s['impact']} {s['catch_projection']}" for s in disrupted)
            parts.append(f"Pelagic Fishery Dispersal Alert: {s_summary}.")
        port = sim.get("port_impact")
        if isinstance(port, dict):
            parts.append(f"Harbor Operations: {port.get('status')} - {port.get('advisory')}")
    elif context.get("decision_type") == "anomaly" and isinstance(decision, dict) and decision.get("ecosystem_diagnosis"):
        eco = decision["ecosystem_diagnosis"]
        parts.append(f"Marine Ecosystem Diagnosis{subject}: {eco.get('diagnosis_summary')}")
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
    # Marine Safety Index (MSI) & Tide
    # ---------------------------------------------------------
    if isinstance(decision, dict):
        msi = decision.get("marine_safety_index")
        if isinstance(msi, dict) and msi.get("score") is not None:
            parts.append(f"Marine Safety Index: {msi['score']}/100 ({msi.get('tier_label', '')}).")

        tide = decision.get("tide")
        if isinstance(tide, dict) and tide.get("status") == "available":
            parts.append(
                f"Tide conditions: {tide.get('tide_state')} (Level: {tide.get('current_height_m')}m, {tide.get('spring_neap_phase')}). "
                f"Next High Tide: {tide.get('next_high_tide', {}).get('time_display')} ({tide.get('next_high_tide', {}).get('height_m')}m)."
            )

    # ---------------------------------------------------------
    # Domain evidence
    # ---------------------------------------------------------

    for domain in ("ocean", "weather", "gis"):
        result = results.get(domain)

        if not isinstance(result, dict):
            continue

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

        if has_forecast_evidence:
            parts.append(
                f"Forecast evidence matching “{time_expression}” was retrieved."
            )
        else:
            parts.append(
                f"“{time_expression}” was requested, but only current observations were retrieved."
            )

    # ---------------------------------------------------------
    # Pending capability notice
    # ---------------------------------------------------------

    if pending:
        parts.append(
            "Some requested capability domains remain pending: "
            + ", ".join(pending)
            + "."
        )

    if context.get("map_follow_up"):
        parts.append("View the source-backed features in Map Explorer.")

    # ---------------------------------------------------------
    # Decision intelligence
    # ---------------------------------------------------------

    if isinstance(decision, dict) and not (context.get("decision_type") == "pfz" and decision.get("assessment")):
        if context.get("decision_type") not in {"anomaly", "simulation"}:
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
    # Regional Languages (Telugu, Hindi, Tamil)
    # ---------------------------------------------------------

    lang_lower = language.lower()
    if lang_lower in {"hi", "hi-in"}:
        return _hindi_answer(
            level,
            results,
            pending,
            incomplete,
            time_expression,
            location_name=place,
            decision=decision,
        )

    if lang_lower in {"te", "te-in"}:
        return _telugu_answer(
            level,
            results,
            pending,
            incomplete,
            time_expression,
            location_name=place,
            decision=decision,
        )

    if lang_lower in {"ta", "ta-in"}:
        return _tamil_answer(
            level,
            results,
            pending,
            incomplete,
            time_expression,
            location_name=place,
            decision=decision,
        )

    if lang_lower not in {"en", "en-in"}:
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
    elif lang.lower() in {"ta", "ta-in"}:
        fields = {
            "ocean": (
                ("wave_height_m", "அலை உயரம் (Wave Height)", "m"),
                ("wave_period_s", "அலை காலம் (Wave Period)", "s"),
                ("sea_surface_temperature_c", "கடல் மேற்பரப்பு வெப்பநிலை (SST)", "°C"),
            ),
            "weather": (
                ("condition", "வானிலை நிலை", ""),
                ("wind_speed_mps", "காற்று வேகம் (Wind Speed)", "m/s"),
                ("precipitation_mm", "மழைப்பொழிவு", "mm"),
                ("air_temperature_c", "காற்று வெப்பநிலை", "°C"),
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

    is_sim = isinstance(decision, dict) and bool(decision.get("scenario_simulation"))

    if is_sim:
        sim = decision["scenario_simulation"]
        opening = f"🧪 ORCA समुद्री परिदृश्य सिमुलेशन रिपोर्ट{loc_suffix}: {sim.get('scenario_summary')}"
    else:
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
    if is_sim:
        sim = decision["scenario_simulation"]
        sim_msi = sim.get("simulated", {}).get("msi", {})
        guidance.append(f"🛡️ अनुमानित समुद्री सुरक्षा सूचकांक (MSI): {sim_msi.get('score')}/100 ({sim_msi.get('tier_label')}), बदलाव: {sim.get('msi_delta', 0):+d} अंक।")
        vessels = sim.get("vessel_advisories", [])
        if vessels:
            guidance.append("नाव/नौका परामर्श: " + "; ".join(f"{v['category']}: {v['status']} ({v['advisory']})" for v in vessels))
        species = sim.get("species_impacts", [])
        disrupted = [s for s in species if s.get("severity") in {"high", "critical"}]
        if disrupted:
            guidance.append("मत्स्य फैलाव चेतावनी: " + "; ".join(f"{s['species'].split(' (')[0]}: {s['impact']} {s['catch_projection']}" for s in disrupted))
        port = sim.get("port_impact")
        if isinstance(port, dict):
            guidance.append(f"बंदरगाह स्थिति: {port.get('status')} - {port.get('advisory')}")
    elif isinstance(decision, dict):
        msi = decision.get("marine_safety_index")
        if isinstance(msi, dict) and msi.get("score") is not None:
            guidance.append(f"🛡️ समुद्री सुरक्षा सूचकांक (MSI): {msi['score']}/100 ({msi.get('tier_label', '')})")

        tide = decision.get("tide")
        if isinstance(tide, dict) and tide.get("status") == "available":
            guidance.append(f"🌊 ज्वार-भाटा: {tide.get('tide_state')} (जल स्तर: {tide.get('current_height_m')}m)")

    if not is_sim:
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

    is_sim = isinstance(decision, dict) and bool(decision.get("scenario_simulation"))

    if is_sim:
        sim = decision["scenario_simulation"]
        opening = f"🧪 ORCA సముద్ర దృశ్య సిమ్యులేషన్ నివేదిక{loc_suffix}: {sim.get('scenario_summary')}"
    else:
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
    if is_sim:
        sim = decision["scenario_simulation"]
        sim_msi = sim.get("simulated", {}).get("msi", {})
        guidance.append(f"🛡️ అంచనా వేసిన సముద్ర భద్రతా సూచిక (MSI): {sim_msi.get('score')}/100 ({sim_msi.get('tier_label')}), మార్పు: {sim.get('msi_delta', 0):+d} పాయింట్లు.")
        vessels = sim.get("vessel_advisories", [])
        if vessels:
            guidance.append("పడవ కార్యకలాపాల సలహా: " + "; ".join(f"{v['category']}: {v['status']} ({v['advisory']})" for v in vessels))
        species = sim.get("species_impacts", [])
        disrupted = [s for s in species if s.get("severity") in {"high", "critical"}]
        if disrupted:
            guidance.append("చేపల వలసల హెచ్చరిక: " + "; ".join(f"{s['species'].split(' (')[0]}: {s['impact']} {s['catch_projection']}" for s in disrupted))
        port = sim.get("port_impact")
        if isinstance(port, dict):
            guidance.append(f"ఓడరేవు స్థితి: {port.get('status')} - {port.get('advisory')}")
    elif isinstance(decision, dict):
        msi = decision.get("marine_safety_index")
        if isinstance(msi, dict) and msi.get("score") is not None:
            guidance.append(f"🛡️ సముద్ర భద్రతా సూచిక (MSI): {msi['score']}/100 ({msi.get('tier_label', '')})")

        tide = decision.get("tide")
        if isinstance(tide, dict) and tide.get("status") == "available":
            guidance.append(f"🌊 పోటు-పాటు (Tide): {tide.get('tide_state')} (స్థాయి: {tide.get('current_height_m')}m)")

    if not is_sim:
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
    if "pfz" in pending:
        limitations.append("PFZ సమాచారం అందుబాటులో లేదు.")

    parts = [opening]
    if facts:
        parts.append(" ".join(facts))
    if guidance:
        parts.append(" ".join(guidance))
    if limitations:
        parts.append(" ".join(limitations))

    return "\n\n".join(parts)


def _tamil_answer(
    level: str,
    results: dict[str, Any],
    pending: list[str],
    incomplete: list[str],
    time_expression: str | None,
    location_name: str | None = None,
    decision: dict[str, Any] | None = None,
) -> str:
    status_map = {
        "low": "குறைந்த ஆபத்து (சாதகமான சூழல்)",
        "moderate": "மிதமான ஆபத்து (எச்சரிக்கை தேவை)",
        "high": "அதிக ஆபத்து (தீவிர எச்சரிக்கை)",
        "critical": "அபாயகரமான நிலை",
        "unknown": "தெரியவில்லை",
    }

    status = status_map.get(level, "தெரியவில்லை")
    loc_suffix = f" [{location_name}]" if location_name else ""

    is_sim = isinstance(decision, dict) and bool(decision.get("scenario_simulation"))

    if is_sim:
        sim = decision["scenario_simulation"]
        opening = f"🧪 ORCA கடல்சார் மாதிரி உருவகப்படுத்தல் அறிக்கை{loc_suffix}: {sim.get('scenario_summary')}"
    else:
        opening = (
            f"ORCA கடல்சார் இடர் மதிப்பீடு{loc_suffix}: {status}."
            if not incomplete
            else f"ORCA பாதுகாப்பு மதிப்பீடு{loc_suffix} வரம்பிற்குட்பட்டது."
        )

    facts = []
    for domain, label in (("ocean", "🌊 கடல் விவரங்கள்"), ("weather", "🌤️ வானிலை விவரங்கள்")):
        result = results.get(domain, {})
        if result.get("data_status") in {"live", "cached", "demo", "static"}:
            values = _facts(domain, result.get("observation") or {}, lang="ta")
            if values:
                facts.append(f"{label}: " + "; ".join(values) + ".")
        elif domain in results:
            facts.append(f"{label}: தரவு கிடைக்கவில்லை.")

    guidance = []
    if is_sim:
        sim = decision["scenario_simulation"]
        sim_msi = sim.get("simulated", {}).get("msi", {})
        guidance.append(f"🛡️ கணிக்கப்பட்ட கடல் பாதுகாப்பு குறியீடு (MSI): {sim_msi.get('score')}/100 ({sim_msi.get('tier_label')}), மாற்றம்: {sim.get('msi_delta', 0):+d} புள்ளிகள்.")
        vessels = sim.get("vessel_advisories", [])
        if vessels:
            guidance.append("படகு செயல்பாட்டு வழிகாட்டுதல்: " + "; ".join(f"{v['category']}: {v['status']} ({v['advisory']})" for v in vessels))
        species = sim.get("species_impacts", [])
        disrupted = [s for s in species if s.get("severity") in {"high", "critical"}]
        if disrupted:
            guidance.append("மீன் வள இடம்பெயர்வு எச்சரிக்கை: " + "; ".join(f"{s['species'].split(' (')[0]}: {s['impact']} {s['catch_projection']}" for s in disrupted))
        port = sim.get("port_impact")
        if isinstance(port, dict):
            guidance.append(f"துறைமுக நிலை: {port.get('status')} - {port.get('advisory')}")
    elif isinstance(decision, dict):
        msi = decision.get("marine_safety_index")
        if isinstance(msi, dict) and msi.get("score") is not None:
            guidance.append(f"🛡️ கடல் பாதுகாப்பு குறியீடு (MSI): {msi['score']}/100 ({msi.get('tier_label', '')})")

        tide = decision.get("tide")
        if isinstance(tide, dict) and tide.get("status") == "available":
            guidance.append(f"🌊 ஓதம் (Tide): {tide.get('tide_state')} (அளவு: {tide.get('current_height_m')}m)")

    if not is_sim:
        if level == "low":
            guidance.append("💡 ஆலோசனை: கடலோர நடவடிக்கைகள், படகு போக்குவரத்து மற்றும் மீன்பிடித்தலுக்கு கடல் சாதகமாக உள்ளது.")
        elif level == "moderate":
            guidance.append("💡 ஆலோசனை: கடலில் செயல்படும் போது எச்சரிக்கையுடன் இருக்கவும். சிறிய படகுகள் விழிப்புடன் செயல்படவும்.")
        elif level in {"high", "critical"}:
            guidance.append("⚠️ எச்சரிக்கை: கடலுக்குள் செல்ல வேண்டாம். கடுமையான காற்று மற்றும் உயர்ந்த அலைகள் உள்ளன.")

    if isinstance(decision, dict) and decision.get("assessment"):
        guidance.append(f"📌 முடிவு பகுப்பாய்வு: {decision.get('assessment')}")

    limitations = []
    if incomplete:
        limitations.append("முழுமையான பாதுகாப்பு மதிப்பீட்டிற்கு தேவையான தகவல்கள் இன்னும் முழுமையாக கிடைக்கவில்லை.")
    if "pfz" in pending:
        limitations.append("PFZ தரவு தற்போது கிடைக்கவில்லை.")

    parts = [opening]
    if facts:
        parts.append(" ".join(facts))
    if guidance:
        parts.append(" ".join(guidance))
    if limitations:
        parts.append(" ".join(limitations))

    return "\n\n".join(parts)
