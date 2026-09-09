"""Coordinates parsing, workflow execution, assessment, and recommendations."""

from datetime import datetime, timezone
from uuid import uuid4
from app.analysis.assess import assess_results
from app.analysis.recommendation import build_recommendations
from app.core.context import QueryContext
from app.core.conversation import synthesize_answer
from app.core.query_parser import QueryParser
from app.schemas.common import Location
from app.schemas.orca import OrcaQueryRequest, OrcaQueryResponse
from app.workflows.orca_graph import OrcaWorkflow

 
class OrcaOrchestrator:
    def __init__(self, parser: QueryParser | None = None, workflow: OrcaWorkflow | None = None) -> None:
        self.parser = parser or QueryParser()
        self.workflow = workflow or OrcaWorkflow()

    async def handle(self, request: OrcaQueryRequest) -> OrcaQueryResponse:
        parsed = self.parser.parse(request.query)
        metadata = dict(request.context)
        prior = metadata.get("conversation_context") if isinstance(metadata.get("conversation_context"), dict) else {}
        location = request.location.model_dump() if request.location else self._valid_location(prior.get("location"))
        time_range = request.time_range if request.time_range is not None else self._valid_time_range(prior.get("time_range"))
        if parsed.requested_location:
            metadata["requested_location"] = parsed.requested_location
        elif prior.get("requested_location"):
            metadata["requested_location"] = prior["requested_location"]
        if parsed.time_expression:
            metadata["time_expression"] = parsed.time_expression
        elif prior.get("time_expression"):
            metadata["time_expression"] = prior["time_expression"]
        context = QueryContext(parsed, location, time_range, metadata)
        result = await self.workflow.run(context)
        pending_domains = list(result.get("pending_domains", []))
        required_domains = self._safety_required_domains(parsed.requested_domains)
        for domain in required_domains:
            if domain not in result.get("analysis_results", {}) and domain not in pending_domains:
                pending_domains.append(domain)
        assessment = assess_results(result.get("analysis_results", {}), required_domains=required_domains, pending_domains=pending_domains)
        recommendations = build_recommendations(assessment, result.get("analysis_results"))
        response_context = {
            "location": location,
            "time_range": time_range,
            "requested_location": metadata.get("requested_location"),
            "time_expression": metadata.get("time_expression"),
        }
        unavailable_domains = [name for name, value in result.get("analysis_results", {}).items() if name in {"ocean", "weather", "gis"} and isinstance(value, dict) and value.get("data_status") not in {"live", "cached", "static"}]
        answer = synthesize_answer(request.query, assessment, result.get("analysis_results", {}), pending_domains, response_context, request.language)
        return OrcaQueryResponse(query_id=str(uuid4()), answer=answer, intent=parsed.intent, agents_used=result.get("agents_used", []), assessment=assessment, recommendations=recommendations, evidence=result.get("evidence", []), created_at=datetime.now(timezone.utc), conversation_id=request.conversation_id, language=self._response_language(request.language), context=response_context, pending_domains=pending_domains, unavailable_domains=unavailable_domains)

    @staticmethod
    def _safety_required_domains(domains: list[str]) -> list[str]:
        if "safety" not in domains:
            return []
        required = ["ocean", "weather", "gis"]
        return required + (["pfz"] if "pfz" in domains else [])

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
    def _response_language(language: str) -> str:
        return "hi" if language.lower() in {"hi", "hi-in"} else "en"
