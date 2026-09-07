"""Coordinates parsing, workflow execution, assessment, and recommendations."""

from datetime import datetime, timezone
from uuid import uuid4
from app.analysis.assess import assess_results
from app.analysis.recommendation import build_recommendations
from app.core.context import QueryContext
from app.core.query_parser import QueryParser
from app.schemas.orca import OrcaQueryRequest, OrcaQueryResponse
from app.workflows.orca_graph import OrcaWorkflow

 
class OrcaOrchestrator:
    def __init__(self, parser: QueryParser | None = None, workflow: OrcaWorkflow | None = None) -> None:
        self.parser = parser or QueryParser()
        self.workflow = workflow or OrcaWorkflow()

    async def handle(self, request: OrcaQueryRequest) -> OrcaQueryResponse:
        parsed = self.parser.parse(request.query)
        context = QueryContext(parsed, request.location.model_dump() if request.location else None, request.time_range, request.context)
        result = await self.workflow.run(context)
        assessment = assess_results(result.get("analysis_results", {}))
        recommendations = build_recommendations(assessment, result.get("analysis_results"))
        return OrcaQueryResponse(query_id=str(uuid4()), answer=result.get("answer", "ORCA has recorded the request; live agent integrations are not configured."), intent=parsed.intent, agents_used=result.get("agents_used", []), assessment=assessment, recommendations=recommendations, evidence=result.get("evidence", []), created_at=datetime.now(timezone.utc))
