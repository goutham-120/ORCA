"""Domain-aware router for the ORCA RAG pipeline.

Ensures that RAG retrieval activates exclusively for maritime, oceanographic,
fisheries, species, safety, economic, and policy domains.
Prevents ORCA from retrieving knowledge for out-of-domain general chatbot queries.
"""
from __future__ import annotations

import re
from typing import Any

MARINE_KEYWORDS: frozenset[str] = frozenset({
    # Species & Biological Oceanography
    "mackerel", "sardine", "tuna", "shrimp", "prawn", "squid", "lobster", "crab",
    "pomfret", "hilsa", "anchovy", "clupeoid", "rastrelliger", "sardinella", "fish", "species",
    "pelagic", "demersal", "marine life", "coral", "plankton", "chlorophyll",
    # Physical & Chemical Oceanography
    "ocean", "marine", "sea", "tide", "tides", "current", "currents", "swell", "wave", "waves",
    "upwelling", "sst", "salinity", "temperature", "heatwave", "heat wave", "mhw",
    "hypoxia", "bloom", "algal bloom", "thermal front", "bathymetry", "depth",
    # Fisheries & Aquaculture
    "fishing", "fisheries", "fishermen", "fisherfolk", "aquaculture", "mariculture",
    "hatchery", "hatcheries", "cage culture", "biofloc", "landing centre", "trawl", "boat",
    "vessel", "trawler", "mesh size", "bycatch", "overfishing",
    # Regulations, Schemes & Economics
    "pmmsy", "mpeda", "cmfri", "incois", "fishing ban", "seasonal ban", "ban dates",
    "export", "exports", "seafood", "subsidy", "subsidies", "fidf", "kcc", "crz", "eez",
    "exclusive economic zone", "guidelines", "census",
    # Marine Safety & Maritime Search & Rescue (SAR)
    "distress", "safety", "coast guard", "sar", "nmsar", "rescue", "maritime", "life jacket",
    "dat", "epirb", "vhf", "channel 16", "mrcc", "mrsc", "emergency", "capsized", "drowning",
    # Advisories & Forecasting
    "pfz", "potential fishing zone", "forecast", "ocean state", "coastal", "hifa", "advisory",
})


def is_marine_domain(query: str, parsed: Any | None = None) -> bool:
    """Determine whether a user query falls within ORCA's marine domain.

    Returns True if:
    1. The query contains recognized marine/fisheries/oceanographic keywords, or
    2. The parser identified valid marine requested_domains or decision_type.
    """
    if not query or not query.strip():
        return False

    # Check parser intent/domains if available
    if parsed is not None:
        domains = getattr(parsed, "requested_domains", []) or []
        decision = getattr(parsed, "decision_type", None)
        if any(d in {"ocean", "weather", "gis", "pfz"} for d in domains):
            return True
        if decision in {"safety", "fishing", "pfz", "hazard", "anomaly", "route", "simulation"}:
            return True

    clean_query = query.lower()
    # Check multi-word phrases first
    multi_word_phrases = (
        "potential fishing zone", "fishing ban", "marine heatwave", "marine heat wave",
        "marine safety", "sea surface temperature", "coast guard", "maritime distress",
        "exclusive economic zone", "indian mackerel", "oil sardine", "cage culture",
        "open sea", "life jacket", "search and rescue",
    )
    if any(phrase in clean_query for phrase in multi_word_phrases):
        return True

    # Token-level matching
    tokens = set(re.findall(r"\b[a-z]{3,}\b", clean_query))
    if any(t in MARINE_KEYWORDS for t in tokens):
        return True

    return False
