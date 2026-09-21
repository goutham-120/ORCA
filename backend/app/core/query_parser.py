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

    _telugu_terms = {
        "weather": ("వాతావరణం", "గాలి", "వర్షం", "తుఫాను", "ఉష్ణోగ్రత"),
        "ocean": ("సముద్రం", "సముద్ర", "సముద్రపు", "అలలు", "అలల", "కెరటాలు", "కెరటం", "తరంగాలు"),
        "safety": ("సురక్షితం", "సురక్షితమేనా", "సురక్షితమైన", "భద్రత", "రక్షణ", "ప్రమాదం", "హాని"),
        "gis": ("నిషిద్ధ", "ప్రాంతం", "సమీపంలో", "చేరువలో", "దగ్గర", "పరిధి"),
        "pfz": ("చేపలు", "చేపల", "చేపల వేట", "మత్స్య", "వేట"),
    }

    _tamil_terms = {
        "weather": ("வானிலை", "காற்று", "மழை", "புயல்", "வெப்பநிலை"),
        "ocean": ("கடல்", "அலைகள்", "அலை", "ஓட்டம்"),
        "safety": ("பாதுகாப்பு", "பாதுகாப்பான", "ஆபத்து"),
        "gis": ("தடுக்கப்பட்ட", "பகுதி", "அருகில்"),
        "pfz": ("மீன்", "மீன்பிடி", "மீன்பிடித்தல்"),
    }

    _odia_terms = {
        "weather": ("ପାଣିପାଗ", "ପବନ", "ବର୍ଷା", "ତୋଫାନ", "ବାତ୍ୟା", "ତାପମାତ୍ରା"),
        "ocean": ("ସମୁଦ୍ର", "ସାମୁଦ୍ରିକ", "ଲହଡ଼ି", "ଢ଼େଉ", "ତରଙ୍ଗ", "ସ୍ରୋତ"),
        "safety": ("ସୁରକ୍ଷିତ", "ସୁରକ୍ଷା", "ବିପଦ", "ସଙ୍କଟ"),
        "gis": ("ନିଷିଦ୍ଧ", "ଅଞ୍ଚଳ", "ନିକଟରେ", "ପାଖରେ", "ସୀମା"),
        "pfz": ("ମାଛ", "ମାଛଧରା", "ମାଛ ଧରିବା", "ମତ୍ସ୍ୟ"),
    }

    _bengali_terms = {
        "weather": ("আবহাওয়া", "বাতাস", "বৃষ্টি", "ঝড়", "তাপমাত্রা"),
        "ocean": ("সমুদ্র", "সামুদ্রিক", "ঢেউ", "তরঙ্গ", "স্রোত"),
        "safety": ("নিরাপদ", "সুরক্ষা", "ঝুঁকি", "বিপদ"),
        "gis": ("নিষিদ্ধ", "এলাকা", "অঞ্চল", "কাছে", "সীমানা"),
        "pfz": ("মাছ", "মাছ ধরা", "মৎস্য"),
    }

    _konkani_terms = {
        "weather": ("हवामान", "वारो", "वार्याचा", "पावस", "तूपान", "तापमान"),
        "ocean": ("दर्यो", "दर्या", "दर्याची", "दर्यांत", "ल्हाट", "ल्हाटांची", "ल्हारांची", "स्वेल", "उदक", "तटीय"),
        "safety": ("सुरक्षित", "सुरक्षाय", "धोको", "धोक्याचे", "सकटी"),
        "gis": ("बंदी", "वाठार", "लागीं", "वाठारांत"),
        "pfz": ("मासळी", "मासळी मारप", "मासळी मारपाचे"),
    }

    _tulu_terms = {
        "weather": ("ವಾತಾವರಣ", "ಗಾಳಿ", "ಬರ್ಸ", "ತೂಫಾನ್", "ಉಷ್ಣಾಂಶ"),
        "ocean": ("ಕಡಲ್", "ಕಡಲ", "ಅಲೆ", "ಅಲೆತ", "ಸ್ವೆಲ್", "ನೀರು"),
        "safety": ("ರಕ್ಷಣೆ", "ಜಾಗ್ರತೆ", "ಅಪಾಯ", "ಉಂಡಾ"),
        "gis": ("ತಡೆ", "ಜಾಗ", "ಕೈತಲ್", "ಸಾದಿ"),
        "pfz": ("ಮೀನ್", "ಮೀನು", "ಪತ್ತುನೆ", "ಮೀನ್ ಪತ್ತುನ"),
    }

    _gujarati_terms = {
        "weather": ("હવામાન", "પવન", "વરસાદ", "વાવાઝોડું", "તાપમાન"),
        "ocean": ("દરિયો", "દરિયાઈ", "મોજાં", "મોજું", "તરંગ", "સ્વેલ", "દરિયા"),
        "safety": ("સલામત", "સુરક્ષા", "જોખમ", "ખતરો"),
        "gis": ("પ્રતિબંધિત", "વિસ્તાર", "નજીક", "પાસે"),
        "pfz": ("માછલી", "માછીમારી", "મત્સ્ય"),
    }

    _marathi_terms = {
        "weather": ("हवामान", "वारा", "वाऱ्याचा", "पाऊस", "तूफान", "तापमान"),
        "ocean": ("समुद्र", "समुद्री", "लाटा", "लाटांची", "लाट", "स्वेल", "पाणी", "दर्या"),
        "safety": ("सुरक्षित", "सुरक्षा", "धोका", "धोके", "जोखीम"),
        "gis": ("प्रतिबंधित", "क्षेत्र", "जवळ", "जवळचा"),
        "pfz": ("मासेमारी", "मासे", "मासेमारी क्षेत्र"),
    }

    def parse(self, query: str) -> ParsedQuery:
        normalized = " ".join(query.strip().split())
        lowered = normalized.lower()
        matches = [name for name, terms in self._intent_terms.items() if any(term in lowered for term in terms)]
        for lang_terms in (self._hindi_terms, self._telugu_terms, self._tamil_terms, self._odia_terms, self._bengali_terms, self._konkani_terms, self._tulu_terms, self._gujarati_terms, self._marathi_terms):
            matches.extend(name for name, terms in lang_terms.items() if any(term in normalized for term in terms) and name not in matches)
        explicit_pfz = "pfz" in matches or any(term in lowered for term in ("fishing zone", "potential fishing zone", "potential fishing zones"))
        fishing = any(term in lowered for term in ("fish", "fishing")) or explicit_pfz
        safety = "safety" in matches
        decision_type = "route" if "route" in matches else "pfz" if explicit_pfz and not safety else "fishing" if fishing else "safety" if safety else "hazard" if "hazard" in matches else None
        if decision_type in {"fishing", "safety"}:
            matches.extend(name for name in ("ocean", "weather") if name not in matches)
        # Fishing suitability needs PFZ evidence as well as conditions.  The
        # workflow maps this domain to the GIS agent and DecisionService.
        if decision_type == "fishing" and "pfz" not in matches:
            matches.append("pfz")
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
        if match:
            return match.group(1).strip()
        match_indic = re.search(r"([A-Za-z\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF\u0B00-\u0B7F\u0980-\u09FF\u0C80-\u0CFF\u0A80-\u0AFF][A-Za-z\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF\u0B00-\u0B7F\u0980-\u09FF\u0C80-\u0CFF\u0A80-\u0AFF .'-]{1,60}?)\s+(?:ਕੇ\s+पास|दग्गर|దగ్గర|అరుగిల్|அருகில்|ପାଖରେ|ନିକଟରେ|কাছে|নিকটে|लागीं|ಕೈತಲ್|પાસે|નજીક|जवळ)(?:\s+|[?.!,]|$)", query)
        if match_indic:
            raw_loc = match_indic.group(1).strip()
            for prefix in ("क्या आज", "क्या कल", "क्या", "आज", "कल", "उद्या", "ఈ రోజు", "ఈరోజు", "నేడు", "రేపు", "இன்று", "நாளை", "ଆଜି", "କାଲି", "আজ", "কাল", "आयज", "फाल्यां", "ಇನಿ", "ಎಲ್ಲೆ", "આજે", "કાલે"):
                if raw_loc.startswith(prefix):
                    raw_loc = raw_loc[len(prefix):].strip()
            return raw_loc if raw_loc else None
        return None

    @staticmethod
    def _time_expression(lowered: str, original: str) -> str | None:
        import re
        match = re.search(r"\b(today|tomorrow(?:\s+(?:morning|afternoon|evening|night))?|tonight|this weekend|next week)\b", lowered)
        if match:
            return match.group(0)
        for expr in ("आज", "कल", "उद्या", "आज रात्री", "ఈ రోజు", "నేడు", "రేపు", "ఈ రాత్రి", "இன்று", "நாளை", "இன்று இரவு", "ଆଜି", "କାଲି", "ଆଜି ରାତି", "আজ", "কাল", "আজ রাতে", "आयज", "फाल्यां", "आयज राती", "ಇನಿ", "ಎಲ್ಲೆ", "ಇನಿ ರಾತ್ರಿ", "આજે", "કાલે", "આજે રાત્રે"):
            if expr in original:
                return expr
        date = re.search(r"\b\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?\b", original)
        return date.group(0) if date else None
