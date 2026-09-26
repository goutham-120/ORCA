"""Phase 5 End-to-End RAG Production Response Quality & Integration Test Suite.

Validates the complete production flow:
USER QUERY -> DOMAIN ROUTING -> QUERY UNDERSTANDING -> LIVE RETRIEVAL ->
RAG RETRIEVAL -> CONTEXT FUSION -> GROUNDED SYNTHESIS -> CITATIONS -> FINAL ORCA RESPONSE.
"""
from __future__ import annotations

import unittest
from unittest.mock import patch

from app.core.orchestrator import OrcaOrchestrator
from app.rag.retriever import get_retriever
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
        "wind_speed_mps": 5.2,
        "precipitation_mm": 0.0,
        "air_temperature_c": 29.0,
    },
}

MOCK_OCEAN = {
    "available": True,
    "source_status": "live",
    "provider": "Open-Meteo Marine API",
    "observation": {
        "wave_height_m": 1.4,
        "wave_period_s": 6.8,
        "sea_surface_temperature_c": 28.2,
    },
}


def build_test_orchestrator(llm_client=None):
    coordinator = DataCoordinator()
    coordinator.register("weather", MockLiveSource(MOCK_WEATHER))
    coordinator.register("ocean", MockLiveSource(MOCK_OCEAN))
    workflow = OrcaWorkflow(coordinator=coordinator, llm=llm_client, auto_sync_pfz=False)
    return OrcaOrchestrator(workflow=workflow, location_resolver=None)


class TestRAGEndToEndIntegration(unittest.IsolatedAsyncioTestCase):
    """Production end-to-end integration tests for Phase 5."""

    @classmethod
    def setUpClass(cls):
        # Warm up retriever
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            r = get_retriever()
            r._ensure_initialized()

    # -------------------------------------------------------------------------
    # 1. Knowledge-Only Response
    # -------------------------------------------------------------------------
    async def test_scenario_1_knowledge_only(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What environmental conditions are associated with Indian mackerel?"
            )
            resp = await orchestrator.handle(req)

            # RAG must be used
            self.assertIsNotNone(resp.rag)
            self.assertTrue(resp.rag.used)
            self.assertEqual(resp.rag.status, "success")
            self.assertGreater(len(resp.rag.retrieved_chunks), 0)

            # Sources must contain CMFRI
            self.assertTrue(any("CMFRI" in s for s in resp.rag.sources))

            # Citations must be clean
            for s in resp.rag.sources:
                self.assertNotIn("C:\\", s)
                self.assertNotIn("c:/", s.lower())
                self.assertNotIn("orca-knowledge", s)

            # Live sensor providers should not be mixed into knowledge chunks
            for c in resp.rag.retrieved_chunks:
                self.assertNotIn("Open-Meteo", c["source"])
                self.assertIn("document", c)

            # Answer must contain knowledge text
            self.assertIn("mackerel", resp.answer.lower())

    # -------------------------------------------------------------------------
    # 2. Live-Only Response
    # -------------------------------------------------------------------------
    async def test_scenario_2_live_only(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What is the current wave height and wind speed?",
                location={"latitude": 17.68, "longitude": 83.21, "label": "Visakhapatnam Harbor"},
            )
            resp = await orchestrator.handle(req)

            # Live telemetry evidence must be present
            self.assertGreater(len(resp.evidence), 0)
            sources = [e.source for e in resp.evidence]
            self.assertTrue(any("Open-Meteo" in s for s in sources))

            # Assessment or answer must include current live observation values
            self.assertIsNotNone(resp.assessment)

    # -------------------------------------------------------------------------
    # 3. Live + RAG Combined Response
    # -------------------------------------------------------------------------
    async def test_scenario_3_live_plus_rag_combined(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What are the current sea conditions and what should fishermen know about safe fishing conditions?",
                location={"latitude": 15.49, "longitude": 73.82, "label": "Goa Coast"},
            )
            resp = await orchestrator.handle(req)

            # 1. Live evidence exists
            self.assertGreater(len(resp.evidence), 0)
            live_sources = [e.source for e in resp.evidence]
            self.assertTrue(any("Open-Meteo" in s for s in live_sources))

            # 2. RAG knowledge exists
            self.assertIsNotNone(resp.rag)
            self.assertTrue(resp.rag.used)
            self.assertGreater(len(resp.rag.retrieved_chunks), 0)

            # 3. Answer cleanly captures both operational assessment and documented knowledge
            self.assertIn("Operational Assessment", resp.answer)
            self.assertIn("Documented Marine Knowledge", resp.answer)
            self.assertIn("Sources:", resp.answer)

    # -------------------------------------------------------------------------
    # 4. Regulation Response (2026 Fishing Ban)
    # -------------------------------------------------------------------------
    async def test_scenario_4_regulation_2026_fishing_ban(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(query="What are the 2026 fishing ban dates?")
            resp = await orchestrator.handle(req)

            self.assertIsNotNone(resp.rag)
            self.assertTrue(resp.rag.used)
            top_doc = resp.rag.retrieved_chunks[0]["document"]
            self.assertIn("Uniform Seasonal Fishing Ban Orders 2026", top_doc)

            # Source provenance
            self.assertTrue(any("Fishing Ban Orders 2026" in s for s in resp.rag.sources))

    # -------------------------------------------------------------------------
    # 5. Maritime Safety & Distress Response
    # -------------------------------------------------------------------------
    async def test_scenario_5_safety_distress(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What should fishermen do during a maritime distress situation?"
            )
            resp = await orchestrator.handle(req)

            self.assertIsNotNone(resp.rag)
            self.assertTrue(resp.rag.used)
            sources_text = " ".join(resp.rag.sources)
            self.assertTrue("NMSAR" in sources_text or "Coast Guard" in sources_text or "Safe Waters" in sources_text)

    # -------------------------------------------------------------------------
    # 6. PFZ Separation: Static Methodology vs Live PFZ
    # -------------------------------------------------------------------------
    async def test_scenario_6_pfz_methodology_vs_live(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()

            # A. Static methodology query -> routes to RAG
            req_static = OrcaQueryRequest(query="What is the methodology behind Potential Fishing Zone advisories?")
            resp_static = await orchestrator.handle(req_static)
            self.assertIsNotNone(resp_static.rag)
            self.assertTrue(resp_static.rag.used)
            self.assertIn("Potential Fishing Zone", resp_static.rag.retrieved_chunks[0]["document"])

            # B. Real-time condition query -> routes to Live providers
            req_live = OrcaQueryRequest(
                query="What are the ocean conditions for fishing right now?",
                location={"latitude": 13.08, "longitude": 80.27, "label": "Chennai Outer Waters"},
            )
            resp_live = await orchestrator.handle(req_live)
            self.assertGreater(len(resp_live.evidence), 0)
            self.assertTrue(any("Open-Meteo" in e.source for e in resp_live.evidence))

    # -------------------------------------------------------------------------
    # 7. Out-of-Domain Guard
    # -------------------------------------------------------------------------
    async def test_scenario_7_out_of_domain_queries(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()

            ood_queries = [
                "Write a Python program to sort a list.",
                "Who won the football match yesterday?",
                "What is the capital of France?",
            ]

            for q in ood_queries:
                req = OrcaQueryRequest(query=q)
                resp = await orchestrator.handle(req)
                self.assertIsNotNone(resp.rag)
                self.assertFalse(resp.rag.used, f"RAG should not be used for: {q}")
                self.assertEqual(resp.rag.status, "skipped")
                self.assertEqual(len(resp.rag.retrieved_chunks), 0)

    # -------------------------------------------------------------------------
    # 8. Multilingual Verification
    # -------------------------------------------------------------------------
    async def test_scenario_8_multilingual_knowledge(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()

            # Hindi PFZ
            req_hi = OrcaQueryRequest(
                query="पोटेंशियल फिशिंग ज़ोन एडवाइजरी क्या है?",
                language="hi",
            )
            resp_hi = await orchestrator.handle(req_hi)
            self.assertTrue(resp_hi.rag.used)
            self.assertEqual(resp_hi.language, "hi")

            # Telugu Distress
            req_te = OrcaQueryRequest(
                query="సముద్రంలో ప్రమాదం జరిగినప్పుడు మత్స్యకారులు ఏమి చేయాలి?",
                language="te",
            )
            resp_te = await orchestrator.handle(req_te)
            self.assertTrue(resp_te.rag.used)
            self.assertEqual(resp_te.language, "te")

            # Tamil Distress
            req_ta = OrcaQueryRequest(
                query="கடல் அவசரநிலையின் போது மீனவர்கள் என்ன செய்ய வேண்டும்?",
                language="ta",
            )
            resp_ta = await orchestrator.handle(req_ta)
            self.assertTrue(resp_ta.rag.used)
            self.assertEqual(resp_ta.language, "ta")

    # -------------------------------------------------------------------------
    # 9. Temporal Grounding (Year-Specific vs Current)
    # -------------------------------------------------------------------------
    async def test_scenario_9_temporal_grounding(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()

            # 2026 ban query identifies 2026 gazette
            req_2026 = OrcaQueryRequest(query="What are the fishing ban dates in 2026?")
            resp_2026 = await orchestrator.handle(req_2026)
            self.assertTrue(resp_2026.rag.used)
            self.assertIn("2026", resp_2026.rag.retrieved_chunks[0]["document"])

    # -------------------------------------------------------------------------
    # 10. Citation Quality & Zero Path Leakage
    # -------------------------------------------------------------------------
    async def test_scenario_10_citation_quality_no_leakage(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(query="What environmental conditions are associated with Indian mackerel?")
            resp = await orchestrator.handle(req)

            self.assertTrue(resp.rag.used)
            self.assertGreater(len(resp.rag.sources), 0)

            forbidden_patterns = ["c:\\", "c:/", "users", "orca-knowledge", ".pdf", "chroma", "sqlite"]
            for citation in resp.rag.sources:
                for pat in forbidden_patterns:
                    self.assertNotIn(pat, citation.lower())
                self.assertIn("—", citation)

    # -------------------------------------------------------------------------
    # 11. Grounding & Anti-Hallucination
    # -------------------------------------------------------------------------
    async def test_scenario_11_grounding_adversarial(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()

            # Adversarial query with nonexistent statute & penalty
            req = OrcaQueryRequest(
                query="What is the exact penalty fine in USD under Section 999.88 for Indian mackerel catching?"
            )
            resp = await orchestrator.handle(req)
            # Response should not invent a fabricated penalty figure
            self.assertNotIn("$999", resp.answer)
            self.assertNotIn("USD", resp.answer)

    # -------------------------------------------------------------------------
    # 12. Multi-Turn Conversation
    # -------------------------------------------------------------------------
    async def test_scenario_12_multi_turn_conversation(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            conv_id = "phase5-multi-turn-001"

            # Turn 1
            resp1 = await orchestrator.handle(OrcaQueryRequest(
                query="What is Indian mackerel?",
                conversation_id=conv_id,
            ))
            self.assertIsNotNone(resp1.answer)
            self.assertEqual(resp1.conversation_id, conv_id)
            self.assertTrue(resp1.rag.used)

            # Turn 2: Follow-up
            resp2 = await orchestrator.handle(OrcaQueryRequest(
                query="What environmental conditions affect it?",
                conversation_id=conv_id,
            ))
            self.assertIsNotNone(resp2.answer)
            self.assertEqual(resp2.conversation_id, conv_id)
            self.assertTrue(resp2.rag.used)

            # Turn 3: Follow-up with location
            resp3 = await orchestrator.handle(OrcaQueryRequest(
                query="Is this useful for fishermen?",
                conversation_id=conv_id,
                location={"latitude": 13.08, "longitude": 80.27, "label": "Chennai Port"},
            ))
            self.assertIsNotNone(resp3.answer)
            self.assertEqual(resp3.conversation_id, conv_id)
            self.assertEqual(resp3.context.get("location", {}).get("label"), "Chennai Port")

    # -------------------------------------------------------------------------
    # 13. Failure Handling & Resilience
    # -------------------------------------------------------------------------
    async def test_scenario_13_failure_resilience(self):
        # A. RAG Disabled
        with patch.dict("os.environ", {"RAG_ENABLED": "false"}):
            orchestrator = build_test_orchestrator()
            resp = await orchestrator.handle(OrcaQueryRequest(query="What is Indian mackerel?"))
            self.assertFalse(resp.rag.used)
            self.assertEqual(resp.rag.status, "disabled")

        # B. Chroma Outage during Enabled mode
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            with patch("app.rag.vector_store.ChromaVectorStore.query", side_effect=RuntimeError("Simulated disk error")):
                orchestrator = build_test_orchestrator()
                resp = await orchestrator.handle(OrcaQueryRequest(query="What is Indian mackerel?"))
                self.assertFalse(resp.rag.used)
                self.assertEqual(resp.rag.status, "error")
                self.assertIsNotNone(resp.answer)
