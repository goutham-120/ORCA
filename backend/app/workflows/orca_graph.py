"""The compiled LangGraph runtime used by Ask ORCA."""
from __future__ import annotations
from typing import Any, TypedDict
from langgraph.graph import END, START, StateGraph
from app.agents.gis_agent import GISAgent
from app.agents.ocean_agent import OceanAgent
from app.agents.weather_agent import WeatherAgent
from app.core.context import QueryContext
from app.llm.client import LLMClient, OpenAICompatibleLLM
from app.schemas.ai import QueryPlan, Subtask
from app.services.data_coordinator import DataCoordinator
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

class OrcaWorkflow:
    stages=("context_preparation","query_understanding","planning","agent_selection","agent_execution","evidence_collection","evidence_validation","grounded_synthesis","final_response")
    def __init__(self, coordinator: DataCoordinator | None=None, llm: LLMClient | None=None) -> None:
        self.coordinator=coordinator or DataCoordinator()
        if "weather" not in self.coordinator._sources: self.coordinator.register("weather", WeatherTool())
        if "ocean" not in self.coordinator._sources: self.coordinator.register("ocean", OceanTool())
        self._agents={"weather":WeatherAgent(),"ocean":OceanAgent(),"gis":GISAgent()}; self.llm=llm or OpenAICompatibleLLM(); self.graph=self.build_langgraph()
    def build_langgraph(self) -> Any:
        graph=StateGraph(OrcaState)
        for name, node in (("context_preparation",self._prepare),("query_understanding",self._understand),("planning",self._plan),("agent_execution",self._execute),("evidence_collection",self._evidence),("evidence_validation",self._validate),("grounded_synthesis",self._synthesize),("final_response",self._final)): graph.add_node(name,node)
        graph.add_edge(START,"context_preparation"); graph.add_edge("context_preparation","query_understanding"); graph.add_edge("query_understanding","planning")
        graph.add_conditional_edges("planning",self._route,{"agents":"agent_execution","no_agents":"evidence_collection"})
        graph.add_edge("agent_execution","evidence_collection"); graph.add_edge("evidence_collection","evidence_validation"); graph.add_edge("evidence_validation","grounded_synthesis"); graph.add_edge("grounded_synthesis","final_response"); graph.add_edge("final_response",END)
        return graph.compile()
    async def run(self, context: QueryContext) -> dict[str, Any]: return await self.graph.ainvoke({"context":context})
    async def _prepare(self,state: OrcaState)->dict[str,Any]: return {"pending_domains":[]}
    async def _understand(self,state: OrcaState)->dict[str,Any]: return {}
    async def _plan(self,state: OrcaState)->dict[str,Any]:
        ctx=state["context"]; p=ctx.parsed_query; domains=[d for d in p.requested_domains if d in {"ocean","weather","gis","pfz"}]
        fallback=QueryPlan(intent=p.intent,requested_domains=domains,location_required=bool(domains),time_expression=p.time_expression,subtasks=[Subtask(id=f"{d}-evidence",domain=d,purpose=f"retrieve {d} evidence",evidence_required=[f"{d} evidence"]) for d in domains if d in self._agents],response_focus=self._persona_focus(str(ctx.metadata.get("persona","general_user"))))
        llm_plan=await self.llm.plan(p.normalized,fallback,str(ctx.metadata.get("persona","general_user")))
        plan=llm_plan if llm_plan and set(llm_plan.requested_domains).issubset(set(domains)) else fallback
        # GIS cannot operate without coordinates. Ocean/weather are still called
        # through their provider boundary so they can return their explicit
        # unavailable state (and no place name is ever geocoded here).
        selected=[d for d in plan.requested_domains if d in self._agents and (d != "gis" or ctx.location is not None)]; pending=[d for d in p.requested_domains if d not in selected]
        ctx.metadata["plan"]=plan.model_dump(); ctx.metadata["pending_domains"]=pending
        return {"plan":plan,"selected":selected,"agents_used":selected,"pending_domains":pending,"llm_mode":"llm" if llm_plan else "deterministic_fallback"}
    def _route(self,state: OrcaState)->str: return "agents" if state.get("selected") else "no_agents"
    async def _execute(self,state: OrcaState)->dict[str,Any]:
        ctx=state["context"]; selected=state.get("selected",[]); collected=await self.coordinator.collect([d for d in selected if d in {"ocean","weather"}],ctx.as_dict()); results={}
        for d in selected:
            try: results[d]=self._agents[d].interpret(ctx.as_dict() if d=="gis" else collected.get(d,{}))
            except Exception as exc: results[d]={"summary":f"{d.title()} analysis failed.","data_status":"unavailable","error":str(exc),"concerns":[],"risk_score":None}
        ctx.agent_results.update(results); return {"collected":collected,"analysis_results":results}
    async def _evidence(self,state: OrcaState)->dict[str,Any]:
        out=[]
        for name,data in state.get("collected",{}).items(): out.append({"source":data.get("provider","unavailable provider"),"summary":f"{name.title()} data status: {data.get('source_status','unavailable')}","url":data.get("source_url"),"observed_at":(data.get("observation") or {}).get("timestamp"),"metadata":{"domain":name,"data_status":data.get("source_status","unavailable"),"error":data.get("error"),"measurements":data.get("observation") or {}}})
        if "gis" in state.get("analysis_results",{}):
            r=state["analysis_results"]["gis"]; out.append({"source":"GIS integration","summary":f"GIS data status: {r.get('data_status')}","url":None,"observed_at":None,"metadata":{"domain":"gis","data_status":r.get("data_status"),"error":r.get("error"),"results":r.get("results",{})}})
        return {"evidence":out}
    async def _validate(self,state: OrcaState)->dict[str,Any]: return {}
    async def _synthesize(self,state: OrcaState)->dict[str,Any]:
        unavailable=[d for d,r in state.get("analysis_results",{}).items() if r.get("data_status") not in {"live","cached","static"}]
        return {"answer":"ORCA completed evidence-grounded analysis." + (" Unavailable: "+", ".join(unavailable)+"." if unavailable else "")}
    async def _final(self,state: OrcaState)->dict[str,Any]: return {}
    @staticmethod
    def _persona_focus(persona:str)->str: return {"fisher_marine_operator":"practical fishing suitability and safety","researcher_scientist":"measurements, timestamps, and provenance","coastal_authority":"risk severity and monitoring implications"}.get(persona,"clear, understandable conditions")
