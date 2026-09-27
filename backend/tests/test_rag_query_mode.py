"""Refined Phase 6 Query Mode & Grounding Test Suite for Ask ORCA.

Validates:
A. Knowledge-only species: "What environmental conditions affect Indian mackerel?"
B. Knowledge-only regulation: "What are the 2026 fishing ban dates?"
C. Knowledge-only safety: "What should fishermen do during a maritime distress situation?"
D. Live operational: "What are the current wave conditions?"
E. Live PFZ: "What are today's PFZs?"
F. Hybrid: "What is a PFZ advisory and where are today's PFZs?"
G. Out of domain: "What is the capital of France?"
H. Temporal grounding: "What are the 2026 fishing ban dates?" does not claim current ban today
I. Multilingual knowledge: Hindi & Telugu queries route to knowledge_only with RAG
J. Failure isolation: simulated RAG failure preserves live-only workflow
"""
from __future__ import annotations

import os
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
        "condition": "calm",
        "wind_speed_mps": 3.8,
        "precipitation_mm": 0.0,
        "air_temperature_c": 28.0,
    },
}

MOCK_OCEAN = {
    "available": True,
    "source_status": "live",
    "provider": "Open-Meteo Marine API",
    "observation": {
        "wave_height_m": 1.1,
        "wave_period_s": 6.5,
        "sea_surface_temperature_c": 28.1,
    },
}


def build_test_orchestrator():
    coordinator = DataCoordinator()
    coordinator.register("weather", MockLiveSource(MOCK_WEATHER))
    coordinator.register("ocean", MockLiveSource(MOCK_OCEAN))
    workflow = OrcaWorkflow(coordinator=coordinator, auto_sync_pfz=False)
    return OrcaOrchestrator(workflow=workflow, location_resolver=None)


class TestRAGQueryMode(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            r = get_retriever()
            r._ensure_initialized()

    # -------------------------------------------------------------
    # A. Knowledge-Only Species (Indian Mackerel)
    # -------------------------------------------------------------
    async def test_a_knowledge_only_species(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What environmental conditions affect Indian mackerel?",
                location={"latitude": 17.68, "longitude": 83.21, "label": "Visakhapatnam Harbor"},
            )
            resp = await orchestrator.handle(req)

            # Query mode must be knowledge_only
            self.assertEqual(resp.query_mode, "knowledge_only")

            # RAG must be used with CMFRI source
            self.assertIsNotNone(resp.rag)
            self.assertTrue(resp.rag.used)
            self.assertEqual(resp.rag.status, "success")
            self.assertTrue(any("CMFRI" in s for s in resp.rag.sources))

            # Grounded content must address mackerel
            self.assertIn("mackerel", resp.answer.lower())

            # NO live operational assessment, no fake suitability, no mini-map
            self.assertIsNone(resp.assessment)
            self.assertIsNone(resp.decision)
            self.assertIsNone(resp.spatial_data)
            self.assertEqual(len(resp.agents_used), 0)
            self.assertEqual(len(resp.evidence), 0)
            self.assertNotIn("Current Operational Assessment", resp.answer)
            self.assertNotIn("Fishing Suitability: Favorable", resp.answer)

    # -------------------------------------------------------------
    # B. Knowledge-Only Regulation (2026 Fishing Ban Dates)
    # -------------------------------------------------------------
    async def test_b_knowledge_only_regulation(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What are the 2026 fishing ban dates?",
                location={"latitude": 9.93, "longitude": 76.26, "label": "Kochi Harbor"},
            )
            resp = await orchestrator.handle(req)

            self.assertEqual(resp.query_mode, "knowledge_only")
            self.assertTrue(resp.rag.used)
            self.assertTrue(any("Fisheries" in s or "Ban" in s for s in resp.rag.sources))

            # Ban dates must be present in knowledge context
            combined_chunks = " ".join(c["content"].lower() for c in resp.rag.retrieved_chunks)
            self.assertTrue("ban" in combined_chunks)
            self.assertTrue("2026" in combined_chunks)

            # NO generic fishing suitability assessment
            self.assertIsNone(resp.assessment)
            self.assertIsNone(resp.decision)
            self.assertIsNone(resp.spatial_data)
            self.assertNotIn("Fishing Suitability: Favorable", resp.answer)
            self.assertNotIn("Current Operational Assessment", resp.answer)

    # -------------------------------------------------------------
    # C. Knowledge-Only Safety (Maritime Distress Procedures)
    # -------------------------------------------------------------
    async def test_c_knowledge_only_safety(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What should fishermen do during a maritime distress situation?",
                location={"latitude": 15.49, "longitude": 73.82, "label": "Goa Coast"},
            )
            resp = await orchestrator.handle(req)

            self.assertEqual(resp.query_mode, "knowledge_only")
            self.assertTrue(resp.rag.used)
            self.assertTrue(any("NMSAR" in s or "Coast Guard" in s or "Safety" in s for s in resp.rag.sources))

            # Grounded safety guidance
            self.assertIsNotNone(resp.answer)
            combined_chunks = " ".join(c["content"].lower() for c in resp.rag.retrieved_chunks)
            self.assertTrue("distress" in combined_chunks or "sar" in combined_chunks or "rescue" in combined_chunks)

            # NO generic fishing suitability assessment
            self.assertIsNone(resp.assessment)
            self.assertIsNone(resp.decision)
            self.assertNotIn("Fishing Suitability", resp.answer)

    # -------------------------------------------------------------
    # D. Live Operational (Current Wave Conditions)
    # -------------------------------------------------------------
    async def test_d_live_operational_waves(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What are the current wave conditions?",
                location={"latitude": 13.08, "longitude": 80.27, "label": "Chennai Marina"},
            )
            resp = await orchestrator.handle(req)

            self.assertEqual(resp.query_mode, "live_operational")
            # Live marine agent must be invoked
            self.assertIn("ocean", resp.agents_used)
            self.assertGreater(len(resp.evidence), 0)
            self.assertTrue(any("Open-Meteo Marine" in e.source for e in resp.evidence))
            self.assertIsNotNone(resp.assessment)

    # -------------------------------------------------------------
    # E. Live PFZ (Today's PFZs)
    # -------------------------------------------------------------
    async def test_e_live_pfz(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What are today's PFZs near this location?",
                location={"latitude": 17.68, "longitude": 83.21, "label": "Visakhapatnam Port"},
            )
            resp = await orchestrator.handle(req)

            self.assertEqual(resp.query_mode, "live_operational")
            self.assertIn(resp.context.get("decision_type"), {"pfz", "fishing"})

    # -------------------------------------------------------------
    # F. Hybrid (PFZ Advisory Explanation + Today's PFZs)
    # -------------------------------------------------------------
    async def test_f_hybrid_pfz_and_live(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What is a PFZ advisory and where are today's PFZs?",
                location={"latitude": 13.08, "longitude": 80.27, "label": "Chennai Harbor"},
            )
            resp = await orchestrator.handle(req)

            self.assertEqual(resp.query_mode, "hybrid")
            # Both RAG knowledge and live agents should be active
            self.assertTrue(resp.rag.used)
            self.assertTrue(any("INCOIS" in s for s in resp.rag.sources))
            self.assertIn(resp.context.get("decision_type"), {"pfz", "fishing"})

    # -------------------------------------------------------------
    # G. Out of Domain (Capital of France)
    # -------------------------------------------------------------
    async def test_g_out_of_domain(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(query="What is the capital of France?")
            resp = await orchestrator.handle(req)

            # Out of domain: no RAG retrieval, no live agents
            self.assertFalse(resp.rag.used)
            self.assertEqual(len(resp.rag.retrieved_chunks), 0)
            self.assertEqual(len(resp.agents_used), 0)
            self.assertEqual(resp.response_kind, "general")

    # -------------------------------------------------------------
    # H. Temporal Grounding (No Unwarranted Current Ban Claim)
    # -------------------------------------------------------------
    async def test_h_temporal_grounding(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(query="What are the 2026 fishing ban dates?")
            resp = await orchestrator.handle(req)

            # Response must not claim that fishing is currently banned today without live proof
            answer_lower = resp.answer.lower()
            self.assertNotIn("fishing is currently banned today", answer_lower)
            self.assertNotIn("fishing is banned today", answer_lower)

    # -------------------------------------------------------------
    # I. Multilingual Knowledge (Hindi & Telugu)
    # -------------------------------------------------------------
    async def test_i_multilingual_knowledge(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            orchestrator = build_test_orchestrator()

            # Hindi knowledge query
            req_hi = OrcaQueryRequest(
                query="भारतीय मैकेरल को कौन सी पर्यावरणीय स्थितियां प्रभावित करती हैं?",
                language="hi",
            )
            resp_hi = await orchestrator.handle(req_hi)
            self.assertEqual(resp_hi.query_mode, "knowledge_only")
            self.assertTrue(resp_hi.rag.used)
            self.assertEqual(resp_hi.language, "hi")
            self.assertIsNone(resp_hi.assessment)

            # Telugu knowledge query
            req_te = OrcaQueryRequest(
                query="సముద్ర ఆపద సమయంలో మత్స్యకారులు ఏమి చేయాలి?",
                language="te",
            )
            resp_te = await orchestrator.handle(req_te)
            self.assertEqual(resp_te.query_mode, "knowledge_only")
            self.assertTrue(resp_te.rag.used)
            self.assertEqual(resp_te.language, "te")
            self.assertIsNone(resp_te.assessment)

    # -------------------------------------------------------------
    # J. Failure Isolation (RAG Failure Leaves Live Intact)
    # -------------------------------------------------------------
    async def test_j_failure_isolation(self):
        with patch.dict("os.environ", {"RAG_ENABLED": "true"}):
            with patch("app.rag.retriever.RAGRetriever.retrieve", side_effect=RuntimeError("Simulated Chroma outage")):
                orchestrator = build_test_orchestrator()
                req = OrcaQueryRequest(
                    query="What are the current wave conditions?",
                    location={"latitude": 15.49, "longitude": 73.82, "label": "Goa Harbor"},
                )
                resp = await orchestrator.handle(req)

                # Live operational pipeline must still execute successfully
                self.assertEqual(resp.query_mode, "live_operational")
                self.assertIn("ocean", resp.agents_used)
                self.assertGreater(len(resp.evidence), 0)
                self.assertIsNotNone(resp.assessment)
                self.assertEqual(resp.rag.status, "error")
                self.assertFalse(resp.rag.used)
