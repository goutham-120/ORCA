"""RAG retriever tool — LangGraph-compatible wrapper around RAGRetriever.

Phase 1: Skeleton only. This module defines the interface that will be
called from the ``rag_retrieval`` LangGraph node added in Phase 2.

Design notes
------------
- This file lives in ``app/tools/`` alongside the existing agent tools
  (ocean_tools, weather_tools, gis_tools) to follow the established pattern.
- It delegates entirely to ``app.rag.retriever.RAGRetriever`` and should
  contain no retrieval logic itself.
- When RAG_ENABLED=false the tool returns a no-op RAGResult immediately
  without any I/O or imports of heavy packages.
"""
from __future__ import annotations

import logging
from typing import Any

from app.models.rag import RAGResult
from app.rag.retriever import get_retriever

logger = logging.getLogger(__name__)


class RAGRetrieverTool:
    """LangGraph-compatible wrapper around the RAGRetriever singleton.

    Phase 1: Constructor and interface defined; ``run()`` delegates to
    the retriever which safely returns a disabled RAGResult when
    RAG_ENABLED=false.
    """

    def __init__(self) -> None:
        # Retriever is fetched lazily so heavy packages are not loaded at
        # FastAPI startup time when RAG is disabled.
        self._retriever = None

    def _get_retriever(self):  # type: ignore[return]
        if self._retriever is None:
            self._retriever = get_retriever()
        return self._retriever

    def run(self, state: dict[str, Any]) -> RAGResult:
        """Execute RAG retrieval for the current workflow state.

        Parameters
        ----------
        state:
            The OrcaState dict. The query is extracted from
            ``state["context"].parsed_query.original``.

        Returns
        -------
        RAGResult
            Always returns a valid RAGResult. Never raises.
        """
        try:
            context = state.get("context")
            if context is None:
                return RAGResult(retrieval_status="error", error="No context in state.")
            query: str = getattr(getattr(context, "parsed_query", None), "original", "") or ""
            if not query:
                return RAGResult(retrieval_status="skipped", error="Empty query.")
            return self._get_retriever().retrieve(query)
        except Exception as exc:  # noqa: BLE001
            logger.error("RAGRetrieverTool.run() failed: %s", exc)
            return RAGResult(retrieval_status="error", error=str(exc))
