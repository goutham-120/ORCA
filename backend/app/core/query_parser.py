"""Small, deterministic query normalization used before agent planning."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any
import re


@dataclass(frozen=True)
class ParsedQuery:
    original: str
    normalized: str
    intent: str
    requested_domains: list[str]
    requested_location: str | None = None
    time_expression: str | None = None
    decision_type: str | None = None
    perturbations: dict[str, Any] | None = None


class QueryParser:
    _intent_terms = {
        "simulation": ("what if", "simulate", "simulation", "if sst", "if wind", "if wave", "scenario", "hypothetical", "what happens if", "increases by", "rises by"),
        "route": ("route", "navigate", "voyage", "path", "safest route", "waypoint"),
        "safety": ("safe", "safety", "risk", "safe to venture"),
        "weather": ("weather", "wind", "rain", "storm", "temperature", "forecast", "lightning"),
        "ocean": ("ocean", "marine", "wave", "current", "sea", "swell", "tide", "high tide", "low tide", "currents"),
        "map": ("map", "layer", "area", "zone", "location", "distance", "coordinates", "boundary", "coastal"),
        "gis": ("restricted", "hazard zone", "spatial", "geofence", "mpa", "protected area"),
        "pfz": ("pfz", "fishing zone", "potential fishing zone", "chlorophyll"),
        "hazard": ("cyclone", "hurricane", "typhoon"),
        "anomaly": ("decline", "declined", "productivity", "catch drop", "low catch", "why has fish", "why fish", "heatwave", "hypoxia", "algal bloom", "upwelling"),
    }

    _hindi_terms = {
        "simulation": ("क्या होगा अगर", "यदि", "तापमान बढ़े", "हवा तेज", "सिमुलेशन"),
        "weather": ("मौसम", "हवा", "बारिश", "तूफान", "बिजली"),
        "ocean": ("समुद्र", "समुद्री", "लहर", "लहरें", "ज्वार", "भाटा"),
        "safety": ("सुरक्षित", "सुरक्षा", "जोखिम", "खतरा"),
        "gis": ("प्रतिबंधित", "क्षेत्र", "निकट", "पास"),
        "pfz": ("मछली", "मछली पकड़", "मत्स्य क्षेत्र"),
        "anomaly": ("गिरावट", "उत्पादन में गिरावट", "मछली कम", "कारण"),
    }

    _telugu_terms = {
        "simulation": ("ఒకవేళ", "ఏమి జరుగుతుంది", "ఉష్ణోగ్రత పెరిగితే", "గాలి పెరిగితే", "సిమ్యులేషన్"),
        "weather": ("వాతావరణం", "గాలి", "వర్షం", "తుఫాను", "ఉష్ణోగ్రత", "మెరుపులు"),
        "ocean": ("సముద్రం", "సముద్ర", "సముద్రపు", "అలలు", "అలల", "కెరటాలు", "కెరటం", "తరంగాలు", "పోటు", "పాటు", "టైడ్"),
        "safety": ("సురక్షితం", "సురక్షితమేనా", "సురక్షితమైన", "భద్రత", "రక్షణ", "ప్రమాదం", "హాని"),
        "gis": ("నిషిద్ధ", "ప్రాంతం", "సమీపంలో", "చేరువలో", "దగ్గర", "పరిధి"),
        "pfz": ("చేపలు", "చేపల", "చేపల వేట", "మత్స్య", "వేట"),
        "anomaly": ("తగ్గింది", "క్షీణించింది", "ఉత్పత్తి తగ్గడం", "కారణం"),
    }

    _tamil_terms = {
        "simulation": ("ஒருவேளை", "என்ன நடக்கும்", "வெப்பநிலை உயர்ந்தால்", "காற்று அதிகரித்தால்", "உருவகப்படுத்து"),
        "weather": ("வானிலை", "காற்று", "மழை", "புயல்", "வெப்பநிலை", "மின்னல்"),
        "ocean": ("கடல்", "அலைகள்", "அலை", "ஓட்டம்", "ஓதம்", "அலை ஏற்றம்", "அலை இறக்கம்"),
        "safety": ("பாதுகாப்பு", "பாதுகாப்பான", "ஆபத்து"),
        "gis": ("தடுக்கப்பட்ட", "பகுதி", "அருகில்"),
        "pfz": ("மீன்", "மீன்பிடி", "மீன்பிடித்தல்"),
        "anomaly": ("குறைந்தது", "உற்பத்தி குறைவு", "காரணம்"),
    }

    def parse(self, query: str) -> ParsedQuery:
        normalized = " ".join(query.strip().split())
        lowered = normalized.lower()
        matches = [name for name, terms in self._intent_terms.items() if any(term in lowered for term in terms)]
        for lang_terms in (self._hindi_terms, self._telugu_terms, self._tamil_terms):
            matches.extend(name for name, terms in lang_terms.items() if any(term in normalized for term in terms) and name not in matches)

        is_simulation = "simulation" in matches or any(term in lowered for term in ("what if", "what happens if", "simulate", "simulation", "scenario"))
        explicit_pfz = "pfz" in matches or any(term in lowered for term in ("fishing zone", "potential fishing zone", "potential fishing zones"))
        is_anomaly = "anomaly" in matches or any(term in lowered for term in ("productivity declined", "why has fish", "catch drop", "productivity drop", "fish decline"))
        fishing = (any(term in lowered for term in ("fish", "fishing")) or explicit_pfz) and not is_anomaly and not is_simulation
        safety = "safety" in matches and not is_anomaly and not is_simulation

        perturbations = None
        if is_simulation:
            decision_type = "simulation"
            perturbations = self._extract_perturbations(lowered)
        elif is_anomaly:
            decision_type = "anomaly"
        elif "route" in matches:
            decision_type = "route"
        elif explicit_pfz and not safety:
            decision_type = "pfz"
        elif fishing:
            decision_type = "fishing"
        elif safety:
            decision_type = "safety"
        elif "hazard" in matches:
            decision_type = "hazard"
        else:
            decision_type = None

        if decision_type in {"fishing", "safety", "simulation"}:
            matches.extend(name for name in ("ocean", "weather") if name not in matches)

        # Fishing suitability needs PFZ evidence as well as conditions.
        if decision_type == "fishing" and "pfz" not in matches:
            matches.append("pfz")

        if explicit_pfz and not is_anomaly and not is_simulation:
            matches = [name for name in matches if name != "map"]

        if decision_type in {"safety", "fishing"} and any(term in lowered for term in ("zone", "restricted", "hazard area", "geofence")):
            matches.append("gis") if "gis" not in matches else None

        intent = matches[0] if matches else "general"
        valid_agent_domains = {"ocean", "weather", "gis", "pfz"}
        domains = sorted({("gis" if match in {"route", "map", "gis", "hazard"} else match) for match in matches if ("gis" if match in {"route", "map", "gis", "hazard"} else match) in valid_agent_domains})
        location = self._location_mention(normalized)
        return ParsedQuery(
            original=query,
            normalized=normalized,
            intent=intent,
            requested_domains=domains,
            requested_location=location,
            time_expression=self._time_expression(lowered, normalized),
            decision_type=decision_type,
            perturbations=perturbations,
        )

    @classmethod
    def _extract_perturbations(cls, lowered: str) -> dict[str, Any]:
        p: dict[str, Any] = {}
        # SST: e.g. "sst changes by -2°c", "sst rises by 1.5°c", "temp drops by 2 c", "water rises 2c"
        sst_match = re.search(r"(?:sst|temperature|temp|water)\s+(?:rises?|increases?|drops?|decreases?|falls?|cools?|warms?|changes?|changes by|rises by|increases by|drops by|decreases by)?\s*(?:by\s+)?([+-]?[0-9.]+)\s*(?:°?c|deg)", lowered)
        if sst_match:
            val = float(sst_match.group(1))
            if any(w in lowered[:sst_match.end()] for w in ("drop", "decrease", "fall", "cool")) and val > 0:
                val = -val
            p["delta_sst_c"] = val
        else:
            signed_sst = re.search(r"([+-][0-9.]+)\s*(?:°?c|deg)", lowered)
            if signed_sst:
                p["delta_sst_c"] = float(signed_sst.group(1))
            elif "+1.5" in lowered or "1.5°c" in lowered or "1.5 c" in lowered:
                p["delta_sst_c"] = 1.5
            elif "+2" in lowered or "2°c" in lowered or "2 c" in lowered:
                p["delta_sst_c"] = 2.0
            elif "-2" in lowered or "-2°c" in lowered:
                p["delta_sst_c"] = -2.0

        # Wind: e.g. "wind speed reaches 30 knots", "wind 35 kts", "20 m/s", "wind increases by 5 knots"
        wind_delta_match = re.search(r"(?:wind|winds)\s+(?:rises?|increases?|drops?|decreases?)\s+(?:by\s+)?([+-]?[0-9.]+)\s*(knots?|kts?|m/s|mps)", lowered)
        if wind_delta_match:
            val = float(wind_delta_match.group(1))
            unit = wind_delta_match.group(2)
            if "knot" in unit or "kt" in unit:
                p["delta_wind_mps"] = round(val * 0.514444, 2)
            else:
                p["delta_wind_mps"] = val
        else:
            wind_match = re.search(r"(?:wind|winds)(?:[^\d+-]+)?\s*([0-9.]+)\s*(knots?|kts?|m/s|mps)", lowered)
            if wind_match:
                val = float(wind_match.group(1))
                unit = wind_match.group(2)
                if "knot" in unit or "kt" in unit:
                    p["target_wind_mps"] = round(val * 0.514444, 2)
                else:
                    p["target_wind_mps"] = val
            elif "doubles" in lowered or "double" in lowered:
                p["wind_multiplier"] = 2.0

        # Waves: e.g. "waves increase by 0.2m", "waves 3.5m", "wave height reaches 3 meters"
        wave_delta_match = re.search(r"(?:waves?|swell)\s+(?:rises?|increases?|drops?|decreases?|grows?)\s+(?:by\s+)?([+-]?[0-9.]+)\s*(?:m|meters?)", lowered)
        if wave_delta_match:
            p["delta_wave_m"] = float(wave_delta_match.group(1))
        else:
            wave_match = re.search(r"(?:waves?|swell)(?:[^\d+-]+)?\s*([0-9.]+)\s*(?:m|meters?)", lowered)
            if wave_match:
                pre_text = lowered[max(0, wave_match.start() - 20):wave_match.start()]
                if any(w in pre_text for w in ("increase", "rise", "grow", "delta", "change")):
                    p["delta_wave_m"] = float(wave_match.group(1))
                else:
                    p["target_wave_m"] = float(wave_match.group(1))
            elif "+2m" in lowered or "+2.5m" in lowered:
                p["delta_wave_m"] = 2.5

        # Conditions
        if "cyclone" in lowered or "cyclonic" in lowered:
            p["storm_condition"] = "cyclone"
        elif "squall" in lowered or "thunderstorm" in lowered:
            p["storm_condition"] = "thunderstorm"

        return p

    @staticmethod
    def _location_mention(query: str) -> str | None:
        match = re.search(r"\b(?:near|at|around|off|in|for)\s+([A-Za-z][A-Za-z .'-]{1,60}?)(?=\s+(?:today|tomorrow|tonight|this|next|at|for|and|with|if|when|under|assuming)\b|[?.!,]|$)", query, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        match_indic = re.search(r"([A-Za-z\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF][A-Za-z\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF .'-]{1,60}?)\s+(?:के\s+पास|दग्गर|దగ్గర|అరుగిల్|அருகில்)(?:\s+|[?.!,]|$)", query)
        if match_indic:
            raw_loc = match_indic.group(1).strip()
            for prefix in ("क्या आज", "क्या कल", "क्या", "आज", "कल", "ఈ రోజు", "ఈరోజు", "నేడు", "రేపు", "இன்று", "நாளை"):
                if raw_loc.startswith(prefix):
                    raw_loc = raw_loc[len(prefix):].strip()
            return raw_loc if raw_loc else None
        return None

    @staticmethod
    def _time_expression(lowered: str, original: str) -> str | None:
        match = re.search(r"\b(today|tomorrow(?:\s+(?:morning|afternoon|evening|night))?|tonight|this weekend|next week)\b", lowered)
        if match:
            return match.group(0)
        for expr in ("आज", "कल", "ఈ రోజు", "నేడు", "రేపు", "ఈ రాత్రి", "இன்று", "நாளை", "இன்று இரவு"):
            if expr in original:
                return expr
        date = re.search(r"\b\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?\b", original)
        return date.group(0) if date else None
