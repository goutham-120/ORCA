"""Phase 3 RAG integration tests for Ask ORCA.

Validates:
A. RAG disabled (RAG_ENABLED=false)
B. RAG enabled knowledge query (Indian mackerel)
C. Live + RAG combined query (live telemetry + fishing knowledge)
D. Regulation query (2026 fishing ban)
E. Marine safety query (maritime distress)
F. Out-of-domain query ("What is the capital of France?")
G. RAG failure resilience (retriever exception does not crash ORCA)
H. Multi-turn conversation preserving context across turns
"""
from __future__ import annotations

import unittest
from unittest.mock import patch

from app.core.orchestrator import OrcaOrchestrator
from app.schemas.orca import OrcaQueryRequest
from app.services.data_coordinator import DataCoordinator
from app.workflows.orca_graph import OrcaWorkflow


class MockLiveSource:
    def __init__(self, data: dict):
        self.data = data

    async def fetch(self, request):
        return self.data


MOCK_WEATHER = {
    "available": True,
    "source_status": "live",
    "provider": "Open-Meteo Forecast API",
    "observation": {
        "condition": "clear sky",
        "wind_speed_mps": 4.5,
        "precipitation_mm": 0.0,
        "air_temperature_c": 28.5,
    },
}

MOCK_OCEAN = {
    "available": True,
    "source_status": "live",
    "provider": "Open-Meteo Marine API",
    "observation": {
        "wave_height_m": 1.2,
        "wave_period_s": 7.0,
        "sea_surface_temperature_c": 27.8,
    },
}


def build_test_orchestrator():
    coordinator = DataCoordinator()
    coordinator.register("weather", MockLiveSource(MOCK_WEATHER))
    coordinator.register("ocean", MockLiveSource(MOCK_OCEAN))
    workflow = OrcaWorkflow(coordinator=coordinator, auto_sync_pfz=False)
    return OrcaOrchestrator(workflow=workflow, location_resolver=None)


class Phase3RAGIntegrationTests(unittest.IsolatedAsyncioTestCase):

    # -------------------------------------------------------------
    # A. RAG Disabled Mode
    # -------------------------------------------------------------
    async def test_a_rag_disabled(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "false"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What are the environmental conditions associated with Indian mackerel?"
            )
            resp = await orchestrator.handle(req)

            self.assertIsNotNone(resp.rag)
            self.assertFalse(resp.rag.used)
            self.assertEqual(resp.rag.status, "disabled")
            self.assertEqual(len(resp.rag.retrieved_chunks), 0)
            self.assertFalse(any("CMFRI" in s for s in resp.rag.sources))

    # -------------------------------------------------------------
    # B. RAG Enabled Knowledge Query (Indian Mackerel)
    # -------------------------------------------------------------
    async def test_b_rag_enabled_species_mackerel(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What environmental conditions are associated with Indian mackerel?"
            )
            resp = await orchestrator.handle(req)

            self.assertIsNotNone(resp.rag)
            self.assertTrue(resp.rag.used)
            self.assertEqual(resp.rag.status, "success")
            self.assertGreater(len(resp.rag.retrieved_chunks), 0)

            # Check that CMFRI source is present in provenance
            cmfri_found = any("CMFRI" in s or "Mackerel" in s for s in resp.rag.sources)
            self.assertTrue(cmfri_found, f"Expected CMFRI source in: {resp.rag.sources}")

            # Check chunk content relevance
            first_chunk = resp.rag.retrieved_chunks[0]
            self.assertIn("mackerel", first_chunk["content"].lower())
            self.assertIn("page_number", first_chunk)

    # -------------------------------------------------------------
    # C. Live + RAG Combined Query
    # -------------------------------------------------------------
    async def test_c_live_and_rag_combined(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What are the current marine conditions and what do they mean for fishing?",
                location={"latitude": 17.7, "longitude": 83.3, "label": "Visakhapatnam Coast"},
            )
            resp = await orchestrator.handle(req)

            # 1. Live evidence exists
            self.assertGreater(len(resp.evidence), 0)
            live_providers = [e.source for e in resp.evidence]
            self.assertTrue(any("Open-Meteo" in p for p in live_providers))

            # 2. RAG knowledge exists
            self.assertIsNotNone(resp.rag)
            self.assertTrue(resp.rag.used)
            self.assertGreater(len(resp.rag.retrieved_chunks), 0)

            # 3. Live and RAG are distinct
            rag_docs = [c["document"] for c in resp.rag.retrieved_chunks]
            for doc in rag_docs:
                self.assertNotIn("Open-Meteo", doc)

    # -------------------------------------------------------------
    # D. Regulation Query (Fishing Ban 2026)
    # -------------------------------------------------------------
    async def test_d_regulation_query_fishing_ban(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(query="What are the 2026 fishing ban dates?")
            resp = await orchestrator.handle(req)

            self.assertIsNotNone(resp.rag)
            self.assertTrue(resp.rag.used)
            combined_text = " ".join(c["content"].lower() for c in resp.rag.retrieved_chunks)
            self.assertTrue("ban" in combined_text or "fishing" in combined_text)
            self.assertGreater(len(resp.rag.sources), 0)

    # -------------------------------------------------------------
    # E. Safety Query (Maritime Distress)
    # -------------------------------------------------------------
    async def test_e_safety_query_maritime_distress(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What should fishermen do during a maritime distress situation?"
            )
            resp = await orchestrator.handle(req)

            self.assertIsNotNone(resp.rag)
            self.assertTrue(resp.rag.used)
            safety_found = any(
                "NMSAR" in s or "Safety" in s or "Coast Guard" in s or "Waters" in s
                for s in resp.rag.sources
            )
            self.assertTrue(safety_found, f"Expected safety source in: {resp.rag.sources}")

    # -------------------------------------------------------------
    # F. Out-of-Domain Query (Capital of France)
    # -------------------------------------------------------------
    async def test_f_out_of_domain_query(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(query="What is the capital of France?")
            resp = await orchestrator.handle(req)

            # RAG should NOT retrieve knowledge for out-of-domain query
            self.assertIsNotNone(resp.rag)
            self.assertFalse(resp.rag.used)
            self.assertEqual(resp.response_kind, "general")
            self.assertEqual(len(resp.rag.retrieved_chunks), 0)

    # -------------------------------------------------------------
    # G. RAG Failure Resilience
    # -------------------------------------------------------------
    async def test_g_rag_failure_resilience(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            with patch("app.rag.retriever.RAGRetriever.retrieve", side_effect=RuntimeError("Simulated ChromaDB failure")):
                orchestrator = build_test_orchestrator()
                req = OrcaQueryRequest(
                    query="What environmental conditions are associated with Indian mackerel?"
                )
                # Must not raise an exception
                resp = await orchestrator.handle(req)

                self.assertIsNotNone(resp.rag)
                self.assertFalse(resp.rag.used)
                self.assertEqual(resp.rag.status, "error")
                self.assertIsNotNone(resp.answer)

    # -------------------------------------------------------------
    # H. Multi-Turn Conversation Preserving Context
    # -------------------------------------------------------------
    async def test_h_multi_turn_conversation(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            conv_id = "test-multi-turn-conv-001"

            # Turn 1
            req1 = OrcaQueryRequest(
                query="What is an Indian mackerel?",
                conversation_id=conv_id,
            )
            resp1 = await orchestrator.handle(req1)
            self.assertIsNotNone(resp1.answer)
            self.assertEqual(resp1.conversation_id, conv_id)

            # Turn 2
            req2 = OrcaQueryRequest(
                query="What environmental conditions affect it?",
                conversation_id=conv_id,
            )
            resp2 = await orchestrator.handle(req2)
            self.assertIsNotNone(resp2.answer)
            self.assertEqual(resp2.conversation_id, conv_id)

            # Turn 3
            req3 = OrcaQueryRequest(
                query="How does that affect fishing?",
                conversation_id=conv_id,
                location={"latitude": 15.4, "longitude": 73.8, "label": "Goa Coast"},
            )
            resp3 = await orchestrator.handle(req3)
            self.assertIsNotNone(resp3.answer)
            self.assertEqual(resp3.conversation_id, conv_id)
            self.assertEqual(resp3.context.get("location", {}).get("label"), "Goa Coast")
