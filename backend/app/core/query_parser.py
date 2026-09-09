"""Small, deterministic query normalization used before agent planning."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ParsedQuery:
    original: str
    normalized: str
    intent: str
    requested_domains: list[str]
    requested_location: str | None = None
    time_expression: str | None = None
    decision_type: str | None = None


class QueryParser:
    _intent_terms = {
        "route": ("route", "navigate", "voyage", "path"),
        "safety": ("safe", "safety", "risk"),
        "weather": ("weather", "wind", "rain", "storm", "temperature", "forecast"),
        "ocean": ("ocean", "marine", "wave", "current", "sea", "swell", "tide"),
        "map": ("map", "layer", "area", "zone", "location", "distance", "coordinates", "boundary", "coastal"),
        "gis": ("restricted", "hazard zone", "spatial", "geofence"),
        "pfz": ("pfz", "fishing zone"),
        "hazard": ("cyclone", "hurricane", "typhoon"),
    }

    _hindi_terms = {
        "weather": ("मौसम", "हवा", "बारिश", "तूफान"),
        "ocean": ("समुद्र", "समुद्री", "लहर", "लहरें", "ज्वार"),
        "safety": ("सुरक्षित", "सुरक्षा", "जोखिम", "खतरा"),
        "gis": ("प्रतिबंधित", "क्षेत्र", "निकट", "पास"),
        "pfz": ("मछली", "मछली पकड़"),
    }

    def parse(self, query: str) -> ParsedQuery:
        normalized = " ".join(query.strip().split())
        lowered = normalized.lower()
        matches = [name for name, terms in self._intent_terms.items() if any(term in lowered for term in terms)]
        matches.extend(name for name, terms in self._hindi_terms.items() if any(term in normalized for term in terms) and name not in matches)
        explicit_pfz = "pfz" in matches or any(term in lowered for term in ("fishing zone", "potential fishing zone", "potential fishing zones"))
        fishing = any(term in lowered for term in ("fish", "fishing")) or explicit_pfz
        safety = "safety" in matches
        decision_type = "route" if "route" in matches else "pfz" if explicit_pfz and not safety else "fishing" if fishing else "safety" if safety else "hazard" if "hazard" in matches else None
        if decision_type in {"fishing", "safety"}:
            matches.extend(name for name in ("ocean", "weather") if name not in matches)
        if explicit_pfz:
            matches = [name for name in matches if name != "map"]
        # A place qualifier such as "near Visakhapatnam" is location context,
        # not a request for spatial analysis. GIS is selected only for explicit
        # spatial work or when the caller supplies a GIS-specific request.
        if decision_type in {"safety", "fishing"} and any(term in lowered for term in ("zone", "restricted", "hazard area", "geofence")):
            matches.append("gis") if "gis" not in matches else None
        intent = matches[0] if matches else "general"
        domains = sorted({"gis" if match in {"route", "map", "gis", "hazard"} else match for match in matches})
        location = self._location_mention(normalized)
        return ParsedQuery(original=query, normalized=normalized, intent=intent, requested_domains=domains, requested_location=location, time_expression=self._time_expression(lowered, normalized), decision_type=decision_type)

    @staticmethod
    def _location_mention(query: str) -> str | None:
        import re
        match = re.search(r"\b(?:near|at|around|off|in)\s+([A-Za-z][A-Za-z .'-]{1,60}?)(?=\s+(?:today|tomorrow|tonight|this|next|at|for|and|with)\b|[?.!,]|$)", query, re.IGNORECASE)
        return match.group(1).strip() if match else None

    @staticmethod
    def _time_expression(lowered: str, original: str) -> str | None:
        import re
        match = re.search(r"\b(today|tomorrow(?:\s+(?:morning|afternoon|evening|night))?|tonight|this weekend|next week)\b", lowered)
        if match:
            return match.group(0)
        date = re.search(r"\b\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?\b", original)
        return date.group(0) if date else None
