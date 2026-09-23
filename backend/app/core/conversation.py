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
                lang=language,
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

    if lang_lower in {"bn", "bn-in"}:
        return _bengali_answer(
            level,
            results,
            pending,
            incomplete,
            time_expression,
            location_name=place,
            decision=decision,
        )

    if lang_lower in {"kok", "kok-in"}:
        return _konkani_answer(
            level,
            results,
            pending,
            incomplete,
            time_expression,
            location_name=place,
            decision=decision,
        )

    if lang_lower in {"tcy", "tcy-in"}:
        return _tulu_answer(
            level,
            results,
            pending,
            incomplete,
            time_expression,
            location_name=place,
            decision=decision,
        )

    if lang_lower in {"gu", "gu-in"}:
        return _gujarati_answer(
            level,
            results,
            pending,
            incomplete,
            time_expression,
            location_name=place,
            decision=decision,
        )

    if lang_lower in {"mr", "mr-in"}:
        return _marathi_answer(
            level,
            results,
            pending,
            incomplete,
            time_expression,
            location_name=place,
            decision=decision,
        )

    if lang_lower in {"or", "or-in"}:
        return _odia_answer(
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

    if lang_lower in {"ml", "ml-in"}:
        return _malayalam_answer(
            level,
            results,
            pending,
            incomplete,
            time_expression,
            location_name=place,
            decision=decision,
        )

    if lang_lower in {"kn", "kn-in"}:
        return _kannada_answer(
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
    if lang.lower() in {"mr", "mr-in"}:
        fields = {
            "ocean": (
                ("wave_height_m", "लाटांची उंची (Wave Height)", "m"),
                ("wave_period_s", "लाटांचा कालावधी (Wave Period)", "s"),
                ("sea_surface_temperature_c", "समुद्र पृष्ठाचे तापमान (SST)", "°C"),
            ),
            "weather": (
                ("condition", "हवामान स्थिती", ""),
                ("wind_speed_mps", "वाऱ्याचा वेग (Wind Speed)", "m/s"),
                ("precipitation_mm", "पाऊस", "mm"),
                ("air_temperature_c", "हवेचे तापमान", "°C"),
            ),
        }
    elif lang.lower() in {"gu", "gu-in"}:
        fields = {
            "ocean": (
                ("wave_height_m", "મોજાની ઊંચાઈ (Wave Height)", "m"),
                ("wave_period_s", "મોજાનો સમયગાળો (Wave Period)", "s"),
                ("sea_surface_temperature_c", "દરિયાઈ સપાટીનું તાપમાન (SST)", "°C"),
            ),
            "weather": (
                ("condition", "હવામાન સ્થિતિ", ""),
                ("wind_speed_mps", "પવનની ઝડપ (Wind Speed)", "m/s"),
                ("precipitation_mm", "વરસાદ", "mm"),
                ("air_temperature_c", "હવાનું તાપમાન", "°C"),
            ),
        }
    elif lang.lower() in {"tcy", "tcy-in"}:
        fields = {
            "ocean": (
                ("wave_height_m", "ಅಲೆತ ಎತ್ತರ (Wave Height)", "m"),
                ("wave_period_s", "ಅಲೆತ ಸಮಯ (Wave Period)", "s"),
                ("sea_surface_temperature_c", "ಕಡಲ ಮಿತ್ತದ ತಾಪಮಾನ (SST)", "°C"),
            ),
            "weather": (
                ("condition", "ವಾತಾವರಣ ಸ್ಥಿತಿ", ""),
                ("wind_speed_mps", "ಗಾಳಿದ ವೇಗ (Wind Speed)", "m/s"),
                ("precipitation_mm", "ಬರ್ಸ", "mm"),
                ("air_temperature_c", "ಗಾಳಿದ ತಾಪಮಾನ", "°C"),
            ),
        }
    elif lang.lower() in {"kok", "kok-in"}:
        fields = {
            "ocean": (
                ("wave_height_m", "ल्हाटांची उंचाय (Wave Height)", "m"),
                ("wave_period_s", "ल्हाटांचो काळ (Wave Period)", "s"),
                ("sea_surface_temperature_c", "दर्या पोटाचे तापमान (SST)", "°C"),
            ),
            "weather": (
                ("condition", "हवामान स्थिती", ""),
                ("wind_speed_mps", "वार्याचा वेग (Wind Speed)", "m/s"),
                ("precipitation_mm", "पावस", "mm"),
                ("air_temperature_c", "हवेचे तापमान", "°C"),
            ),
        }
    elif lang.lower() in {"bn", "bn-in"}:
        fields = {
            "ocean": (
                ("wave_height_m", "ঢেউয়ের উচ্চতা (Wave Height)", "m"),
                ("wave_period_s", "ঢেউয়ের সময়কাল (Wave Period)", "s"),
                ("sea_surface_temperature_c", "সমুদ্রের পৃষ্ঠের তাপমাত্রা (SST)", "°C"),
            ),
            "weather": (
                ("condition", "আবহাওয়ার অবস্থা", ""),
                ("wind_speed_mps", "বাতাসের গতিবেগ (Wind Speed)", "m/s"),
                ("precipitation_mm", "বৃষ্টিপাত", "mm"),
                ("air_temperature_c", "বায়ুর তাপমাত্রা", "°C"),
            ),
        }
    elif lang.lower() in {"or", "or-in"}:
        fields = {
            "ocean": (
                ("wave_height_m", "ଲହଡ଼ି ଉଚ୍ଚତା (Wave Height)", "m"),
                ("wave_period_s", "ଲହଡ଼ି ସମୟ (Wave Period)", "s"),
                ("sea_surface_temperature_c", "ସମୁଦ୍ର ପୃଷ୍ଠ ତାପମାତ୍ରା (SST)", "°C"),
            ),
            "weather": (
                ("condition", "ପାଣିପାଗ ସ୍ଥିତି", ""),
                ("wind_speed_mps", "ପବନ ବେଗ (Wind Speed)", "m/s"),
                ("precipitation_mm", "ବର୍ଷା ପରିମାଣ", "mm"),
                ("air_temperature_c", "ବାୟୁ ତାପମାତ୍ରା", "°C"),
            ),
        }
    elif lang.lower() in {"te", "te-in"}:
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
    elif lang.lower() in {"ml", "ml-in"}:
        fields = {
            "ocean": (
                ("wave_height_m", "തിരമാല ഉയരം (Wave Height)", "m"),
                ("wave_period_s", "തിരമാല ദൈർഘ്യം (Wave Period)", "s"),
                ("sea_surface_temperature_c", "സമുദ്ര ഉപരിതല താപനില (SST)", "°C"),
            ),
            "weather": (
                ("condition", "കാലാവസ്ഥാ അവസ്ഥ", ""),
                ("wind_speed_mps", "കാറ്റിന്റെ വേഗത (Wind Speed)", "m/s"),
                ("precipitation_mm", "മഴ", "mm"),
                ("air_temperature_c", "വായു താപനില", "°C"),
            ),
        }
    elif lang.lower() in {"kn", "kn-in"}:
        fields = {
            "ocean": (
                ("wave_height_m", "ಅಲೆಗಳ ಎತ್ತರ (Wave Height)", "m"),
                ("wave_period_s", "ಅಲೆಗಳ ಅವಧಿ (Wave Period)", "s"),
                ("sea_surface_temperature_c", "ಸಮುದ್ರ ಮೇಲ್ಮೈ ತಾಪಮಾನ (SST)", "°C"),
            ),
            "weather": (
                ("condition", "ಹವಾಮಾನ ಸ್ಥಿತಿ", ""),
                ("wind_speed_mps", "ಗಾಳಿಯ ವೇಗ (Wind Speed)", "m/s"),
                ("precipitation_mm", "ಮಳೆ", "mm"),
                ("air_temperature_c", "ಗಾಳಿಯ ತಾಪಮಾನ", "°C"),
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
                ("wind_speed_mps", "wind speed", "m/s"),
                ("precipitation_mm", "precipitation", "mm"),
                ("air_temperature_c", "air temperature", "°C"),
            ),
        }

    facts = []

    for key, label, unit in fields.get(domain, ()):
        value = observation.get(key)
        if isinstance(value, float):
            val_str = f"{value:.1f}" if value.is_integer() else f"{round(value, 1)}"
            facts.append(f"{label}: {val_str}{(' ' + unit) if unit else ''}")
        elif isinstance(value, (int, str)):
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


def _odia_answer(
    level: str,
    results: dict[str, Any],
    pending: list[str],
    incomplete: list[str],
    time_expression: str | None,
    location_name: str | None = None,
    decision: dict[str, Any] | None = None,
) -> str:
    status_map = {
        "low": "କମ୍ ବିପଦ (ଅନୁକୂଳ ସ୍ଥିତି)",
        "moderate": "ମଧ୍ୟମ ବିପଦ (ସତର୍କତା ଆବଶ୍ୟକ)",
        "high": "ଉଚ୍ଚ ବିପଦ (ଗମ୍ଭୀର ଚେତାବନୀ)",
        "critical": "ଅତ୍ୟନ୍ତ ବିପଜ୍ଜନକ",
        "unknown": "ଅଜ୍ଞାତ",
    }

    status = status_map.get(level, "ଅଜ୍ଞାତ")
    loc_suffix = f" [{location_name}]" if location_name else ""

    is_sim = isinstance(decision, dict) and bool(decision.get("scenario_simulation"))

    if is_sim:
        sim = decision["scenario_simulation"]
        opening = f"🧪 ORCA ସାମୁଦ୍ରିକ ପରିସ୍ଥିତି ସିମ୍ୟୁଲେସନ ରିପୋର୍ଟ{loc_suffix}: {sim.get('scenario_summary')}"
    else:
        opening = (
            f"ORCA ସାମୁଦ୍ରିକ ବିପଦ ଆକଳନ{loc_suffix}: {status}।"
            if not incomplete
            else f"ORCA ସୁରକ୍ଷା ଆକଳନ{loc_suffix} ସୀମିତ ଅଟେ।"
        )

    facts = []
    for domain, label in (("ocean", "🌊 ସମୁଦ୍ର ତଥ୍ୟ"), ("weather", "🌤️ ପାଣିପାଗ ତଥ୍ୟ")):
        result = results.get(domain, {})
        if result.get("data_status") in {"live", "cached", "demo", "static"}:
            values = _facts(domain, result.get("observation") or {}, lang="or")
            if values:
                facts.append(f"{label}: " + "; ".join(values) + "।")
        elif domain in results:
            facts.append(f"{label}: ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ।")

    guidance = []
    if is_sim:
        sim = decision["scenario_simulation"]
        sim_msi = sim.get("simulated", {}).get("msi", {})
        guidance.append(f"🛡️ ଅନୁମାନିତ ସାମୁଦ୍ରିକ ସୁରକ୍ଷା ସୂଚକାଙ୍କ (MSI): {sim_msi.get('score')}/100 ({sim_msi.get('tier_label')}), ପରିବର୍ତ୍ତନ: {sim.get('msi_delta', 0):+d} ଅଙ୍କ।")
        vessels = sim.get("vessel_advisories", [])
        if vessels:
            guidance.append("ଡଙ୍ଗା ପରାମର୍ଶ: " + "; ".join(f"{v['category']}: {v['status']} ({v['advisory']})" for v in vessels))
        species = sim.get("species_impacts", [])
        disrupted = [s for s in species if s.get("severity") in {"high", "critical"}]
        if disrupted:
            guidance.append("ମତ୍ସ୍ୟ ସତର୍କତା: " + "; ".join(f"{s['species'].split(' (')[0]}: {s['impact']} {s['catch_projection']}" for s in disrupted))
        port = sim.get("port_impact")
        if isinstance(port, dict):
            guidance.append(f"ବନ୍ଦର ସ୍ଥିତି: {port.get('status')} - {port.get('advisory')}")
    elif isinstance(decision, dict):
        msi = decision.get("marine_safety_index")
        if isinstance(msi, dict) and msi.get("score") is not None:
            guidance.append(f"🛡️ ସାମୁଦ୍ରିକ ସୁରକ୍ଷା ସୂଚକାଙ୍କ (MSI): {msi['score']}/100 ({msi.get('tier_label', '')})")

        tide = decision.get("tide")
        if isinstance(tide, dict) and tide.get("status") == "available":
            guidance.append(f"🌊 ଜୁଆର-ଭଟ୍ଟା: {tide.get('tide_state')} (ଜଳସ୍ତର: {tide.get('current_height_m')}m)")

    if not is_sim:
        if level == "low":
            guidance.append("💡 ପରାମର୍ଶ: ଉପକୂଳ କାର୍ଯ୍ୟକଳାପ, ନୌକାଚାଳନା ଏବଂ ମାଛ ଧରିବା ପାଇଁ ସମୁଦ୍ର ଅନୁକୂଳ ଅଛି।")
        elif level == "moderate":
            guidance.append("💡 ପରାମର୍ଶ: ସମୁଦ୍ରରେ କାର୍ଯ୍ୟକଳାପ କରିବା ସମୟରେ ସତର୍କତା ଅବଲମ୍ବନ କରନ୍ତୁ। ଛୋଟ ଡଙ୍ଗା ସତର୍କ ରହିବା ଉଚିତ୍।")
        elif level in {"high", "critical"}:
            guidance.append("⚠️ ଚେତାବନୀ: ସମୁଦ୍ରକୁ ଯାଆନ୍ତୁ ନାହିଁ। ପ୍ରବଳ ପବନ ଏବଂ ଉଚ୍ଚ ଲହଡ଼ି ସକ୍ରିୟ ଅଛି।")

    if isinstance(decision, dict) and decision.get("assessment"):
        guidance.append(f"📌 ନିଷ୍ପତ୍ତି ବିଶ୍ଲେଷଣ: {decision.get('assessment')}")

    limitations = []
    if incomplete:
        limitations.append("ଆବଶ୍ୟକ ତଥ୍ୟ ଏପର୍ଯ୍ୟନ୍ତ ସମ୍ପୂର୍ଣ୍ଣ ଭାବରେ ଉପଲବ୍ଧ ନାହିଁ।")
    if "pfz" in pending:
        limitations.append("PFZ ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ।")

    parts = [opening]
    if facts:
        parts.append(" ".join(facts))
    if guidance:
        parts.append(" ".join(guidance))
    if limitations:
        parts.append(" ".join(limitations))

    return "\n\n".join(parts)


def _bengali_answer(
    level: str,
    results: dict[str, Any],
    pending: list[str],
    incomplete: list[str],
    time_expression: str | None,
    location_name: str | None = None,
    decision: dict[str, Any] | None = None,
) -> str:
    status_map = {
        "low": "কম ঝুঁকি (অনুকূল অবস্থা)",
        "moderate": "মাঝারি ঝুঁকি (সতর্কতা প্রয়োজন)",
        "high": "উচ্চ ঝুঁকি (গুরুতর সতর্কতা)",
        "critical": "অত্যন্ত বিপজ্জনক",
        "unknown": "অজানা",
    }

    status = status_map.get(level, "অজানা")
    loc_suffix = f" [{location_name}]" if location_name else ""

    is_sim = isinstance(decision, dict) and bool(decision.get("scenario_simulation"))

    if is_sim:
        sim = decision["scenario_simulation"]
        opening = f"🧪 ORCA সামুদ্রিক দৃশ্যকল্প সিমুলেশন রিপোর্ট{loc_suffix}: {sim.get('scenario_summary')}"
    else:
        opening = (
            f"ORCA সামুদ্রিক ঝুঁকি মূল্যায়ন{loc_suffix}: {status}।"
            if not incomplete
            else f"ORCA নিরাপত্তা মূল্যায়ন{loc_suffix} সীমিত।"
        )

    facts = []
    for domain, label in (("ocean", "🌊 সমুদ্রের তথ্য"), ("weather", "🌤️ আবহাওয়ার তথ্য")):
        result = results.get(domain, {})
        if result.get("data_status") in {"live", "cached", "demo", "static"}:
            values = _facts(domain, result.get("observation") or {}, lang="bn")
            if values:
                facts.append(f"{label}: " + "; ".join(values) + "।")
        elif domain in results:
            facts.append(f"{label}: তথ্য উপলব্ধ নেই।")

    guidance = []
    if is_sim:
        sim = decision["scenario_simulation"]
        sim_msi = sim.get("simulated", {}).get("msi", {})
        guidance.append(f"🛡️ আনুমানিক সামুদ্রিক নিরাপত্তা সূচক (MSI): {sim_msi.get('score')}/100 ({sim_msi.get('tier_label')}), পরিবর্তন: {sim.get('msi_delta', 0):+d} পয়েন্ট।")
        vessels = sim.get("vessel_advisories", [])
        if vessels:
            guidance.append("নৌযান পরামর্শ: " + "; ".join(f"{v['category']}: {v['status']} ({v['advisory']})" for v in vessels))
        species = sim.get("species_impacts", [])
        disrupted = [s for s in species if s.get("severity") in {"high", "critical"}]
        if disrupted:
            guidance.append("মৎস্য সতর্কতা: " + "; ".join(f"{s['species'].split(' (')[0]}: {s['impact']} {s['catch_projection']}" for s in disrupted))
        port = sim.get("port_impact")
        if isinstance(port, dict):
            guidance.append(f"বন্দর পরিস্থিতি: {port.get('status')} - {port.get('advisory')}")
    elif isinstance(decision, dict):
        msi = decision.get("marine_safety_index")
        if isinstance(msi, dict) and msi.get("score") is not None:
            guidance.append(f"🛡️ সামুদ্রিক নিরাপত্তা সূচক (MSI): {msi['score']}/100 ({msi.get('tier_label', '')})")

        tide = decision.get("tide")
        if isinstance(tide, dict) and tide.get("status") == "available":
            guidance.append(f"🌊 জোয়ার-ভাটা: {tide.get('tide_state')} (জলস্তর: {tide.get('current_height_m')}m)")

    if not is_sim:
        if level == "low":
            guidance.append("💡 পরামর্শ: উপকূলীয় কাজকর্ম, নৌকা চলাচল এবং মাছ ধরার জন্য সমুদ্র অনুকূল রয়েছে।")
        elif level == "moderate":
            guidance.append("💡 পরামর্শ: সমুদ্রে কাজকর্ম করার সময় সতর্কতা অবলম্বন করুন। ছোট নৌকাগুলোকে সতর্ক থাকতে হবে।")
        elif level in {"high", "critical"}:
            guidance.append("⚠️ সতর্কতা: সমুদ্রে যাবেন না। প্রবল বাতাস এবং উঁচু ঢেউ সক্রিয় রয়েছে।")

    if isinstance(decision, dict) and decision.get("assessment"):
        guidance.append(f"📌 সিদ্ধান্ত বিশ্লেষণ: {decision.get('assessment')}")

    limitations = []
    if incomplete:
        limitations.append("প্রয়োজনীয় তথ্য এখনো পুরোপুরি উপলব্ধ নেই।")
    if "pfz" in pending:
        limitations.append("PFZ তথ্য উপলব্ধ নেই।")

    parts = [opening]
    if facts:
        parts.append(" ".join(facts))
    if guidance:
        parts.append(" ".join(guidance))
    if limitations:
        parts.append(" ".join(limitations))

    return "\n\n".join(parts)


def _konkani_answer(
    level: str,
    results: dict[str, Any],
    pending: list[str],
    incomplete: list[str],
    time_expression: str | None,
    location_name: str | None = None,
    decision: dict[str, Any] | None = None,
) -> str:
    status_map = {
        "low": "उणो धोको (अनुकूल स्थिती)",
        "moderate": "मध्यम धोको (सावधानता गरज)",
        "high": "चड धोको (गंभीर शिटकावणी)",
        "critical": "अतिशय धोकेदायक",
        "unknown": "अज्ञात",
    }

    status = status_map.get(level, "अज्ञात")
    loc_suffix = f" [{location_name}]" if location_name else ""

    is_sim = isinstance(decision, dict) and bool(decision.get("scenario_simulation"))

    if is_sim:
        sim = decision["scenario_simulation"]
        opening = f"🧪 ORCA दर्या स्थिती सिम्युलेशन अहवाल{loc_suffix}: {sim.get('scenario_summary')}"
    else:
        opening = (
            f"ORCA चो दर्या धोक्याचो अंदाज{loc_suffix}: {status}."
            if not incomplete
            else f"ORCA चो सुरक्षाय अंदाज{loc_suffix} मर्यादित आसा."
        )

    facts = []
    for domain, label in (("ocean", "🌊 दर्याची माहिती"), ("weather", "🌤️ हवामान माहिती")):
        result = results.get(domain, {})
        if result.get("data_status") in {"live", "cached", "demo", "static"}:
            values = _facts(domain, result.get("observation") or {}, lang="kok")
            if values:
                facts.append(f"{label}: " + "; ".join(values) + ".")
        elif domain in results:
            facts.append(f"{label}: माहिती उपलब्ध ना.")

    guidance = []
    if is_sim:
        sim = decision["scenario_simulation"]
        sim_msi = sim.get("simulated", {}).get("msi", {})
        guidance.append(f"🛡️ अंदाजित दर्या सुरक्षाय निर्देशांक (MSI): {sim_msi.get('score')}/100 ({sim_msi.get('tier_label')}), बदल: {sim.get('msi_delta', 0):+d} गुण.")
        vessels = sim.get("vessel_advisories", [])
        if vessels:
            guidance.append("व्हडीं सल्लो: " + "; ".join(f"{v['category']}: {v['status']} ({v['advisory']})" for v in vessels))
        species = sim.get("species_impacts", [])
        disrupted = [s for s in species if s.get("severity") in {"high", "critical"}]
        if disrupted:
            guidance.append("मासळी शिटकावणी: " + "; ".join(f"{s['species'].split(' (')[0]}: {s['impact']} {s['catch_projection']}" for s in disrupted))
        port = sim.get("port_impact")
        if isinstance(port, dict):
            guidance.append(f"बंदर स्थिती: {port.get('status')} - {port.get('advisory')}")
    elif isinstance(decision, dict):
        msi = decision.get("marine_safety_index")
        if isinstance(msi, dict) and msi.get("score") is not None:
            guidance.append(f"🛡️ दर्या सुरक्षाय निर्देशांक (MSI): {msi['score']}/100 ({msi.get('tier_label', '')})")

        tide = decision.get("tide")
        if isinstance(tide, dict) and tide.get("status") == "available":
            guidance.append(f"🌊 भरती-सुकेती: {tide.get('tide_state')} (उदकाची पातळी: {tide.get('current_height_m')}m)")

    if not is_sim:
        if level == "low":
            guidance.append("💡 सल्लो: तटीय काम, व्हडीं हांडप आनी मासळी मारपा खातीर दर्यो अनुकूल आसा.")
        elif level == "moderate":
            guidance.append("💡 सल्लो: दर्यांत काम करताना सावधानता बाळगा. ल्हान व्हड्यांनी शिटूक रावचें.")
        elif level in {"high", "critical"}:
            guidance.append("⚠️ शिटकावणी: दर्यांत वचूं नाकात. खर वारो आनी ऊंच ल्हाटो सक्रिय आसात.")

    if isinstance(decision, dict) and decision.get("assessment"):
        guidance.append(f"📌 निर्णय विश्लेषण: {decision.get('assessment')}")

    limitations = []
    if incomplete:
        limitations.append("गरजेची माहिती अजून पुरायपणान उपलब्ध ना.")
    if "pfz" in pending:
        limitations.append("PFZ माहिती उपलब्ध ना.")

    parts = [opening]
    if facts:
        parts.append(" ".join(facts))
    if guidance:
        parts.append(" ".join(guidance))
    if limitations:
        parts.append(" ".join(limitations))

    return "\n\n".join(parts)


def _tulu_answer(
    level: str,
    results: dict[str, Any],
    pending: list[str],
    incomplete: list[str],
    time_expression: str | None,
    location_name: str | None = None,
    decision: dict[str, Any] | None = None,
) -> str:
    status_map = {
        "low": "ಕಡಿಮೆ ಅಪಾಯ (ಎಡ್ಡೆ ಸ್ಥಿತಿ)",
        "moderate": "ಮಧ್ಯಮ ಅಪಾಯ (ಜಾಗ್ರತೆ ಅಗತ್ಯ)",
        "high": "ಹೆಚ್ಚು ಅಪಾಯ (ಎಚ್ಚರಿಕೆ)",
        "critical": "ಅತಿ ಅಪಾಯ",
        "unknown": "ಗೊತ್ತಿಜ್ಜಿ",
    }

    status = status_map.get(level, "ಗೊತ್ತಿಜ್ಜಿ")
    loc_suffix = f" [{location_name}]" if location_name else ""

    is_sim = isinstance(decision, dict) and bool(decision.get("scenario_simulation"))

    if is_sim:
        sim = decision["scenario_simulation"]
        opening = f"🧪 ORCA ಕಡಲ ಸ್ಥಿತಿ ಸಿಮ್ಯುಲೇಶನ್ ವರದಿ{loc_suffix}: {sim.get('scenario_summary')}"
    else:
        opening = (
            f"ORCA ಕಡಲ ಅಪಾಯದ ಅಂದಾಜಿ{loc_suffix}: {status}."
            if not incomplete
            else f"ORCA ರಕ್ಷಣೆದ ಅಂದಾಜಿ{loc_suffix} ಸೀಮಿತ ಉಂಡು."
        )

    facts = []
    for domain, label in (("ocean", "🌊 ಕಡಲ ಮಾಹಿತಿ"), ("weather", "🌤️ ವಾತಾವರಣ ಮಾಹಿತಿ")):
        result = results.get(domain, {})
        if result.get("data_status") in {"live", "cached", "demo", "static"}:
            values = _facts(domain, result.get("observation") or {}, lang="tcy")
            if values:
                facts.append(f"{label}: " + "; ".join(values) + ".")
        elif domain in results:
            facts.append(f"{label}: ಮಾಹಿತಿ ತಿಕ್‍ದಿಜ್ಜಿ.")

    guidance = []
    if is_sim:
        sim = decision["scenario_simulation"]
        sim_msi = sim.get("simulated", {}).get("msi", {})
        guidance.append(f"🛡️ ಅಂದಾಜು ಮಲ್ತಿನ ಕಡಲ ರಕ್ಷಣೆ ಸೂಚ್ಯಂಕ (MSI): {sim_msi.get('score')}/100 ({sim_msi.get('tier_label')}), ಬದಲಾವಣೆ: {sim.get('msi_delta', 0):+d} ಅಂಕ.")
        vessels = sim.get("vessel_advisories", [])
        if vessels:
            guidance.append("ಓಡೊದ ಸಲಹೆ: " + "; ".join(f"{v['category']}: {v['status']} ({v['advisory']})" for v in vessels))
        species = sim.get("species_impacts", [])
        disrupted = [s for s in species if s.get("severity") in {"high", "critical"}]
        if disrupted:
            guidance.append("ಮೀನ್ ಎಚ್ಚರಿಕೆ: " + "; ".join(f"{s['species'].split(' (')[0]}: {s['impact']} {s['catch_projection']}" for s in disrupted))
        port = sim.get("port_impact")
        if isinstance(port, dict):
            guidance.append(f"ಬಂದರು ಸ್ಥಿತಿ: {port.get('status')} - {port.get('advisory')}")
    elif isinstance(decision, dict):
        msi = decision.get("marine_safety_index")
        if isinstance(msi, dict) and msi.get("score") is not None:
            guidance.append(f"🛡️ ಕಡಲ ರಕ್ಷಣೆ ಸೂಚ್ಯಂಕ (MSI): {msi['score']}/100 ({msi.get('tier_label', '')})")

        tide = decision.get("tide")
        if isinstance(tide, dict) and tide.get("status") == "available":
            guidance.append(f"🌊 ಉಬ್ಬರ-ಇಳಿತ: {tide.get('tide_state')} (ಮಟ್ಟ: {tide.get('current_height_m')}m)")

    if not is_sim:
        if level == "low":
            guidance.append("💡 ಸಲಹೆ: ಕಡಲ ಕೆಲಸೊಲು, ಓಡೊಡು ಪೋಪಿನೆಕ್ ಬೊಕ್ಕ ಮೀನ್ ಪತ್ತುನೆಕ್ ಕಡಲ್ ಎಡ್ಡೆ ಉಂಡು.")
        elif level == "moderate":
            guidance.append("💡 ಸಲಹೆ: ಕಡಲ್‌ಡ್ ಕೆಲಸ ಮಲ್ಪುನಗ ಜಾಗ್ರತೆಡ್ ಉಪ್ಪೊಡು. ಎಲ್ಯ ಓಡೊಲು ಜಾಗ್ರತೆಡ್ ಉಪ್ಪೊಡು.")
        elif level in {"high", "critical"}:
            guidance.append("⚠️ ಎಚ್ಚರಿಕೆ: ಕಡಲ್‌ಗ್ ಪೋವೊಚಿ. ಬಿರುಸಿನ ಗಾಳಿ ಬೊಕ್ಕ ಎತ್ತರದ ಅಲೆ ಉಂಡು.")

    if isinstance(decision, dict) and decision.get("assessment"):
        guidance.append(f"📌 ತೀರ್ಮಾನದ ವಿಶ್ಲೇಷಣೆ: {decision.get('assessment')}")

    limitations = []
    if incomplete:
        limitations.append("ಅಗತ್ಯ ಮಾಹಿತಿ ಪೂರ್ತಿಯಾದ್ ತಿಕ್‍ದಿಜ್ಜಿ.")
    if "pfz" in pending:
        limitations.append("PFZ ಮಾಹಿತಿ ತಿಕ್‍ದಿಜ್ಜಿ.")

    parts = [opening]
    if facts:
        parts.append(" ".join(facts))
    if guidance:
        parts.append(" ".join(guidance))
    if limitations:
        parts.append(" ".join(limitations))

    return "\n\n".join(parts)


def _gujarati_answer(
    level: str,
    results: dict[str, Any],
    pending: list[str],
    incomplete: list[str],
    time_expression: str | None,
    location_name: str | None = None,
    decision: dict[str, Any] | None = None,
) -> str:
    status_map = {
        "low": "ઓછું જોખમ (સાનુકૂળ સ્થિતિ)",
        "moderate": "મધ્યમ જોખમ (સાવચેતી જરૂરી)",
        "high": "ઉચ્ચ જોખમ (ગંભીર ચેતવણી)",
        "critical": "અત્યંત જોખમી",
        "unknown": "અજ્ઞાત",
    }

    status = status_map.get(level, "અજ્ઞાત")
    loc_suffix = f" [{location_name}]" if location_name else ""

    is_sim = isinstance(decision, dict) and bool(decision.get("scenario_simulation"))

    if is_sim:
        sim = decision["scenario_simulation"]
        opening = f"🧪 ORCA દરિયાઈ પરિસ્થિતિ સિમ્યુલેશન અહેવાલ{loc_suffix}: {sim.get('scenario_summary')}"
    else:
        opening = (
            f"ORCA નું સંયુક્ત દરિયાઈ જોખમ આકારણી{loc_suffix}: {status}."
            if not incomplete
            else f"ORCA નું સુરક્ષા આકારણી{loc_suffix} મર્યાદિત છે."
        )

    facts = []
    for domain, label in (("ocean", "🌊 દરિયાઈ વિગતો"), ("weather", "🌤️ હવામાન વિગતો")):
        result = results.get(domain, {})
        if result.get("data_status") in {"live", "cached", "demo", "static"}:
            values = _facts(domain, result.get("observation") or {}, lang="gu")
            if values:
                facts.append(f"{label}: " + "; ".join(values) + ".")
        elif domain in results:
            facts.append(f"{label}: ડેટા ઉપલબ્ધ નથી.")

    guidance = []
    if is_sim:
        sim = decision["scenario_simulation"]
        sim_msi = sim.get("simulated", {}).get("msi", {})
        guidance.append(f"🛡️ અનુમાનિત દરિયાઈ સુરક્ષા સૂચકાંક (MSI): {sim_msi.get('score')}/100 ({sim_msi.get('tier_label')}), ફેરફાર: {sim.get('msi_delta', 0):+d} પોઈન્ટ.")
        vessels = sim.get("vessel_advisories", [])
        if vessels:
            guidance.append("બોટ સલાહ: " + "; ".join(f"{v['category']}: {v['status']} ({v['advisory']})" for v in vessels))
        species = sim.get("species_impacts", [])
        disrupted = [s for s in species if s.get("severity") in {"high", "critical"}]
        if disrupted:
            guidance.append("માછીમારી ચેતવણી: " + "; ".join(f"{s['species'].split(' (')[0]}: {s['impact']} {s['catch_projection']}" for s in disrupted))
        port = sim.get("port_impact")
        if isinstance(port, dict):
            guidance.append(f"બંદર સ્થિતિ: {port.get('status')} - {port.get('advisory')}")
    elif isinstance(decision, dict):
        msi = decision.get("marine_safety_index")
        if isinstance(msi, dict) and msi.get("score") is not None:
            guidance.append(f"🛡️ દરિયાઈ સુરક્ષા સૂચકાંક (MSI): {msi['score']}/100 ({msi.get('tier_label', '')})")

        tide = decision.get("tide")
        if isinstance(tide, dict) and tide.get("status") == "available":
            guidance.append(f"🌊 ભરતી-ઓટ: {tide.get('tide_state')} (જળ સ્તર: {tide.get('current_height_m')}m)")

    if not is_sim:
        if level == "low":
            guidance.append("💡 સલાહ: દરિયાકાંઠાની પ્રવૃત્તિઓ, નૌકાયન અને માછીમારી માટે દરિયો સાનુકૂળ છે.")
        elif level == "moderate":
            guidance.append("💡 સલાહ: દરિયામાં પ્રવૃત્તિઓ કરતી વખતે સાવચેતી રાખો. નાની હોડીઓએ સાવધ રહેવું.")
        elif level in {"high", "critical"}:
            guidance.append("⚠️ ચેતવણી: દરિયામાં જવાનું ટાળો. ભારે પવન અને ઊંચા મોજાં સક્રિય છે.")

    if isinstance(decision, dict) and decision.get("assessment"):
        guidance.append(f"📌 નિર્ણય વિશ્લેષણ: {decision.get('assessment')}")

    limitations = []
    if incomplete:
        limitations.append("જરૂરી ડેટા હજુ પૂરેપૂરો ઉપલબ્ધ નથી.")
    if "pfz" in pending:
        limitations.append("PFZ ડેટા ઉપલબ્ધ નથી.")

    parts = [opening]
    if facts:
        parts.append(" ".join(facts))
    if guidance:
        parts.append(" ".join(guidance))
    if limitations:
        parts.append(" ".join(limitations))

    return "\n\n".join(parts)


def _marathi_answer(
    level: str,
    results: dict[str, Any],
    pending: list[str],
    incomplete: list[str],
    time_expression: str | None,
    location_name: str | None = None,
    decision: dict[str, Any] | None = None,
) -> str:
    status_map = {
        "low": "कमी धोका (अनुकूल स्थिती)",
        "moderate": "मध्यम धोका (दक्षता आवश्यक)",
        "high": "उच्च धोका (गंभीर इशारा)",
        "critical": "अत्यंत धोकादायक",
        "unknown": "माहिती नाही",
    }

    status = status_map.get(level, "माहिती नाही")
    loc_suffix = f" [{location_name}]" if location_name else ""

    is_sim = isinstance(decision, dict) and bool(decision.get("scenario_simulation"))

    if is_sim:
        sim = decision["scenario_simulation"]
        opening = f"🧪 ORCA सागरी परिदृश्य सिम्युलेशन अहवाल{loc_suffix}: {sim.get('scenario_summary')}"
    else:
        opening = (
            f"ORCA ची एकत्रित समुद्री धोक्याची मूल्यमापन{loc_suffix}: {status}."
            if not incomplete
            else f"ORCA चे सुरक्षेचे मूल्यमापन{loc_suffix} मर्यादित आहे."
        )

    facts = []
    for domain, label in (("ocean", "🌊 समुद्री माहिती"), ("weather", "🌤️ हवामान माहिती")):
        result = results.get(domain, {})
        if result.get("data_status") in {"live", "cached", "demo", "static"}:
            values = _facts(domain, result.get("observation") or {}, lang="mr")
            if values:
                facts.append(f"{label}: " + "; ".join(values) + ".")
        elif domain in results:
            facts.append(f"{label}: माहिती उपलब्ध नाही.")

    guidance = []
    if is_sim:
        sim = decision["scenario_simulation"]
        sim_msi = sim.get("simulated", {}).get("msi", {})
        guidance.append(f"🛡️ अंदाजित सागरी सुरक्षा निर्देशांक (MSI): {sim_msi.get('score')}/100 ({sim_msi.get('tier_label')}), बदल: {sim.get('msi_delta', 0):+d} गुण.")
        vessels = sim.get("vessel_advisories", [])
        if vessels:
            guidance.append("बोट सल्ला: " + "; ".join(f"{v['category']}: {v['status']} ({v['advisory']})" for v in vessels))
        species = sim.get("species_impacts", [])
        disrupted = [s for s in species if s.get("severity") in {"high", "critical"}]
        if disrupted:
            guidance.append("मासेमारी इशारा: " + "; ".join(f"{s['species'].split(' (')[0]}: {s['impact']} {s['catch_projection']}" for s in disrupted))
        port = sim.get("port_impact")
        if isinstance(port, dict):
            guidance.append(f"বন্দর स्थिती: {port.get('status')} - {port.get('advisory')}")
    elif isinstance(decision, dict):
        msi = decision.get("marine_safety_index")
        if isinstance(msi, dict) and msi.get("score") is not None:
            guidance.append(f"🛡️ सागरी सुरक्षा निर्देशांक (MSI): {msi['score']}/100 ({msi.get('tier_label', '')})")

        tide = decision.get("tide")
        if isinstance(tide, dict) and tide.get("status") == "available":
            guidance.append(f"🌊 भरती-ओहोटी: {tide.get('tide_state')} (पाण्याची पातळी: {tide.get('current_height_m')}m)")

    if not is_sim:
        if level == "low":
            guidance.append("💡 सल्ला: किनारी कामे, नौकायन आणि मासेमारीसाठी समुद्र अनुकूल आहे.")
        elif level == "moderate":
            guidance.append("💡 सल्ला: समुद्रात काम करताना दक्षता बाळगा. लहान बोटींनी सावध राहावे.")
        elif level in {"high", "critical"}:
            guidance.append("⚠️ इशारा: समुद्रात जाणे टाळा. वेगवान वारा आणि उंच लाटा सक्रिय आहेत.")

    if isinstance(decision, dict) and decision.get("assessment"):
        guidance.append(f"📌 निर्णय विश्लेषण: {decision.get('assessment')}")

    limitations = []
    if incomplete:
        limitations.append("आवश्यक माहिती पूर्णपणे उपलब्ध नाही.")
    if "pfz" in pending:
        limitations.append("PFZ माहिती उपलब्ध नाही.")

    parts = [opening]
    if facts:
        parts.append(" ".join(facts))
    if guidance:
        parts.append(" ".join(guidance))
    if limitations:
        parts.append(" ".join(limitations))

    return "\n\n".join(parts)


def _malayalam_answer(
    level: str,
    results: dict[str, Any],
    pending: list[str],
    incomplete: list[str],
    time_expression: str | None,
    location_name: str | None = None,
    decision: dict[str, Any] | None = None,
) -> str:
    status_map = {
        "low": "കുറഞ്ഞ അപകടസാധ്യത (അനുകൂലാവസ്ഥ)",
        "moderate": "ഇടത്തരം അപകടസാധ്യത (ജാഗ്രത പാലിക്കുക)",
        "high": "ഉയർന്ന അപകടസാധ്യത (ഗുരുതര മുന്നറിയിപ്പ്)",
        "critical": "അതീവ ഗുരുതരമായ അപകടാവസ്ഥ",
        "unknown": "അജ്ഞാതം",
    }

    status = status_map.get(level, "അജ്ഞാതം")
    loc_suffix = f" [{location_name}]" if location_name else ""

    is_sim = isinstance(decision, dict) and bool(decision.get("scenario_simulation"))

    if is_sim:
        sim = decision["scenario_simulation"]
        opening = f"🧪 ORCA സമുദ്ര സിമുലേഷൻ റിപ്പോർട്ട്{loc_suffix}: {sim.get('scenario_summary')}"
    else:
        opening = (
            f"ORCA സമുദ്ര സുരക്ഷാ വിലയിരുത്തൽ{loc_suffix}: {status}."
            if not incomplete
            else f"ORCA സുരക്ഷാ വിലയിരുത്തൽ{loc_suffix} പരിമിതമാണ്."
        )

    facts = []
    for domain, label in (("ocean", "🌊 സമുദ്ര വിവരങ്ങൾ"), ("weather", "🌤️ കാലാവസ്ഥാ വിവരങ്ങൾ")):
        result = results.get(domain, {})
        if result.get("data_status") in {"live", "cached", "demo", "static"}:
            values = _facts(domain, result.get("observation") or {}, lang="ml")
            if values:
                facts.append(f"{label}: " + "; ".join(values) + ".")
        elif domain in results:
            facts.append(f"{label}: വിവരങ്ങൾ ലഭ്യമല്ല.")

    guidance = []
    if is_sim:
        sim = decision["scenario_simulation"]
        sim_msi = sim.get("simulated", {}).get("msi", {})
        guidance.append(f"🛡️ പ്രവചിക്കപ്പെട്ട സമുദ്ര സുരക്ഷാ സൂചിക (MSI): {sim_msi.get('score')}/100 ({sim_msi.get('tier_label')}), മാറ്റം: {sim.get('msi_delta', 0):+d} പോയിന്റ്.")
        vessels = sim.get("vessel_advisories", [])
        if vessels:
            guidance.append("ബോട്ട് നിർദ്ദേശം: " + "; ".join(f"{v['category']}: {v['status']} ({v['advisory']})" for v in vessels))
        species = sim.get("species_impacts", [])
        disrupted = [s for s in species if s.get("severity") in {"high", "critical"}]
        if disrupted:
            guidance.append("മത്സ്യ ലഭ്യത മുന്നറിയിപ്പ്: " + "; ".join(f"{s['species'].split(' (')[0]}: {s['impact']} {s['catch_projection']}" for s in disrupted))
        port = sim.get("port_impact")
        if isinstance(port, dict):
            guidance.append(f"തുറമുഖ അവസ്ഥ: {port.get('status')} - {port.get('advisory')}")
    elif isinstance(decision, dict):
        msi = decision.get("marine_safety_index")
        if isinstance(msi, dict) and msi.get("score") is not None:
            guidance.append(f"🛡️ സമുദ്ര സുരക്ഷാ സൂചിക (MSI): {msi['score']}/100 ({msi.get('tier_label', '')})")

        tide = decision.get("tide")
        if isinstance(tide, dict) and tide.get("status") == "available":
            guidance.append(f"🌊 വേലിയേറ്റം/വേലിയിറക്കം: {tide.get('tide_state')} (ജലനിരപ്പ്: {tide.get('current_height_m')}m)")

    if not is_sim:
        if level == "low":
            guidance.append("💡 നിർദ്ദേശം: തീരദേശ പ്രവർത്തനങ്ങൾക്കും മീൻപിടുത്തത്തിനും സമുദ്രം അനുകൂലമാണ്.")
        elif level == "moderate":
            guidance.append("💡 നിർദ്ദേശം: കടലിൽ പ്രവർത്തിക്കുമ്പോൾ ജാഗ്രത പാലിക്കുക. ചെറിയ വള്ളങ്ങൾ ശ്രദ്ധിക്കുക.")
        elif level in {"high", "critical"}:
            guidance.append("⚠️ മുന്നറിയിപ്പ്: കടലിൽ പോകരുത്. ശക്തമായ കാറ്റും ഉയർന്ന തിരമാലകളും നിലനിൽക്കുന്നു.")

    if isinstance(decision, dict) and decision.get("assessment"):
        guidance.append(f"📌 വിശകലനം: {decision.get('assessment')}")

    limitations = []
    if incomplete:
        limitations.append("ആവശ്യമായ വിവരങ്ങൾ പൂർണ്ണമായി ലഭ്യമല്ല.")
    if "pfz" in pending:
        limitations.append("PFZ വിവരങ്ങൾ ലഭ്യമല്ല.")

    parts = [opening]
    if facts:
        parts.append(" ".join(facts))
    if guidance:
        parts.append(" ".join(guidance))
    if limitations:
        parts.append(" ".join(limitations))

    return "\n\n".join(parts)


def _kannada_answer(
    level: str,
    results: dict[str, Any],
    pending: list[str],
    incomplete: list[str],
    time_expression: str | None,
    location_name: str | None = None,
    decision: dict[str, Any] | None = None,
) -> str:
    status_map = {
        "low": "ಕಡಿಮೆ ಅಪಾಯ (ಅನುಕೂಲಕರ ಸ್ಥಿತಿ)",
        "moderate": "ಮಧ್ಯಮ ಅಪಾಯ (ಎಚ್ಚರಿಕೆ ಅಗತ್ಯ)",
        "high": "ಹೆಚ್ಚಿನ ಅಪಾಯ (ಗಂಭೀರ ಎಚ್ಚರಿಕೆ)",
        "critical": "ಅತ್ಯಂತ ಅಪಾಯಕಾರಿ",
        "unknown": "ತಿಳಿದಿಲ್ಲ",
    }

    status = status_map.get(level, "ತಿಳಿದಿಲ್ಲ")
    loc_suffix = f" [{location_name}]" if location_name else ""

    is_sim = isinstance(decision, dict) and bool(decision.get("scenario_simulation"))

    if is_sim:
        sim = decision["scenario_simulation"]
        opening = f"🧪 ORCA ಸಾಗರ ಸನ್ನಿವೇಶ ಸಿಮ್ಯುಲೇಶನ್ ವರದಿ{loc_suffix}: {sim.get('scenario_summary')}"
    else:
        opening = (
            f"ORCA ಸಾಗರ ಅಪಾಯದ ಮೌಲ್ಯಮಾಪನ{loc_suffix}: {status}."
            if not incomplete
            else f"ORCA ಸುರಕ್ಷತಾ ಮೌಲ್ಯಮಾಪನ{loc_suffix} ಸೀಮಿತವಾಗಿದೆ."
        )

    facts = []
    for domain, label in (("ocean", "🌊 ಸಾಗರ ಮಾಹಿತಿ"), ("weather", "🌤️ ಹವಾಮಾನ ಮಾಹಿತಿ")):
        result = results.get(domain, {})
        if result.get("data_status") in {"live", "cached", "demo", "static"}:
            values = _facts(domain, result.get("observation") or {}, lang="kn")
            if values:
                facts.append(f"{label}: " + "; ".join(values) + ".")
        elif domain in results:
            facts.append(f"{label}: ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ.")

    guidance = []
    if is_sim:
        sim = decision["scenario_simulation"]
        sim_msi = sim.get("simulated", {}).get("msi", {})
        guidance.append(f"🛡️ ಅಂದಾಜು ಸಾಗರ ಸುರಕ್ಷತಾ ಸೂಚ್ಯಂಕ (MSI): {sim_msi.get('score')}/100 ({sim_msi.get('tier_label')}), ಬದಲಾವಣೆ: {sim.get('msi_delta', 0):+d} ಅಂಕಗಳು.")
        vessels = sim.get("vessel_advisories", [])
        if vessels:
            guidance.append("ದೋಣಿ ಸಲಹೆ: " + "; ".join(f"{v['category']}: {v['status']} ({v['advisory']})" for v in vessels))
        species = sim.get("species_impacts", [])
        disrupted = [s for s in species if s.get("severity") in {"high", "critical"}]
        if disrupted:
            guidance.append("ಮೀನುಗಾರಿಕೆ ಎಚ್ಚರಿಕೆ: " + "; ".join(f"{s['species'].split(' (')[0]}: {s['impact']} {s['catch_projection']}" for s in disrupted))
        port = sim.get("port_impact")
        if isinstance(port, dict):
            guidance.append(f"ಬಂದರು ಸ್ಥಿತಿ: {port.get('status')} - {port.get('advisory')}")
    elif isinstance(decision, dict):
        msi = decision.get("marine_safety_index")
        if isinstance(msi, dict) and msi.get("score") is not None:
            guidance.append(f"🛡️ ಸಾಗರ ಸುರಕ್ಷತಾ ಸೂಚ್ಯಂಕ (MSI): {msi['score']}/100 ({msi.get('tier_label', '')})")

        tide = decision.get("tide")
        if isinstance(tide, dict) and tide.get("status") == "available":
            guidance.append(f"🌊 ಉಬ್ಬರ-ಇಳಿತ: {tide.get('tide_state')} (ನೀರಿನ ಮಟ್ಟ: {tide.get('current_height_m')}m)")

    if not is_sim:
        if level == "low":
            guidance.append("💡 ಸಲಹೆ: ಕರಾವಳಿ ಚಟುವಟಿಕೆಗಳು, ಬೋಟಿಂಗ್ ಮತ್ತು ಮೀನುಗಾರಿಕೆಗೆ ಸಾಗರ ಅನುಕೂಲಕರವಾಗಿದೆ.")
        elif level == "moderate":
            guidance.append("💡 ಸಲಹೆ: ಸಮುದ್ರದಲ್ಲಿ ಕಾರ್ಯನಿರ್ವಹಿಸುವಾಗ ಜಾಗರೂಕರಾಗಿರಿ. ಸಣ್ಣ ದೋಣಿಗಳು ಎಚ್ಚರಿಕೆ ವಹಿಸಬೇಕು.")
        elif level in {"high", "critical"}:
            guidance.append("⚠️ ಎಚ್ಚರಿಕೆ: ಸಮುದ್ರಕ್ಕೆ ಹೋಗಬೇಡಿ. ಬಲವಾದ ಗಾಳಿ ಮತ್ತು ಎತ್ತರದ ಅಲೆಗಳು ಸಕ್ರಿಯವಾಗಿವೆ.")

    if isinstance(decision, dict) and decision.get("assessment"):
        guidance.append(f"📌 ವಿಶ್ಲೇಷಣೆ: {decision.get('assessment')}")

    limitations = []
    if incomplete:
        limitations.append("ಅಗತ್ಯ ಮಾಹಿತಿ ಇನ್ನೂ ಸಂಪೂರ್ಣವಾಗಿ ಲಭ್ಯವಿಲ್ಲ.")
    if "pfz" in pending:
        limitations.append("PFZ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ.")

    parts = [opening]
    if facts:
        parts.append(" ".join(facts))
    if guidance:
        parts.append(" ".join(guidance))
    if limitations:
        parts.append(" ".join(limitations))

    return "\n\n".join(parts)


