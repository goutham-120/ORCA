"""Context fusion — merges RAG knowledge chunks with live agent evidence.

Phase 1: Skeleton only — interfaces defined, implementation deferred to Phase 2.

Responsibilities (Phase 2):
- Accept the RAGResult and the existing analysis_results / evidence from OrcaState
- De-duplicate overlapping content between RAG chunks and live data
- Format the merged knowledge context into a string suitable for the Synthesizer
- Respect domain relevance (e.g. don't inject fishing regulations into a hazard query)
"""
from __future__ import annotations

import logging
from typing import Any

from app.models.rag import RAGResult

logger = logging.getLogger(__name__)


class ContextFusion:
    """Fuses RAG retrieved chunks with live agent evidence.

    Phase 1: Constructor and interface only. ``fuse()`` raises NotImplementedError.
    """

    def fuse(
        self,
        rag_result: RAGResult,
        analysis_results: dict[str, Any],
        evidence: list[dict[str, Any]],
    ) -> str:
        """Produce a merged knowledge context string for the Synthesizer.

        Parameters
        ----------
        rag_result:
            Output of RAGRetriever.retrieve().
        analysis_results:
            Agent analysis results from OrcaState (ocean, weather, gis).
        evidence:
            Evidence items accumulated during the workflow.

        Returns
        -------
        str
            A formatted context block ready to be injected into the LLM prompt.

        Raises
        ------
        NotImplementedError
            Phase 1 stub — full implementation deferred to Phase 2.
        """
        raise NotImplementedError(
            "ContextFusion.fuse() is not yet implemented. "
            "This will be implemented in RAG Phase 2."
        )
