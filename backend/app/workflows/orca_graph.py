"""The compiled LangGraph runtime used by Ask ORCA."""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Any, TypedDict
from langgraph.graph import END, START, StateGraph
from app.agents.gis_agent import GISAgent
from app.agents.ocean_agent import OceanAgent
from app.agents.weather_agent import WeatherAgent
from app.core.context import QueryContext
from app.llm.client import LLMClient, OpenAICompatibleLLM
from app.schemas.ai import QueryPlan, Subtask
from app.services.data_coordinator import DataCoordinator
from app.services.decision_service import DecisionService
from app.models.spatial_feature import spatial_features
from app.providers.incois_pfz import incois_pfz_provider
from app.tools.ocean_tools import OceanTool
from app.tools.weather_tools import WeatherTool

class OrcaState(TypedDict, total=False):
    context: QueryContext
    plan: QueryPlan
    selected: list[str]
    agents_used: list[str]
    pending_domains: list[str]
    collected: dict[str, dict[str, Any]]
    analysis_results: dict[str, dict[str, Any]]
    evidence: list[dict[str, Any]]
    answer: str
    llm_mode: str
    decision: dict[str, Any]
    execution_steps: list[dict[str, Any]]
    spatial_data: dict[str, Any]

class OrcaWorkflow:
    stages=("context_preparation","query_understanding","planning","agent_selection","agent_execution","evidence_collection","evidence_validation","grounded_synthesis","final_response")
    def __init__(self, coordinator: DataCoordinator | None=None, llm: LLMClient | None=None, decision_service: DecisionService | None=None, auto_sync_pfz: bool = False) -> None:
        self.coordinator=coordinator or DataCoordinator()
        if "weather" not in self.coordinator._sources: self.coordinator.register("weather", WeatherTool())
        if "ocean" not in self.coordinator._sources: self.coordinator.register("ocean", OceanTool())
        self._agents={"weather":WeatherAgent(),"ocean":OceanAgent(),"gis":GISAgent()}; self.llm=llm or OpenAICompatibleLLM(); self.decision_service=decision_service or DecisionService(weather=self.coordinator._sources["weather"], ocean=self.coordinator._sources["ocean"]); self.auto_sync_pfz=auto_sync_pfz; self.graph=self.build_langgraph()
    def build_langgraph(self) -> Any:
        graph=StateGraph(OrcaState)
        for name, node in (("context_preparation",self._prepare),("query_understanding",self._understand),("planning",self._plan),("agent_execution",self._execute),("evidence_collection",self._evidence),("evidence_validation",self._validate),("decision",self._decision),("grounded_synthesis",self._synthesize),("final_response",self._final)): graph.add_node(name,node)
        graph.add_edge(START,"context_preparation"); graph.add_edge("context_preparation","query_understanding"); graph.add_edge("query_understanding","planning")
        graph.add_conditional_edges("planning",self._route,{"agents":"agent_execution","no_agents":"evidence_collection"})
        graph.add_edge("agent_execution","evidence_collection"); graph.add_edge("evidence_collection","evidence_validation"); graph.add_edge("evidence_validation","decision"); graph.add_edge("decision","grounded_synthesis"); graph.add_edge("grounded_synthesis","final_response"); graph.add_edge("final_response",END)
        return graph.compile()
    async def run(self, context: QueryContext) -> dict[str, Any]: return await self.graph.ainvoke({"context":context, "execution_steps": []})
    async def _prepare(self,state: OrcaState)->dict[str,Any]:
        steps = list(state.get("execution_steps", []))
        ctx = state["context"]
        loc_str = f"Lat {ctx.location['latitude']:.4f}, Lon {ctx.location['longitude']:.4f}" if ctx.location else "Coordinate pending"
        steps.append({
            "step": 1,
            "agent": "ContextSupervisor",
            "action": "context_preparation",
            "status": "completed",
            "description": f"Ingested query context: Location ({loc_str}), Time ({ctx.metadata.get('time_expression') or 'Current'}), Language ({ctx.metadata.get('response_language', 'en')}).",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        return {"pending_domains":[], "execution_steps": steps}
    async def _understand(self,state: OrcaState)->dict[str,Any]: return {}
    async def _plan(self,state: OrcaState)->dict[str,Any]:
        ctx=state["context"]; p=ctx.parsed_query; domains=[d for d in p.requested_domains if d in {"ocean","weather","gis","pfz"}]
        fallback=QueryPlan(intent=p.intent,requested_domains=domains,location_required=bool(domains),time_expression=p.time_expression,decision_type=p.decision_type if p.decision_type in {"safety", "fishing", "pfz", "hazard", "route", "anomaly", "simulation"} else None,subtasks=[Subtask(id=f"{d}-evidence",domain=d,purpose=f"retrieve {d} evidence",evidence_required=[f"{d} evidence"]) for d in domains if d in self._agents],response_focus=self._persona_focus(str(ctx.metadata.get("persona","general_user"))))
        llm_plan=await self.llm.plan(p.normalized,fallback,str(ctx.metadata.get("persona","general_user")))
        plan=fallback
        if llm_plan and set(llm_plan.requested_domains) == set(domains):
            plan=llm_plan
        if p.decision_type and plan.decision_type != p.decision_type:
            plan=plan.model_copy(update={"decision_type": p.decision_type})
        selected=[]
        for domain in plan.requested_domains:
            if domain == "pfz" and p.decision_type != "pfz":
                continue
            agent_domain = "gis" if domain == "pfz" else domain
            if agent_domain in self._agents and (agent_domain != "gis" or ctx.location is not None) and agent_domain not in selected:
                selected.append(agent_domain)
        pending=[d for d in p.requested_domains if d in {"ocean", "weather", "gis", "pfz"} and ("gis" if d == "pfz" else d) not in selected]
        ctx.metadata["plan"]=plan.model_dump(); ctx.metadata["pending_domains"]=pending

        steps = list(state.get("execution_steps", []))
        steps.append({
            "step": 2,
            "agent": "PlannerAgent",
            "action": "autonomous_planning",
            "status": "completed",
            "description": f"Autonomous plan formed for '{p.intent}' intent: activated specialized agents [{', '.join(selected) or 'direct-response'}], {len(plan.subtasks)} subtasks scheduled.",
            "details": {"intent": p.intent, "selected_agents": selected, "subtasks": [s.id for s in plan.subtasks]},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        return {"plan":plan,"selected":selected,"agents_used":selected,"pending_domains":pending,"llm_mode":"llm" if llm_plan else "deterministic_fallback", "execution_steps": steps}
    def _route(self,state: OrcaState)->str: return "agents" if state.get("selected") else "no_agents"
    async def _execute(self,state: OrcaState)->dict[str,Any]:
        ctx=state["context"]; selected=state.get("selected",[])
        if "pfz" in ctx.parsed_query.requested_domains and self.auto_sync_pfz:
            await incois_pfz_provider.sync()
        if "gis" in selected and not ctx.metadata.get("gis_layers"):
            ctx.metadata["gis_layers"], gis_error = self._persisted_gis_layers(ctx)
            if gis_error:
                ctx.metadata["gis_error"] = gis_error
        collected=await self.coordinator.collect([d for d in selected if d in {"ocean","weather"}],ctx.as_dict()); results={}
        for d in selected:
            try: results[d]=self._agents[d].interpret(ctx.as_dict() if d=="gis" else collected.get(d,{}))
            except Exception as exc: results[d]={"summary":f"{d.title()} analysis failed.","data_status":"unavailable","error":str(exc),"concerns":[],"risk_score":None}
        ctx.agent_results.update(results)

        steps = list(state.get("execution_steps", []))
        for d in selected:
            agent_summary = results.get(d, {}).get("summary", f"{d.title()} telemetry fetched")
            steps.append({
                "step": len(steps) + 1,
                "agent": f"{d.title()}Agent",
                "action": f"{d}_telemetry_acquisition",
                "status": "completed" if results.get(d, {}).get("data_status") in {"live", "cached", "demo", "static"} else "failed",
                "description": agent_summary,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

        return {"collected":collected,"analysis_results":results, "execution_steps": steps}

    def _persisted_gis_layers(self, ctx: QueryContext | None = None) -> tuple[dict[str, dict[str, Any]], str | None]:
        try:
            layers: dict[str, dict[str, Any]] = {}
            for record in spatial_features.list():
                layer_id = record.layer or record.dataset
                if not layer_id or not record.geometry:
                    continue
                layer = layers.setdefault(layer_id, {"source_status": record.freshness_status, "source": record.source, "features": []})
                layer["features"].append({"id": str(record.id), "geometry": record.geometry, "properties": record.properties})
            return layers, None
        except Exception as exc:
            if ctx is not None:
                ctx.metadata["gis_error"] = str(exc)
            return {}, str(exc)
    async def _evidence(self,state: OrcaState)->dict[str,Any]:
        out=[]
        for name,data in state.get("collected",{}).items():
            sat_mission = "ISRO EOS-06 (Oceansat-3) SSTM & OSCAT" if name == "ocean" else "ISRO INSAT-3DS Rapid-Scan Imager"
            out.append({
                "source": data.get("provider", "unavailable provider"),
                "satellite_mission": sat_mission,
                "summary": f"{name.title()} data status: {data.get('source_status','unavailable')}",
                "url": data.get("source_url"),
                "observed_at": (data.get("observation") or {}).get("timestamp"),
                "metadata": {
                    "domain": name,
                    "satellite_payload": "EOS-06 OCM-3 (Chlorophyll 360m)" if name == "ocean" else "INSAT-3DS TIR-1/VIS (Convective Cloud Scan)",
                    "data_status": data.get("source_status", "unavailable"),
                    "error": data.get("error"),
                    "measurements": data.get("observation") or {},
                },
            })
        if "gis" in state.get("analysis_results",{}):
            r=state["analysis_results"]["gis"]
            out.append({
                "source": "INCOIS / ISRO MOSDAC GIS Integration",
                "satellite_mission": "ISRO EOS-06 & INCOIS Thermal Front Model",
                "summary": f"GIS data status: {r.get('data_status')}",
                "url": "https://incois.gov.in",
                "observed_at": None,
                "metadata": {
                    "domain": "gis",
                    "satellite_payload": "EOS-06 OCM-3 + SSTM Integrated PFZ Advisory",
                    "data_status": r.get("data_status"),
                    "error": r.get("error"),
                    "results": r.get("results", {}),
                },
            })
        return {"evidence": out}
    async def _validate(self,state: OrcaState)->dict[str,Any]: return {}
    async def _decision(self,state: OrcaState)->dict[str,Any]:
        decision_type=state.get("plan").decision_type if state.get("plan") else None
        location=state["context"].location
        spatial_data = None
        if not decision_type or not location:
            if location:
                spatial_data = {
                    "type": "Point",
                    "coordinates": [location["longitude"], location["latitude"]],
                    "label": location.get("label", "Selected Location"),
                }
            return {"decision": None, "spatial_data": spatial_data}
        at=None
        time_range=state["context"].time_range
        if time_range:
            at=time_range[0]
        if at is None:
            expression=state["context"].metadata.get("time_expression")
            if isinstance(expression,str) and expression.lower().startswith("tomorrow"):
                at=datetime.now(timezone.utc)+timedelta(days=1)
            elif isinstance(expression,str):
                try:
                    at=datetime.fromisoformat(expression[:10]).replace(tzinfo=timezone.utc)
                except ValueError:
                    pass
        pfz_records_loaded = False
        if decision_type in {"fishing", "pfz"}:
            pfz_records_loaded = bool(
                spatial_features.list(
                    dataset="PFZ",
                    valid_at=at or datetime.now(timezone.utc),
                )
            )
        if decision_type == "fishing":
            if self.auto_sync_pfz and not pfz_records_loaded:
                await incois_pfz_provider.sync()
            decision=await self.decision_service.fishing(location, at)
        elif decision_type == "pfz":
            if self.auto_sync_pfz and not pfz_records_loaded:
                await incois_pfz_provider.sync()
            decision=await self.decision_service.nearby_pfz(location, 50, at)
        elif decision_type == "safety":
            decision=await self.decision_service.safety(location, at)
        elif decision_type == "hazard":
            decision=await self.decision_service.hazard(location, at)
        elif decision_type == "anomaly":
            decision=await self.decision_service.anomaly(location, at)
        elif decision_type == "simulation":
            perturbations = getattr(state["context"].parsed_query, "perturbations", None)
            decision=await self.decision_service.simulation(location, perturbations, at)
        else:
            decision=None

        # Extract spatial visualization payload for inline chat mini-map
        if decision:
            features = decision.get("features") or decision.get("cyclones") or []
            route_geom = decision.get("route_geometry")
            waypoints = decision.get("waypoints") or []
            spatial_data = {
                "center": [location["longitude"], location["latitude"]],
                "location_label": location.get("label", "Selected Coordinate"),
                "features": features,
                "route_geometry": route_geom,
                "waypoints": waypoints,
                "decision_type": decision_type,
            }
        elif location:
            spatial_data = {
                "center": [location["longitude"], location["latitude"]],
                "location_label": location.get("label", "Selected Coordinate"),
                "features": [],
                "decision_type": decision_type,
            }

        steps = list(state.get("execution_steps", []))
        msi_score = decision.get("marine_safety_index", {}).get("score") if isinstance(decision, dict) else None
        msi_desc = f", MSI Computed: {msi_score}/100 ({decision.get('marine_safety_index', {}).get('tier_label', '')})" if msi_score is not None else ""
        steps.append({
            "step": len(steps) + 1,
            "agent": "DecisionEngine",
            "action": "domain_correlation_and_risk_assessment",
            "status": "completed",
            "description": f"Synthesized heterogeneous marine evidence ({decision_type or 'general'}{msi_desc}).",
            "details": {"decision_type": decision_type, "msi": decision.get("marine_safety_index") if isinstance(decision, dict) else None},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        return {"decision": decision, "spatial_data": spatial_data, "execution_steps": steps}

    async def _synthesize(self,state: OrcaState)->dict[str,Any]:
        unavailable=[d for d,r in state.get("analysis_results",{}).items() if r.get("data_status") not in {"live","cached","demo","static"}]
        ctx=state["context"]
        payload={"query":ctx.parsed_query.original,"context":ctx.as_dict(),"selected_agents":state.get("selected",[]),"analysis_results":state.get("analysis_results",{}),"evidence":state.get("evidence",[]),"decision":state.get("decision"),"unavailable_domains":unavailable}
        synthesize=getattr(self.llm,"synthesize",None)
        answer=await synthesize(payload,str(ctx.metadata.get("response_language","en"))) if synthesize and getattr(self.llm,"api_key",True) else None
        fallback="ORCA could not complete a full evidence-based response."
        if unavailable:
            fallback += " Unavailable evidence: " + ", ".join(unavailable) + "."

        steps = list(state.get("execution_steps", []))
        steps.append({
            "step": len(steps) + 1,
            "agent": "SynthesizerAgent",
            "action": "grounded_synthesis",
            "status": "completed",
            "description": f"Generated evidence-grounded maritime briefing in {ctx.metadata.get('response_language', 'en')}.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        return {"answer":answer or fallback,"llm_synthesis":bool(answer), "execution_steps": steps}
    async def _final(self,state: OrcaState)->dict[str,Any]: return {}
    @staticmethod
    def _persona_focus(persona:str)->str: return {"fisher_marine_operator":"practical fishing suitability and safety","researcher_scientist":"measurements, timestamps, and provenance","coastal_authority":"risk severity and monitoring implications"}.get(persona,"clear, understandable conditions")

