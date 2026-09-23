"""Coordinates parsing, workflow execution, assessment, and recommendations."""

from datetime import datetime, timezone
from uuid import uuid4
from app.analysis.assess import assess_results
from app.analysis.recommendation import build_recommendations
from app.core.context import QueryContext
from app.core.conversation import synthesize_answer
from app.core.conversation_store import ConversationStore
from app.core.query_parser import QueryParser
from app.schemas.common import Location
from app.schemas.orca import OrcaQueryRequest, OrcaQueryResponse
from app.providers.open_meteo import geocoder
from app.workflows.orca_graph import OrcaWorkflow

 
class OrcaOrchestrator:
    def __init__(self, parser: QueryParser | None = None, workflow: OrcaWorkflow | None = None, conversations: ConversationStore | None = None, location_resolver=geocoder) -> None:
        self.parser = parser or QueryParser()
        self.workflow = workflow or OrcaWorkflow(auto_sync_pfz=True)
        self.conversations = conversations or ConversationStore()
        self.location_resolver = location_resolver

    async def handle(self, request: OrcaQueryRequest) -> OrcaQueryResponse:
        parsed = self.parser.parse(request.query)
        resp_lang = self._response_language(request.language, request.query)
        # Ordinary conversation deliberately bypasses marine assessment and stale
        # location context. The LLM has no tool access in this path.
        if not parsed.requested_domains:
            chat = getattr(self.workflow.llm, "chat", None)
            llm_answer = await chat(request.query, resp_lang) if chat else None
            answer = llm_answer
            if not llm_answer:
                if resp_lang == "hi":
                    answer = "नमस्ते! मैं ORCA (समुद्री खुफिया सहायक) हूँ। मैं तटीय मौसम, समुद्र की लहरों, तटीय सुरक्षा और मछली पकड़ने के क्षेत्रों का विश्लेषण कर सकता हूँ। आप मुझसे किसी भी तटीय स्थान (जैसे विशाखापत्तनम, चेन्नई, मुंबई, कोच्चि, गोवा) के बारे में प्रश्न पूछ सकते हैं।"
                elif resp_lang == "te":
                    answer = "నమస్కారం! నేను ORCA (సముద్ర ఇంటెలిజెన్స్ అసిస్టెంట్). నేను తీరప్రాంత వాతావరణం, అలల ఎత్తు, సముద్ర భద్రత మరియు చేపల వేట ప్రాంతాలను విశ్లేషించగలను. మీరు నన్ను ఏదైనా తీరప్రాంతం (ఉదా. విశాఖపట్నం, చెన్నై, ముంబై, కాకినాడ) గురించి అడగవచ్చు."
                elif resp_lang == "ta":
                    answer = "வணக்கம்! நான் ORCA (கடல் புலனாய்வு உதவியாளர்). நான் கடலோர வானிலை, அலை உயரம், கடல் பாதுகாப்பு மற்றும் மீன்பிடி மண்டலங்களை பகுப்பாய்வு செய்ய முடியும். நீங்கள் என்னிடம் எந்தவொரு கடலோர இடத்தைப் பற்றியும் கேட்கலாம் (எ.கா. சென்னை, தூத்துக்குடி, கன்னியாகுமரி, ராமேஸ்வரம்)."
                elif resp_lang == "or":
                    answer = "ନମସ୍କାର! ମୁଁ ORCA (ସାମୁଦ୍ରିକ ଇଣ୍ଟେଲିଜେନ୍ସ ସହାୟକ)। ମୁଁ ଉପକୂଳ ପାଣିପାଗ, ସମୁଦ୍ର ଲହଡ଼ି, ସାମୁଦ୍ରିକ ସୁରକ୍ଷା ଏବଂ ମାଛ ଧରିବା ଅଞ୍ଚଳର ବିଶ୍ଲେଷଣ କରିପାରିବି। ଆପଣ ମୋତେ କୌଣସି ଉପକୂଳ ସ୍ଥାନ (ଯେପରିକି ପୁରୀ, ପାରାଦ୍ବୀପ, ଗୋପାଳପୁର, ବିଶାଖାପାଟଣା) ବିଷୟରେ ପ୍ରଶ୍ନ ପଚାରିପାରିବେ।"
                elif resp_lang == "bn":
                    answer = "নমস্কার! আমি ORCA (সামুদ্রিক গোয়েন্দা সহকারী)। আমি উপকূলীয় আবহাওয়া, সমুদ্রের ঢেউ, সামুদ্রিক নিরাপত্তা এবং মাছ ধরার অঞ্চল বিশ্লেষণ করতে পারি। আপনি আমাকে যেকোনো উপকূলীয় স্থান (যেমন দিঘা, হলদিয়া, কাকদ্বীপ, পুরী) সম্পর্কে প্রশ্ন জিজ্ঞাসা করতে পারেন।"
                elif resp_lang == "kok":
                    answer = "नमस्कार! हांव ORCA (दर्याची माहिती दिवपी सहाय्यक). हांव तटावयल्या हवामानाची, दर्या ल्हारांची, तटीय सुरक्षेची आनी मासळी मारपाच्या वाठारांची माहिती दिवं शक्तां. तुमी म्हाका खंयच्याय तटीय वाठारा विशीं (उदा. पणजी, मडगांव, वास्को, कारवार) विचारूंक शकतात."
                elif resp_lang == "tcy":
                    answer = "ಸೊಲ್ಮೆಲು! ಯಾನ್ ORCA (ಕಡಲ ಮಾಹಿತಿ ಕೊರ್ಪಿನ ಸಜ್ಜೊ). ಯಾನ್ ಕಡಲ ವಾತಾವರಣ, ಅಲೆತ ಎತ್ತರ, ಕಡಲ ರಕ್ಷಣೆ ಬೊಕ್ಕ ಮೀನ್ ಪತ್ತುನ ಜಾಗೊಲೆನ್ (PFZ) ಅಂದಾಜಿ ಮಲ್ಪುವೆ. ಈರ್ ಏತೊಲಾ ಕಡಲ ಪ್ರದೇಶೊದ (ಉದಾ. ಮಂಗಳೂರು, ಮಲ್ಪೆ, ಕಾರವಾರ) ಬಗೆಟ್ ಕೇನೊಲಿ."
                elif resp_lang == "gu":
                    answer = "નમસ્તે! હું ORCA (દરિયાઈ ઇન્ટેલિજન્સ સહાયક) છું. હું દરિયાકાંઠાના હવામાન, મોજાની ઊંચાઈ, દરિયાઈ સુરક્ષા અને માછીમારી ક્ષેત્રોનું વિશ્લેષણ કરી શકું છું. તમે મને કોઈપણ દરિયાકાંઠાના સ્થળ (જેમ કે કંડલા, પોરબંદર, વેરાવળ, સૂરત) વિશે પ્રશ્ન પૂછી શકો છો."
                elif resp_lang == "mr":
                    answer = "नमस्कार! मी ORCA (समुद्री इंटेलिजन्स सहाय्यक) आहे. मी किनारी हवामान, लाटांची उंची, समुद्री सुरक्षा आणि मासेमारी क्षेत्रांचे (PFZ) विश्लेषण करू शकतो. तुम्ही मला कोणत्याही किनारी ठिकाणाबद्दल (उदा. मुंबई, रत्नागिरी, मालवण, अलिबाग) विचारू शकता."
                elif resp_lang == "ml":
                    answer = "നമസ്കാരം! ഞാൻ ORCA (സമുദ്ര ഇന്റലിജൻസ് അസിസ്റ്റന്റ്) ആണ്. തീരദേശ കാലാവസ്ഥ, തിരമാലകൾ, സമുദ്ര സുരക്ഷ, മത്സ്യബന്ധന മേഖലകൾ (PFZ) എന്നിവ വിശകലനം ചെയ്യാൻ എനിക്ക് കഴിയും. കൊച്ചി, കോഴിക്കോട്, തിരുവനന്തപുരം, കണ്ണൂർ തുടങ്ങിയ തീരദേശ സ്ഥലങ്ങളെക്കുറിച്ച് നിങ്ങൾക്ക് എന്നോട് ചോദിക്കാം."
                elif resp_lang == "kn":
                    answer = "ನಮಸ್ಕಾರ! ನಾನು ORCA (ಸಮುದ್ರ ಇಂಟೆಲಿಜೆನ್ಸ್ ಸಹಾಯಕ). ನಾನು ಕರಾವಳಿ ಹವಾಮಾನ, ಅಲೆಗಳ ಎತ್ತರ, ಸಮುದ್ರ ಸುರಕ್ಷತೆ ಮತ್ತು ಮೀನುಗಾರಿಕೆ ವಲಯಗಳನ್ನು (PFZ) ವಿಶ್ಲೇಷಿಸಬಲ್ಲೆ. ನೀವು ನನ್ನನ್ನು ಮಂಗಳೂರು, ಕಾರವಾರ, ಮಲ್ಪೆ, ಉಡುಪಿ ಮುಂತಾದ ಕರಾವಳಿ ಪ್ರದೇಶಗಳ ಬಗ್ಗೆ ಕೇಳಬಹುದು."
                elif not getattr(self.workflow.llm, "api_key", None):
                    answer = "General conversation is unavailable because no LLM provider is configured. Set ORCA_LLM_API_KEY to enable it."
                elif "403" in str(getattr(self.workflow.llm, "last_error", "")):
                    answer = "General conversation is unavailable because the configured LLM provider denied access. Check the API key, account permissions, and provider endpoint."
                else:
                    answer = "General conversation is temporarily unavailable because the configured LLM provider request failed. Check the server log and your API key, model access, and account billing."
            return OrcaQueryResponse(query_id=str(uuid4()), answer=answer, intent="general_chat", agents_used=[], selected_agents=[], assessment=None, recommendations=[], evidence=[], created_at=datetime.now(timezone.utc), conversation_id=request.conversation_id or str(uuid4()), language=resp_lang, context={"response_language": resp_lang, "llm_mode": "llm" if llm_answer else "deterministic_fallback", "llm_synthesis_attempted": False}, pending_domains=[], unavailable_domains=[], response_kind="general")
        metadata = dict(request.context)
        # Server state is authoritative; client context is only a backwards-compatible fallback.
        prior = self.conversations.get(request.conversation_id)
        client_prior = metadata.get("conversation_context") if isinstance(metadata.get("conversation_context"), dict) else {}
        if not prior:
            prior = client_prior
        location = None
        if parsed.requested_location and self.location_resolver:
            location = await self.location_resolver.resolve(parsed.requested_location)
        if location is None and request.location:
            location = request.location.model_dump()
        if location is None:
            location = self._valid_location(prior.get("location"))
        if location is None:
            browser_location = metadata.get("browser_location")
            browser_location = browser_location.get("location") if isinstance(browser_location, dict) else browser_location
            location = self._valid_location(browser_location)
        time_range = request.time_range if request.time_range is not None else self._valid_time_range(prior.get("time_range"))
        if parsed.requested_location:
            metadata["requested_location"] = parsed.requested_location
        elif prior.get("requested_location"):
            metadata["requested_location"] = prior["requested_location"]
        if parsed.time_expression:
            metadata["time_expression"] = parsed.time_expression
        elif prior.get("time_expression"):
            metadata["time_expression"] = prior["time_expression"]
        metadata["response_language"] = resp_lang
        context = QueryContext(parsed, location, time_range, metadata)
        result = await self.workflow.run(context)
        pending_domains = list(result.get("pending_domains", []))
        required_domains = self._safety_required_domains(parsed)
        for domain in required_domains:
            if domain not in result.get("analysis_results", {}) and domain not in pending_domains:
                pending_domains.append(domain)
        decision = result.get("decision")
        if decision and parsed.decision_type == "pfz":
            pending_domains = [domain for domain in pending_domains if domain != "pfz"]

        if parsed.decision_type == "simulation" or (isinstance(decision, dict) and decision.get("scenario_simulation")):
            sim_res = decision.get("scenario_simulation") or {}
            simulated = sim_res.get("simulated") or {}
            sim_msi = simulated.get("msi") or {}
            msi_score = sim_msi.get("score")
            if msi_score is not None:
                sim_risk_score = round(max(0.0, min(1.0, (100.0 - float(msi_score)) / 100.0)), 2)
                if msi_score >= 75:
                    sim_level = "low"
                elif msi_score >= 50:
                    sim_level = "moderate"
                elif msi_score >= 25:
                    sim_level = "high"
                else:
                    sim_level = "critical"

                sim_factors = [
                    f"Simulated Marine Safety Index (MSI): {msi_score}/100 ({sim_msi.get('tier_label', sim_level.title())})",
                    f"MSI Shift: {sim_res.get('msi_delta', 0):+d} pts from baseline ({sim_res.get('baseline', {}).get('msi', {}).get('score', 0)}/100)",
                ]
                for row in sim_res.get("comparison_matrix", []):
                    sim_factors.append(f"Simulated {row.get('parameter')}: {row.get('simulated')} {row.get('unit')} (Δ {row.get('delta')}) — {str(row.get('severity', '')).upper()}")

                assessment = {
                    "level": sim_level,
                    "summary": sim_res.get("scenario_summary") or f"What-If Simulation: Marine Safety Index is {msi_score}/100 ({sim_level.upper()} Risk)",
                    "factors": sim_factors,
                    "score": sim_risk_score,
                    "incomplete_domains": [],
                }
            else:
                assessment = assess_results(result.get("analysis_results", {}), required_domains=required_domains, pending_domains=pending_domains)
        else:
            assessment = assess_results(result.get("analysis_results", {}), required_domains=required_domains, pending_domains=pending_domains)

        recommendations = build_recommendations(assessment, result.get("analysis_results"))
        response_context = {
            "location": location,
            "time_range": time_range,
            "requested_location": metadata.get("requested_location"),
            "time_expression": metadata.get("time_expression"),
        }
        unavailable_domains = [name for name, value in result.get("analysis_results", {}).items() if isinstance(value, dict) and value.get("data_status") not in {"live", "cached", "demo", "static"}]
        persona = metadata.get("persona") if metadata.get("persona") in {"fisher_marine_operator", "researcher_scientist", "coastal_authority", "general_user"} else "general_user"
        response_context["persona"] = persona
        response_context["llm_mode"] = result.get("llm_mode", "deterministic_fallback")
        response_context["llm_synthesis_attempted"] = bool(getattr(self.workflow.llm, "api_key", None) and getattr(self.workflow.llm, "synthesize", None))
        response_context["selected_agents"] = result.get("selected", result.get("agents_used", []))
        selected_agents = result.get("selected", result.get("agents_used", []))
        response_context["decision_type"] = parsed.decision_type
        if location and ("gis" in selected_agents or parsed.decision_type in {"pfz", "fishing", "hazard", "route"}):
            response_context["map_follow_up"] = {
                "path": "/map",
                "latitude": location["latitude"],
                "longitude": location["longitude"],
                "label": location.get("label") or metadata.get("requested_location") or "Selected map coordinate",
            }
        answer = result.get("answer") if result.get("llm_synthesis") else None
        answer = answer or synthesize_answer(request.query, assessment, result.get("analysis_results", {}), pending_domains, response_context, resp_lang, decision)
        conversation_id = request.conversation_id or str(uuid4())
        self.conversations.put(conversation_id, response_context)
        self.conversations.append_message(conversation_id, "user", request.query)
        self.conversations.append_message(conversation_id, "assistant", answer, {"decision_type": parsed.decision_type})
        execution_steps = result.get("execution_steps", [])
        spatial_data = result.get("spatial_data")
        trace = {
            "plan_intent": parsed.intent,
            "decision_type": parsed.decision_type,
            "agents_activated": selected_agents,
            "steps": execution_steps,
        }
        return OrcaQueryResponse(
            query_id=str(uuid4()),
            answer=answer,
            intent=parsed.intent,
            agents_used=selected_agents,
            selected_agents=selected_agents,
            decision=decision,
            assessment=assessment,
            recommendations=recommendations,
            evidence=result.get("evidence", []),
            created_at=datetime.now(timezone.utc),
            conversation_id=conversation_id,
            language=resp_lang,
            context=response_context,
            pending_domains=pending_domains,
            unavailable_domains=unavailable_domains,
            response_kind="specialized",
            execution_steps=execution_steps,
            trace=trace,
            spatial_data=spatial_data,
        )


    @staticmethod
    def _safety_required_domains(parsed) -> list[str]:
        if parsed.decision_type not in {"safety", "fishing"}:
            return []
        return ["ocean", "weather"]

    @staticmethod
    def _valid_location(value: object) -> dict[str, object] | None:
        if not isinstance(value, dict):
            return None
        try:
            return Location.model_validate(value).model_dump()
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _valid_time_range(value: object) -> tuple[datetime | None, datetime | None] | None:
        if not isinstance(value, (list, tuple)) or len(value) != 2:
            return None
        parsed: list[datetime | None] = []
        try:
            for item in value:
                if item is None:
                    parsed.append(None)
                elif isinstance(item, datetime):
                    parsed.append(item)
                elif isinstance(item, str):
                    parsed.append(datetime.fromisoformat(item.replace("Z", "+00:00")))
                else:
                    return None
        except ValueError:
            return None
        return (parsed[0], parsed[1])

    @staticmethod
    def _response_language(language: str, query: str = "") -> str:
        lang_lower = (language or "").lower()
        if lang_lower in {"ml", "ml-in", "malayalam"}:
            return "ml"
        if lang_lower in {"kn", "kn-in", "kannada"}:
            return "kn"
        if lang_lower in {"mr", "mr-in", "marathi"}:
            return "mr"
        if lang_lower in {"gu", "gu-in", "gujarati"}:
            return "gu"
        if lang_lower in {"tcy", "tcy-in", "tulu"}:
            return "tcy"
        if lang_lower in {"kok", "kok-in", "konkani", "kokani"}:
            return "kok"
        if lang_lower in {"bn", "bn-in", "bengali", "bangla"}:
            return "bn"
        if lang_lower in {"or", "or-in", "odia", "oriya"}:
            return "or"
        if lang_lower in {"ta", "ta-in"}:
            return "ta"
        if lang_lower in {"te", "te-in"}:
            return "te"
        if lang_lower in {"hi", "hi-in"}:
            return "hi"
        if query:
            if any("\u0d00" <= c <= "\u0d7f" for c in query):
                return "ml"
            if any("\u0c80" <= c <= "\u0cff" for c in query):
                return "kn"
            if any("\u0a80" <= c <= "\u0aff" for c in query):
                return "gu"
            if any("\u0980" <= c <= "\u09ff" for c in query):
                return "bn"
            if any("\u0b00" <= c <= "\u0b7f" for c in query):
                return "or"
            if any("\u0b80" <= c <= "\u0bff" for c in query):
                return "ta"
            if any("\u0c00" <= c <= "\u0c7f" for c in query):
                return "te"
            if any("\u0900" <= c <= "\u097f" for c in query):
                return "hi"
        return "en"
