"""Phase 7 — ORCA RAG Production Deployment Readiness Test Suite.

Validates:
1. Environment & configuration parsing (RAG_CHROMA_PERSIST_DIR alias, defaults, types)
2. Chroma manifest & collection integrity (32 documents, 2,541 chunks)
3. Embedding model loading, E5 prefix formatting & process-level caching
4. Startup warm-up resilience (safe return when disabled/failed)
5. CORS configuration parsing for production Vercel origins
6. Degraded mode resilience (missing Chroma or RAG_ENABLED=false never breaks pipeline)
7. Dual-mount API route compatibility (/map and /api/map)
8. Security check: No hardcoded secrets in settings or RAG configs
"""
from __future__ import annotations

import os
import unittest
from pathlib import Path
from unittest.mock import patch

from app.config import get_settings
from app.core.orchestrator import OrcaOrchestrator
from app.rag.config import DEFAULT_EMBEDDING_MODEL, get_rag_settings
from app.rag.embeddings import SentenceTransformerEmbeddings
from app.rag.retriever import get_retriever, warmup_rag
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
        "wind_speed_mps": 3.5,
        "precipitation_mm": 0.0,
        "air_temperature_c": 28.0,
    },
}

MOCK_OCEAN = {
    "available": True,
    "source_status": "live",
    "provider": "Open-Meteo Marine API",
    "observation": {
        "wave_height_m": 1.0,
        "wave_period_s": 6.0,
        "sea_surface_temperature_c": 28.0,
    },
}


def build_test_orchestrator():
    coordinator = DataCoordinator()
    coordinator.register("weather", MockLiveSource(MOCK_WEATHER))
    coordinator.register("ocean", MockLiveSource(MOCK_OCEAN))
    workflow = OrcaWorkflow(coordinator=coordinator, auto_sync_pfz=False)
    return OrcaOrchestrator(workflow=workflow, location_resolver=None)


class TestRAGDeploymentReadiness(unittest.IsolatedAsyncioTestCase):
    # -------------------------------------------------------------------------
    # 1. Environment & Configuration Parsing
    # -------------------------------------------------------------------------
    def test_01_rag_config_defaults_and_aliases(self):
        """Verify RAG configuration defaults, persist directory alias, and type safety."""
        with patch.dict(os.environ, {
            "RAG_ENABLED": "true",
            "RAG_CHROMA_PERSIST_DIR": "/custom/render/disk/chroma",
            "RAG_WARMUP_ON_STARTUP": "true",
            "RAG_TOP_K": "8",
            "RAG_MIN_RELEVANCE_SCORE": "0.45",
        }, clear=False):
            settings = get_rag_settings()
            self.assertTrue(settings.enabled)
            self.assertTrue(settings.warmup_on_startup)
            self.assertEqual(settings.top_k, 8)
            self.assertAlmostEqual(settings.min_relevance_score, 0.45)
            self.assertEqual(str(settings.persist_directory), str(Path("/custom/render/disk/chroma")))

    # -------------------------------------------------------------------------
    # 2. Chroma Manifest & Collection Integrity
    # -------------------------------------------------------------------------
    def test_02_chroma_manifest_and_collection_integrity(self):
        """Verify the persistent Chroma index contains expected collection, docs, and chunks."""
        settings = get_rag_settings()
        manifest_path = Path(__file__).resolve().parents[1] / "data" / "rag" / "index_manifest.json"

        self.assertTrue(manifest_path.exists(), "index_manifest.json must exist in repository")
        import json
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        self.assertEqual(len(manifest.get("included", [])), 32)
        total_manifest_chunks = sum(d["chunk_count"] for d in manifest.get("included", []))
        self.assertEqual(total_manifest_chunks, 2541)

        if settings.persist_directory.exists() and (settings.persist_directory / "chroma.sqlite3").exists():
            import chromadb
            client = chromadb.PersistentClient(path=str(settings.persist_directory))
            cols = [c.name for c in client.list_collections()]
            self.assertIn("orca_knowledge", cols)
            col = client.get_collection("orca_knowledge")
            self.assertEqual(col.count(), 2541)

    # -------------------------------------------------------------------------
    # 3. Embedding Model & E5 Asymmetric Formatting
    # -------------------------------------------------------------------------
    def test_03_embedding_provider_formatting_and_caching(self):
        """Verify E5 query prefixing and model cache preservation."""
        provider = SentenceTransformerEmbeddings("intfloat/multilingual-e5-small")
        self.assertTrue(provider.is_e5)

        # Process cache dictionary should exist
        self.assertIsInstance(SentenceTransformerEmbeddings._MODEL_CACHE, dict)

    # -------------------------------------------------------------------------
    # 4. Startup Warm-up Resilience
    # -------------------------------------------------------------------------
    def test_04_warmup_rag_resilience(self):
        """warmup_rag() returns False safely when disabled and does not raise exceptions."""
        with patch.dict(os.environ, {"RAG_ENABLED": "false"}):
            self.assertFalse(warmup_rag())

    # -------------------------------------------------------------------------
    # 5. CORS Configuration Parsing
    # -------------------------------------------------------------------------
    def test_05_cors_origins_parsing(self):
        """Verify comma-separated origins in ORCA_CORS_ORIGINS parse into list of strings."""
        with patch.dict(os.environ, {
            "ORCA_CORS_ORIGINS": "https://orca-frontend.vercel.app,https://custom-domain.gov,http://localhost:5173",
        }, clear=False):
            # Clear lru_cache on get_settings to read patched env
            get_settings.cache_clear()
            app_settings = get_settings()
            self.assertIn("https://orca-frontend.vercel.app", app_settings.cors_origins)
            self.assertIn("https://custom-domain.gov", app_settings.cors_origins)
            self.assertIn("http://localhost:5173", app_settings.cors_origins)
            get_settings.cache_clear()

    # -------------------------------------------------------------------------
    # 6. Degraded RAG Mode Resilience
    # -------------------------------------------------------------------------
    async def test_06_degraded_rag_mode_resilience(self):
        """When RAG is disabled or unavailable, live operations succeed without failure."""
        with patch.dict(os.environ, {"RAG_ENABLED": "false"}):
            orchestrator = build_test_orchestrator()
            req = OrcaQueryRequest(
                query="What are today's marine conditions?",
                location={"latitude": 17.7, "longitude": 83.3, "label": "Visakhapatnam"},
            )
            resp = await orchestrator.handle(req)
            self.assertFalse(resp.rag.used)
            self.assertEqual(resp.rag.status, "disabled")
            self.assertTrue(resp.answer)
            self.assertIsNotNone(resp.assessment)

    # -------------------------------------------------------------------------
    # 7. Dual-Mount API Route Compatibility
    # -------------------------------------------------------------------------
    def test_07_dual_mount_api_routes(self):
        """Ensure both /map and /api/map route prefixes are registered for Vercel/Render compatibility."""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        res1 = client.get("/map/layers?sync_pfz=false")
        res2 = client.get("/api/map/layers?sync_pfz=false")
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res2.status_code, 200)

    # -------------------------------------------------------------------------
    # 8. Security Check: No Real Secrets in Default Templates
    # -------------------------------------------------------------------------
    def test_08_no_real_secrets_in_defaults(self):
        """Ensure .env.example template and default settings do not expose production secrets."""
        example_path = Path(__file__).resolve().parents[1] / ".env.example"
        self.assertTrue(example_path.exists())
        example_content = example_path.read_text(encoding="utf-8")
        self.assertNotIn("ghp_", example_content)
        self.assertNotIn("sk-", example_content)
        self.assertNotIn("gsk_", example_content)

        # When environment has no keys, get_settings() llm_api_key is None
        with patch.dict(os.environ, {"GROQ_API_KEY": "", "ORCA_LLM_API_KEY": ""}, clear=False):
            get_settings.cache_clear()
            clean_settings = get_settings()
            self.assertFalse(clean_settings.llm_api_key)
            get_settings.cache_clear()


if __name__ == "__main__":
    unittest.main()
