import unittest
from app.core.context import QueryContext
from app.core.query_parser import QueryParser
from app.schemas.ai import QueryPlan
from app.services.data_coordinator import DataCoordinator
from app.workflows.orca_graph import OrcaWorkflow

class Source:
    def __init__(self, result): self.result = result
    async def fetch(self, request): return self.result

class BadLLM:
    async def plan(self, query, fallback, persona): return None

class RuntimeTests(unittest.IsolatedAsyncioTestCase):
    def workflow(self):
        c=DataCoordinator()
        c.register("weather", Source({"available":True,"source_status":"live","provider":"weather fixture","observation":{"wind_speed_mps":2}}))
        c.register("ocean", Source({"available":True,"source_status":"live","provider":"ocean fixture","observation":{"wave_height_m":1}}))
        return OrcaWorkflow(c, BadLLM())
    async def test_compiled_graph_invokes_only_weather(self):
        wf=self.workflow(); context=QueryContext(QueryParser().parse("weather"), {"latitude":17.7,"longitude":83.3})
        result=await wf.run(context)
        self.assertEqual(result["selected"],["weather"])
        self.assertEqual(result["llm_mode"],"deterministic_fallback")
        self.assertEqual(result["evidence"][0]["metadata"]["domain"],"weather")
    async def test_mixed_query_routes_all_requested_agents(self):
        wf=self.workflow(); context=QueryContext(QueryParser().parse("ocean weather near coordinates"), {"latitude":17.7,"longitude":83.3})
        result=await wf.run(context)
        self.assertEqual(set(result["selected"]), {"ocean","weather","gis"})
        self.assertIn("gis", result["analysis_results"])
    async def test_plan_is_validated_and_persona_is_preserved(self):
        wf=self.workflow(); context=QueryContext(QueryParser().parse("waves tomorrow"), {"latitude":17.7,"longitude":83.3}, metadata={"persona":"researcher_scientist"})
        result=await wf.run(context)
        self.assertIsInstance(result["plan"], QueryPlan)
        self.assertIn("timestamps", result["plan"].response_focus)
