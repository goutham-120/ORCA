"""Small, deterministic query normalization used before agent planning."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ParsedQuery:
    original: str
    normalized: str
    intent: str
    requested_domains: list[str]


class QueryParser:
    _intent_terms = {
        "route": ("route", "navigate", "voyage", "path"),
        "safety": ("safe", "safety", "risk", "hazard"),
        "weather": ("weather", "wind", "rain", "storm", "temperature", "forecast"),
        "ocean": ("ocean", "marine", "wave", "current", "sea", "swell", "tide"),
        "map": ("map", "layer", "area", "zone"),
    }

    def parse(self, query: str) -> ParsedQuery:
        normalized = " ".join(query.strip().split())
        lowered = normalized.lower()
        matches = [name for name, terms in self._intent_terms.items() if any(term in lowered for term in terms)]
        intent = matches[0] if matches else "general"
        domains = sorted({"gis" if match in {"route", "map"} else match for match in matches})
        return ParsedQuery(original=query, normalized=normalized, intent=intent, requested_domains=domains)
