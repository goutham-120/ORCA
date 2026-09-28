"""Small, deterministic query normalization used before agent planning."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Literal
import re

QueryMode = Literal["knowledge_only", "live_operational", "hybrid"]


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
    query_mode: QueryMode = "live_operational"


class QueryParser:
    _intent_terms = {
        "simulation": ("what if", "simulate", "simulation", "if sst", "if wind", "if wave", "scenario", "hypothetical", "what happens if", "increases by", "rises by"),
        "route": ("route", "navigate", "voyage", "path", "safest route", "waypoint"),
        "safety": ("safe", "safety", "risk", "safe to venture"),
        "weather": ("weather", "wind", "rain", "storm", "air temperature", "forecast", "lightning"),
        "ocean": ("ocean", "marine", "wave", "current", "sea", "swell", "tide", "high tide", "low tide", "currents", "mackerel", "sardine", "tuna", "pomfret", "hilsa", "species", "environmental parameters", "environmental conditions", "chlorophyll", "sea surface temperature", "sst", "thermal front", "thermal fronts", "ocean color", "ocean colour", "chlorophyll concentration"),
        "map": ("map", "layer", "area", "zone", "location", "distance", "coordinates", "boundary", "coastal"),
        "gis": ("restricted", "hazard zone", "spatial", "geofence", "mpa", "protected area"),
        "pfz": ("pfz", "potential fishing zone", "potential fishing zones", "nearest pfz", "nearest potential fishing zone"),
        "hazard": ("cyclone", "hurricane", "typhoon", "lightning", "squall", "storm alert", "cyclone alert", "lightning alert", "thunderstorm", "alerts in my area"),
        "anomaly": ("decline", "declined", "productivity", "catch drop", "low catch", "why has fish", "why was fish", "why did fish", "why fish", "fish productivity", "fish catch drop", "heatwave", "hypoxia", "algal bloom", "upwelling"),
        "regulations": ("fishing ban", "ban dates", "seasonal ban", "uniform ban", "monsoon ban", "pmmsy", "subsidy", "mpeda", "export", "guidelines"),
    }

    _hindi_terms = {
        "simulation": ("क्या होगा अगर", "यदि", "तापमान बढ़े", "हवा तेज", "सिमुलेशन"),
        "weather": ("मौसम", "हवा", "बारिश", "तूफान", "बिजली"),
        "ocean": ("समुद्र", "समुद्री", "लहर", "लहरें", "ज्वार", "भाटा", "मैकेरल", "सारडीन", "पर्यावरण", "पर्यावरणीय"),
        "safety": ("सुरक्षित", "सुरक्षा", "जोखिम", "खतरा"),
        "gis": ("प्रतिबंधित", "क्षेत्र", "निकट", "पास"),
        "pfz": ("मछली", "मछली पकड़", "मत्स्य क्षेत्र"),
        "anomaly": ("गिरावट", "उत्पादन में गिरावट", "मछली कम", "कारण"),
    }

    _telugu_terms = {
        "simulation": ("ఒకవేళ", "ఏమి జరుగుతుంది", "ఉష్ణోగ్రత పెరిగితే", "గాలి పెరిగితే", "సిమ్యులేషన్"),
        "weather": ("వాతావరణం", "వాతావరణ", "గాలి", "వర్షం", "తుఫాను", "ఉష్ణోగ్రత", "మెరుపు"),
        "ocean": ("సముద్రం", "సముద్ర", "సముద్రపు", "అలలు", "అలల", "కెరటాలు", "కెరటం", "తరంగాలు", "పోటు", "పాటు", "టైడ్", "మాకెరెల్", "సార్డిన్", "చేపలు", "చేపల", "పర్యావరణం", "పర్యావరణ"),
        "safety": ("సురక్షితం", "సురక్షితమేనా", "సురక్షితమైన", "భద్రత", "రక్షణ", "ప్రమాదం", "హాని", "ఆపద", "అత్యవసర"),
        "gis": ("నిషిద్ధ", "ప్రాంతం", "సమీపంలో", "చేరువలో", "దగ్గర", "పరిధి"),
        "pfz": ("చేపల వేట", "మత్స్య క్షేత్రం", "మత్స్య జోన్", "పీఎఫ్జెడ్", "పిఎఫ్జెడ్", "ఫిషింగ్ జోన్"),
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

    _odia_terms = {
        "simulation": ("ଯଦି", "କ\'ଣ ହେବ", "ତାପମାତ୍ରା ବୃଦ୍ଧି", "ପବନ ବୃଦ୍ଧି", "ସିମ୍ୟୁଲେସନ"),
        "route": ("ମାର୍ଗ", "ରାସ୍ତା", "ସୁରକ୍ଷିତ ମାର୍ଗ", "ନୌକାଚାଳନା"),
        "weather": ("ପାଣିପାଗ", "ପବନ", "ବର୍ଷା", "ତୋଫାନ", "ବାତ୍ୟା", "ତାପମାତ୍ରା"),
        "ocean": ("ସମୁଦ୍ର", "ସାମୁଦ୍ରିକ", "ଲହଡ଼ି", "ଢ଼େଉ", "ତରଙ୍ଗ", "ସ୍ରୋତ", "ଜୁଆର", "ଭଟ୍ଟା"),
        "safety": ("ସୁରକ୍ଷିତ", "ସୁରକ୍ଷା", "ବିପଦ", "ସଙ୍କଟ"),
        "gis": ("ନିଷିଦ୍ଧ", "ଅଞ୍ଚଳ", "ନିକଟରେ", "ପାଖରେ", "ସୀମା"),
        "pfz": ("ମାଛ", "ମାଛଧରା", "ମାଛ ଧରିବା", "ମତ୍ସ୍ୟ"),
        "anomaly": ("ହ୍ରାସ", "ଉତ୍ପାଦନ ହ୍ରାସ", "କମିବା", "କାରଣ"),
    }

    _bengali_terms = {
        "simulation": ("যদি", "কি ঘটবে", "তাপমাত্রা বৃদ্ধি", "বাতাস বৃদ্ধি", "সিমুলেশন"),
        "route": ("রুট", "পথ", "নিরাপদ রুট", "নৌপথ"),
        "weather": ("আবহাওয়া", "বাতাস", "বৃষ্টি", "ঝড়", "তাপমাত্রা"),
        "ocean": ("সমুদ্র", "সামুদ্রিক", "ঢেউ", "তরঙ্গ", "স্রোত", "জোয়ার", "ভাটা"),
        "safety": ("নিরাপদ", "সুরক্ষা", "ঝুঁকি", "বিপদ"),
        "gis": ("নিষিদ্ধ", "এলাকা", "অঞ্চল", "কাছে", "সীমানা"),
        "pfz": ("মাছ", "মাছ ধরা", "মৎস্য"),
        "anomaly": ("হ্রাস", "উৎপাদন হ্রাস", "কমে যাওয়া", "কারণ"),
    }

    _konkani_terms = {
        "simulation": ("जर", "कितें घडटलें", "तापमान वाडल्यार", "वारो वाडल्यार", "सिम्युलेशन"),
        "route": ("मार्ग", "सुरक्षित मार्ग", "सगळ्यांत सुरक्षित"),
        "weather": ("हवामान", "वारो", "वार्याचा", "पावस", "तूपान", "तापमान"),
        "ocean": ("दर्यो", "दर्या", "दर्याची", "दर्यांत", "ल्हाट", "ल्हाटांची", "ल्हारांची", "स्वेल", "उदक", "तटीय", "भरती", "सुकेती"),
        "safety": ("सुरक्षित", "सुरक्षाय", "धोको", "धोक्याचे", "सकटी"),
        "gis": ("बंदी", "वाठार", "लागीं", "वाठारांत"),
        "pfz": ("मासळी", "मासळी मारप", "मासळी मारपाचे"),
        "anomaly": ("घट", "उत्पादनांत घट", "कमी", "कारण"),
    }

    _tulu_terms = {
        "simulation": ("ಒಂಜಿ ವೇಳೆ", "ದಾನೆ ಆಪುಂಡು", "ಶಾಖ ಹೆಚ್ಚಾಂಡ", "ಗಾಳಿ ಹೆಚ್ಚಾಂಡ", "ಸಿಮ್ಯುಲೇಶನ್"),
        "route": ("ಸಾದಿ", "ರಕ್ಷಣೆದ ಸಾದಿ", "ಎಡ್ಡೆ ಸಾದಿ"),
        "weather": ("ವಾತಾವರಣ", "ಗಾಳಿ", "ಬರ್ಸ", "ತೂಫಾನ್", "ಉಷ್ಣಾಂಶ"),
        "ocean": ("ಕಡಲ್", "ಕಡಲ", "ಅಲೆ", "ಅಲೆತ", "ಸ್ವೆಲ್", "ನೀರು", "ಉಬ್ಬರ", "ಇಳಿತ"),
        "safety": ("ರಕ್ಷಣೆ", "ಜಾಗ್ರತೆ", "ಅಪಾಯ", "ಉಂಡಾ"),
        "gis": ("ತಡೆ", "ಜಾಗ", "ಕೈತಲ್", "ಸಾದಿ"),
        "pfz": ("ಮೀನ್", "ಮೀನು", "ಪತ್ತುನೆ", "ಮೀನ್ ಪತ್ತುನ"),
        "anomaly": ("ಕಮ್ಮಿ", "ಉತ್ಪಾದನೆ ಕಮ್ಮಿ", "ಕಾರಣ"),
    }

    _gujarati_terms = {
        "simulation": ("જો", "શું થશે", "તાપમાન વધે", "પવન વધે", "સિમ્યુલેશન"),
        "route": ("માર્ગ", "સુરક્ષિત માર્ગ", "રસ્તો"),
        "weather": ("હવામાન", "પવન", "વરસાદ", "વાવાઝોડું", "તાપમાન"),
        "ocean": ("દરિયો", "દરિયાઈ", "મોજાં", "મોજું", "તરંગ", "સ્વેલ", "દરિયા", "ભરતી", "ઓટ"),
        "safety": ("સલામત", "સુરક્ષા", "જોખમ", "ખતરો"),
        "gis": ("પ્રતિબંધિત", "વિસ્તાર", "નજીક", "પાસે"),
        "pfz": ("માછલી", "માછીમારી", "મત્સ્ય"),
        "anomaly": ("ઘટાડો", "ઉત્પાદનમાં ઘટાડો", "ઓછું", "કારણ"),
    }

    _marathi_terms = {
        "simulation": ("जर", "काय होईल", "तापमान वाढल्यास", "वारा वाढल्यास", "सिम्युलेशन"),
        "route": ("मार्ग", "सुरक्षित मार्ग", "जलमार्ग"),
        "weather": ("हवामान", "वारा", "वाऱ्याचा", "पाऊस", "तूफान", "तापमान"),
        "ocean": ("समुद्र", "समुद्री", "लाटा", "लाटांची", "लाट", "स्वेल", "पाणी", "दर्या", "भरती", "ओहोटी"),
        "safety": ("सुरक्षित", "सुरक्षा", "धोका", "धोके", "जोखीम"),
        "gis": ("प्रतिबंधित", "क्षेत्र", "जवळ", "जवळचा"),
        "pfz": ("मासेमारी", "मासे", "मासेमारी क्षेत्र"),
        "anomaly": ("घट", "उत्पादनात घट", "कमी", "कारण"),
    }

    _malayalam_terms = {
        "simulation": ("ഒരുപക്ഷേ", "എന്താണ് സംഭവിക്കുക", "താപനില ഉയർന്നാൽ", "കാറ്റ് കൂടിയാൽ", "സിമുലേഷൻ"),
        "route": ("റൂട്ട്", "വഴി", "സുരക്ഷിത പാത", "യാത്രാമാർഗ്ഗം"),
        "weather": ("കാലാവസ്ഥ", "കാറ്റ്", "മഴ", "കൊടുങ്കാറ്റ്", "താപനില"),
        "ocean": ("കടൽ", "സമുദ്രം", "തിരമാല", "തിരമാലകൾ", "തിര", "ഓളം", "വേലിയിറക്കം", "വേലിയേറ്റം"),
        "safety": ("സുരക്ഷിതം", "സുരക്ഷ", "അപകടം", "ഭീഷണി"),
        "gis": ("നിരോധിത", "മേഖല", "അടുത്ത്", "സമീപം", "അതിർത്തി"),
        "pfz": ("മത്സ്യം", "മീൻപിടുത്തം", "മീൻ", "മത്സ്യബന്ധനം"),
        "anomaly": ("കുറഞ്ഞു", "ഉത്പാദനം കുറഞ്ഞു", "കാരണം"),
    }

    _kannada_terms = {
        "simulation": ("ಒಂದು ವೇಳೆ", "ಏನಾಗುತ್ತದೆ", "ತಾಪಮಾನ ಹೆಚ್ಚಾದರೆ", "ಗಾಳಿ ಹೆಚ್ಚಾದರೆ", "ಸಿಮ್ಯುಲೇಶನ್"),
        "route": ("ಮಾರ್ಗ", "ಸುರಕ್ಷಿತ ಮಾರ್ಗ", "ದಾರಿ", "ಸಂಚಾರ"),
        "weather": ("ಹವಾಮಾನ", "ಗಾಳಿ", "ಮಳೆ", "ಬಿರುಗಾಳಿ", "ತಾಪಮಾನ"),
        "ocean": ("ಸಮುದ್ರ", "ಸಾಗರ", "ಅಲೆಗಳು", "ಅಲೆ", "ಉಬ್ಬರ", "ಇಳಿತ", "ನೀರು"),
        "safety": ("ಸುರಕ್ಷಿತ", "ಸುರಕ್ಷತೆ", "ಅಪಾಯ", "ಎಚ್ಚರಿಕೆ"),
        "gis": ("ನಿಷೇಧಿತ", "ಪ್ರದೇಶ", "ಹತ್ತಿರ", "ಸಮೀಪ", "ಗಡಿ"),
        "pfz": ("ಮೀನು", "ಮೀನುಗಾರಿಕೆ", "ಮತ್ಸ್ಯ"),
        "anomaly": ("ಇಳಿಕೆ", "ಉತ್ಪಾದನೆ ಇಳಿಕೆ", "ಕಡಿಮೆ", "ಕಾರಣ"),
    }

    def parse(self, query: str) -> ParsedQuery:
        normalized = " ".join(query.strip().split())
        lowered = normalized.lower()
        matches = [name for name, terms in self._intent_terms.items() if any(term in lowered for term in terms)]
        for lang_terms in (
            self._hindi_terms,
            self._telugu_terms,
            self._tamil_terms,
            self._odia_terms,
            self._bengali_terms,
            self._konkani_terms,
            self._tulu_terms,
            self._gujarati_terms,
            self._marathi_terms,
            self._malayalam_terms,
            self._kannada_terms,
        ):
            matches.extend(name for name, terms in lang_terms.items() if any(term in normalized for term in terms) and name not in matches)

        query_mode = self._determine_query_mode(lowered, normalized)

        if query_mode == "knowledge_only":
            intent = "general"
            if any(term in lowered or term in normalized for term in ("distress", "emergency", "sar", "rescue", "safety", "అత్యవసర", "ఆపద", "సహాయం", "రక్షణ", "భద్రత", "संकट", "खतरा", "सुरक्षा", "ஆபத்து", "அவசர", "பாதுகாப்பு")):
                intent = "safety"
            elif any(term in lowered or term in normalized for term in ("ban", "regulation", "pmmsy", "प्रतिबंध", "నిషేధ", "தடை")):
                intent = "regulations"
            elif any(term in lowered or term in normalized for term in ("pfz", "potential fishing zone", "chlorophyll", "పీఎఫ్జెడ్", "పిఎఫ్జెడ్", "సలహా", "फिशिंग ज़ोन", "ஆலோசனை")):
                intent = "pfz"
            elif any(term in lowered or term in normalized for term in ("mackerel", "sardine", "species", "biology", "ocean", "మాకెరెల్", "సార్డిన్", "చేపలు", "చేపలను", "పర్యావరణ", "పరిస్థితులు", "మత్స్య", "मैकेरल", "सारडीन", "कானாங்கெளுத்தி", "சுற்றுச்சூழல்")):
                intent = "ocean"
            elif matches:
                intent = matches[0]
            return ParsedQuery(
                original=query,
                normalized=normalized,
                intent=intent,
                requested_domains=[],
                requested_location=None,
                time_expression=None,
                decision_type=None,
                perturbations=None,
                query_mode="knowledge_only",
            )

        is_simulation = "simulation" in matches or any(term in lowered for term in ("what if", "what happens if", "simulate", "simulation", "scenario"))
        explicit_pfz = any(term in lowered for term in ("pfz", "potential fishing zone", "potential fishing zones", "nearest pfz", "nearest potential fishing zone", "where is pfz"))
        is_ocean_front = any(term in lowered for term in ("chlorophyll", "thermal front", "thermal fronts", "ocean color", "ocean colour", "chlorophyll concentration"))
        is_anomaly = "anomaly" in matches or any(term in lowered for term in ("productivity declined", "why has fish", "why was fish", "why did fish", "why fish", "catch drop", "productivity drop", "fish decline", "fish productivity"))
        is_hazard_avoidance = any(term in lowered for term in ("avoid", "avoided", "geofenc", "restricted zone", "restricted area", "hazard zone", "restrictions", "marine reserve", "exclusion zone", "shallow reef"))
        fishing = (any(term in lowered for term in ("fish", "fishing")) or explicit_pfz) and not is_anomaly and not is_simulation and not is_ocean_front and not is_hazard_avoidance
        safety = "safety" in matches and not is_anomaly and not is_simulation and not is_hazard_avoidance

        perturbations = None
        if is_simulation:
            decision_type = "simulation"
            perturbations = self._extract_perturbations(lowered)
        elif is_anomaly:
            decision_type = "anomaly"
        elif "route" in matches:
            decision_type = "route"
        elif is_hazard_avoidance:
            decision_type = "hazard"
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

        if decision_type in {"fishing", "safety", "simulation", "anomaly", "hazard"}:
            matches.extend(name for name in ("ocean", "weather", "gis") if name not in matches)

        if is_ocean_front and not explicit_pfz and not is_anomaly:
            matches.extend(name for name in ("ocean", "gis") if name not in matches)

        # Fishing suitability needs PFZ evidence as well as conditions.
        if decision_type == "fishing" and "pfz" not in matches:
            matches.append("pfz")

        if explicit_pfz and not is_anomaly and not is_simulation and not is_hazard_avoidance:
            matches = [name for name in matches if name != "map"]

        if decision_type in {"safety", "fishing", "hazard"} and any(term in lowered for term in ("zone", "restricted", "hazard area", "geofence", "avoid")):
            matches.append("gis") if "gis" not in matches else None

        if is_hazard_avoidance:
            intent = "gis"
        elif is_ocean_front and not explicit_pfz and not is_anomaly:
            intent = "ocean"
        elif is_anomaly:
            intent = "anomaly"
        elif explicit_pfz:
            intent = "pfz"
        else:
            intent = matches[0] if matches else "general"

        valid_agent_domains = {"ocean", "weather", "gis", "pfz"}
        domains = sorted({("gis" if match in {"route", "map", "gis", "hazard"} else match) for match in matches if ("gis" if match in {"route", "map", "gis", "hazard"} else match) in valid_agent_domains})
        location = None if query_mode == "knowledge_only" else self._location_mention(normalized)
        return ParsedQuery(
            original=query,
            normalized=normalized,
            intent=intent,
            requested_domains=domains,
            requested_location=location,
            time_expression=self._time_expression(lowered, normalized),
            decision_type=decision_type,
            perturbations=perturbations,
            query_mode=query_mode,
        )

    @classmethod
    def _determine_query_mode(cls, lowered: str, normalized: str) -> QueryMode:
        has_knowledge = cls._is_knowledge_query(lowered, normalized)
        has_live = cls._is_live_query(lowered, normalized)

        if has_knowledge and has_live:
            return "hybrid"
        if has_knowledge and not has_live:
            return "knowledge_only"
        return "live_operational"

    @classmethod
    def _is_knowledge_query(cls, lowered: str, normalized: str) -> bool:
        regulatory_patterns = (
            r"\b(?:fishing\s+ban|ban\s+dates?|seasonal\s+ban|uniform\s+ban|monsoon\s+ban|ban\s+period|ban\s+order|ban\s+rules)\b",
            r"\b2026\b.*\bban\b|\bban\b.*\b2026\b",
            r"\b(?:caa\s+rules|coastal\s+aquaculture|crz|coastal\s+regulation\s+zone|exclusive\s+economic\s+zone|eez\s+guidelines|mesh\s+size|minimum\s+legal\s+size)\b",
            r"\b(?:marine\s+rules?|fishing\s+rules?|maritime\s+rules?|fisheries\s+regulations?|marine\s+regulations?|coastal\s+regulations?|maritime\s+regulations?|statutory\s+rules?|trawler\s+regulations?)\b",
            r"\b(?:tell\s+me\s+about|what\s+are|explain)\b.*\b(?:marine\s+rules|fishing\s+rules|regulations|guidelines|policies|acts?)\b",
            r"\b(?:pmmsy|pradhan\s+mantri\s+matsya\s+sampada|fidf|kcc|fisheries\s+subsidy|fisheries\s+scheme|subsidies|mpeda|cmfri|incois\s+manual|nmsar)\b",
            r"\b(?:export\s+trends?|marine\s+products?\s+exports?|seafood\s+exports?)\b",
        )
        if any(re.search(pat, lowered) for pat in regulatory_patterns):
            return True

        safety_patterns = (
            r"\b(?:maritime\s+distress|distress\s+situation|distress\s+procedure|distress\s+procedures|distress\s+protocol|distress\s+alerting|distress\s+call)\b",
            r"\b(?:nmsar|search\s+and\s+rescue\s+manual|sar\s+procedures?|channel\s+16\s+protocol|epirb\s+procedure)\b",
            r"\bwhat\s+should\s+(?:fishermen|fishers|mariners|sailors)\s+(?:do|know|follow|be\s+aware\s+of)\b",
            r"\bhow\s+should\s+(?:fishermen|fishers|mariners|sailors)\s+respond\b",
            r"\b(?:procedure|protocol|guideline|action)\s+during\s+(?:a\s+)?(?:distress|emergency)\b",
            r"\b(?:safe\s+fishing\s+conditions?|safe\s+sea\s+conditions?|safe\s+navigation\s+conditions?|safety\s+measures?|safety\s+guidelines?)\b",
        )
        if any(re.search(pat, lowered) for pat in safety_patterns):
            return True

        species_patterns = (
            r"\b(?:environmental\s+conditions?\s+affect|environmental\s+parameters?|parameters?\s+affecting|factors?\s+affecting)\b",
            r"\b(?:temperature\s+range|salinity\s+range|spawning\s+season|feeding\s+habits?|habitat\s+of|biology\s+of)\b",
            r"\b(?:what\s+(?:are|is)|tell\s+me\s+about|explain|describe)\b.*\b(?:mackerels?|sardines?|oil\s+sardines?|tunas?|pomfrets?|hilsa|species)\b",
            r"\b(?:indian\s+mackerel|oil\s+sardine|sardines?|mackerels?)\b",
        )
        if any(re.search(pat, lowered) for pat in species_patterns):
            return True

        concept_patterns = (
            r"\b(?:pfz|potential\s+fishing\s+zones?)\b.*\b(?:advisory|advisories|methodology|generation|technique|science|concept|what\s+is|how\s+does|meaning|definition)\b",
            r"\b(?:methodology|science|concept|meaning|definition|explanation|background)\b.*\b(?:pfz|potential\s+fishing\s+zones?)\b",
            r"\b(?:what\s+is|what\s+are|how\s+does|how\s+do|explain|describe|meaning\s+of|definition\s+of)\b.*\b(?:pfz|potential\s+fishing\s+zones?)\b",
            r"\b(?:pfz\s+advisory|potential\s+fishing\s+zone\s+advisory)\b",
            r"\b(?:what\s+is\s+(?:a\s+)?marine\s+heatwave|causes\s+of\s+marine\s+heatwaves?|causes\s+of\s+upwelling|what\s+is\s+upwelling|what\s+is\s+hypoxia|what\s+is\s+algal\s+bloom)\b",
            r"\b(?:what\s+is\s+pmmsy|pmmsy\s+scheme|pmmsy\s+guidelines?)\b",
        )
        if any(re.search(pat, lowered) for pat in concept_patterns):
            return True

        indic_knowledge_terms = (
            "प्रतिबंध की तारीखें", "मछली पकड़ने पर प्रतिबंध", "मत्स्य पालन प्रतिबंध", "मत्स्य पालन", "प्रतिबंध कब", "प्रतिबंध", "पर्यावरणीय स्थितियां", "पर्यावरणीय परिस्थितियाँ", "संकट की स्थिति", "क्या करना चाहिए", "मत्स्य संपदा", "पीएमएमएसवाई", "मैकेरल", "तारीखें क्या हैं", "नियम", "पोटेंशियल फिशिंग ज़ोन", "फिशिंग ज़ोन", "एडवाइजरी", "संभावित मत्स्य पालन क्षेत्र", "संभावित",
            "నిషేధ తేదీలు", "చేపల వేట నిషేధం", "ఆపద సమయంలో", "మత్స్యకారులు ఏమి చేయాలి", "అత్యవసర పరిస్థితి", "అత్యవసర", "పీఎంఎంఎస్వై", "పరిస్థితులు", "పర్యావరణ పరిస్థితులు", "పర్యావరణం", "పర్యావరణ", "మాకెరెల్", "చేపలను ప్రభావితం చేసే", "సార్డిన్", "తేదీలు ఏమిటి", "నిబంధనలు", "పొటెన్షియల్ ఫిషింగ్ జోన్", "ఫిషింగ్ జోన్", "అడ్వైజరీ", "PFZ సలహా", "సలహా అంటే ఏమిటి", "సలహా", "పీఎఫ్జెడ్", "పిఎఫ్జెడ్",
            "மீன்பிடி தடை", "ஆபத்து காலத்தில்", "மீனவர்கள் என்ன செய்ய வேண்டும்", "அவசர நிலை", "சுற்றுச்சூழல் காரணிகள்", "கானாங்கெளுத்தி", "பாதிக்கும் சுற்றுச்சூழல் காரணிகள்", "சாத்தியமான மீன்பிடி மண்டலம்", "மீன்பிடி மண்டலம்", "ஆலோசனை என்றால் என்ன", "ஆலோசனை", "PFZ ஆலோசனை",
            "ନିଷେଧ ତାରିଖ", "ବିପଦ ସମୟରେ", "କ'ଣ କରିବା ଉଚିତ",
            "নিষেধাজ্ঞার তারিখ", "বিপদের সময়", "কী করা উচিত",
            "നിരോധന തീയതികൾ", "അപകടസമയത്ത് എന്തുചെയ്യണം",
            "ನಿಷೇಧ ದಿನಾಂಕಗಳು", "ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಲ್ಲಿ ಏನು ಮಾಡಬೇಕು",
            "बंदीच्या तारखा", "संकटाच्या वेळी काय करावे",
            "પ્રતિબંધની તારીખો", "મુશ્કેલીના સમયે શું કરવું",
        )
        if any(term in normalized for term in indic_knowledge_terms):
            return True

        return False

    @classmethod
    def _is_live_query(cls, lowered: str, normalized: str) -> bool:
        live_patterns = (
            r"\b(?:today|today'?s|now|right\s+now|currently|current|latest|presently|at\s+present|tonight|tomorrow|this\s+weekend|live)\b",
            r"\b(?:near\s+me|near\s+my\s+location|my\s+location|current\s+location|around\s+here|near\s+here)\b",
            r"\b(?:can\s+i\s+go|is\s+it\s+safe|is\s+the\s+sea\s+safe|safe\s+to\s+venture|safe\s+to\s+fish|should\s+(?:i|we)\s+sail)\b",
            r"\b(?:is\s+fishing\s+allowed\s+today|is\s+fishing\s+permitted\s+today|is\s+fishing\s+allowed\s+here|allowed\s+currently)\b",
            r"\b(?:where\s+are\s+today|where\s+are\s+the\s+current|where\s+are\s+today'?s|show\s+today'?s)\b",
            r"\b(?:current\s+wave|current\s+wind|current\s+sst|current\s+weather|current\s+conditions?)\b",
            r"\b(?:wave\s+height|wind\s+speed|sea\s+conditions?|weather\s+forecast)\b",
            r"\b(?:what\s+if|simulate|simulation|scenario)\b",
            r"\b(?:route|safest\s+route|navigate|voyage)\b",
        )
        if any(re.search(pat, lowered) for pat in live_patterns):
            return True

        indic_live_terms = (
            "आज", "कल", "उद्या", "आज रात्री", "ఈ రోజు", "ఈరోజు", "నేడు", "రేపు", "ఈ రాత్రి",
            "இன்று", "நாளை", "இன்று இரவு", "ଆଜି", "କାଲି", "আজ", "কাল", "आयज", "ಇನಿ", "ಆજે",
            "काले", "सुरक्षित है क्या", "सुरक्षितमेना", "సురక్షితమేనా",
        )
        if any(term in normalized for term in indic_live_terms):
            return True

        return False

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
        # 1. Direct matching against known coastal ports & Indic aliases (Highest confidence)
        try:
            from app.providers.open_meteo import INDIAN_COASTAL_REGISTRY, INDIC_COASTAL_ALIASES
            lowered = query.lower()

            # Check Indic aliases first
            for indic_key in sorted(INDIC_COASTAL_ALIASES.keys(), key=len, reverse=True):
                if indic_key in query:
                    return indic_key

            # Check known English coastal registry keys (longest port names first)
            for key in sorted(INDIAN_COASTAL_REGISTRY.keys(), key=len, reverse=True):
                if re.search(r"(?:\b|^)" + re.escape(key) + r"(?:\b|$)", lowered):
                    return key
        except ImportError:
            pass

        # 2. Indic postposition pattern (e.g. "విశాఖపట్నం దగ్గర", "चेन्नई के पास")
        match_indic = re.search(r"([A-Za-z\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF\u0B00-\u0B7F\u0980-\u09FF\u0C80-\u0CFF\u0A80-\u0AFF][A-Za-z\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF\u0B00-\u0B7F\u0980-\u09FF\u0C80-\u0CFF\u0A80-\u0AFF .'-]{1,60}?)\s+(?:ਕੇ\s+पास|दग्गर|దగ్గర|అరుగిల్|அருகில்|ପାଖରେ|ନିକଟରେ|কাছে|নিকটে|लागीं|ಕೈತಲ್|પાસે|નજીક|जवळ)(?:\s+|[?.!,]|$)", query)
        if match_indic:
            raw_loc = match_indic.group(1).strip()
            for prefix in ("क्या आज", "क्या कल", "क्या", "आज", "कल", "उद्या", "ఈ రోజు", "ఈరోజు", "నేడు", "రేపు", "இன்று", "நாளை", "ଆଜି", "କାଲି", "আজ", "কাল", "आयज", "फाल्यां", "ಇನಿ", "ಎಲ್ಲೆ", "આજે", "કાલે"):
                if raw_loc.startswith(prefix):
                    raw_loc = raw_loc[len(prefix):].strip()
            if raw_loc:
                return raw_loc

        # 3. Preposition pattern (e.g. "in Kochi", "at Visakhapatnam", "near Chennai", "off Goa")
        non_locations = {
            "a fishing vessel", "fishing vessel", "a vessel", "vessel", "a boat", "boat",
            "the sea", "sea", "a particular coastal region", "a particular region", "a particular",
            "my area", "my fishing location", "my location", "this area", "here", "coastal region",
            "fishing", "navigation", "sailing", "me", "us", "today", "tomorrow", "now", "routine transit"
        }
        match = re.search(
            r"\b(?:near|at|around|off|in|for|of|about)\s+([A-Za-z\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF\u0B00-\u0B7F\u0980-\u09FF\u0C80-\u0CFF\u0A80-\u0AFF][A-Za-z\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF\u0B00-\u0B7F\u0980-\u09FF\u0C80-\u0CFF\u0A80-\u0AFF .'-]{1,60}?)(?=\s+(?:today|tomorrow|tonight|this|next|at|for|and|with|if|when|under|assuming|weather|waves?|wind|sst|risk|safety|simulation|forecast|status|condition|report)\b|[?.!,]|$)",
            query,
            re.IGNORECASE,
        )
        if match:
            candidate = match.group(1).strip()
            if candidate and len(candidate) > 1 and candidate.lower() not in non_locations and not any(candidate.lower().startswith(nl) for nl in ("a fishing", "a vessel", "a boat", "the sea", "a particular")):
                return candidate

        return None

    @staticmethod
    def _time_expression(lowered: str, original: str) -> str | None:
        match = re.search(r"\b(today|tomorrow(?:\s+(?:morning|afternoon|evening|night))?|tonight|this weekend|next week)\b", lowered)
        if match:
            return match.group(0)
        for expr in ("आज", "कल", "उद्या", "आज रात्री", "ఈ రోజు", "నేడు", "రేపు", "ఈ రాత్రి", "இன்று", "நாளை", "இன்று இரவு", "ଆଜି", "କାଲି", "ଆଜି ରାତି", "আজ", "কাল", "আজ রাতে", "आयज", "फाल्यां", "आयज राती", "ಇನಿ", "ಎಲ್ಲೆ", "ಇನಿ ರಾತ್ರಿ", "આજે", "કાલે", "આજે રાત્રે"):
            if expr in original:
                return expr
        date = re.search(r"\b\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?\b", original)
        return date.group(0) if date else None
