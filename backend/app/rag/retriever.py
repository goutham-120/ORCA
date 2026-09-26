"""RAG retriever — the runtime query interface for the ORCA pipeline.

Phase 1: Skeleton with a safe ``retrieve()`` that returns an empty RAGResult
when RAG is disabled. This is the ONLY class that the rest of the ORCA codebase
will call; everything else in this package is an internal detail.

Design contract
---------------
- When ``RAG_ENABLED=false``, ``retrieve()`` returns immediately with
  ``RAGResult(used=False, retrieval_status="disabled")``.
- When RAG is enabled but the collection is empty or unavailable,
  ``retrieve()`` returns ``RAGResult(retrieval_status="error", ...)``.
- The existing Ask ORCA pipeline must remain fully functional in all cases.
"""
from __future__ import annotations

import logging

from app.models.rag import RAGResult
from app.rag.config import RAGSettings, get_rag_settings

logger = logging.getLogger(__name__)


class RAGRetriever:
    """Runtime retrieval interface for the ORCA RAG pipeline.

    Parameters
    ----------
    settings:
        Optional pre-built RAGSettings. If not provided, settings are read
        from environment variables via ``get_rag_settings()``.
    """

    def __init__(self, settings: RAGSettings | None = None) -> None:
        self._settings = settings or get_rag_settings()
        self._ready: bool = False
        # Vector store and embeddings are NOT initialised here.
        # They will be lazy-loaded in Phase 2 when RAG_ENABLED=true.

    def retrieve(self, query: str) -> RAGResult:
        """Retrieve relevant knowledge chunks for a query.

        When ``RAG_ENABLED=false`` (the default), this method returns
        immediately with a disabled status so the calling code path is
        unchanged from the pre-RAG baseline.

        Parameters
        ----------
        query:
            The user's original query string (or a derived retrieval query).

        Returns
        -------
        RAGResult
            Always returns a valid RAGResult; never raises.
        """
        if not self._settings.enabled:
            return RAGResult(
                used=False,
                query=query,
                retrieved_chunks=[],
                retrieval_status="disabled",
            )

        # Phase 2 will replace the NotImplementedError below with the actual
        # embedding + ChromaDB query logic.
        try:
            raise NotImplementedError(
                "RAGRetriever.retrieve() full implementation is deferred to Phase 2. "
                "Set RAG_ENABLED=false to keep the existing pipeline active."
            )
        except NotImplementedError as exc:
            logger.error("RAG retrieval not yet implemented: %s", exc)
            return RAGResult(
                used=False,
                query=query,
                retrieved_chunks=[],
                retrieval_status="error",
                error=str(exc),
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("RAG retrieval failed unexpectedly: %s", exc)
            return RAGResult(
                used=False,
                query=query,
                retrieved_chunks=[],
                retrieval_status="error",
                error=str(exc),
            )


# Module-level singleton — safe to import anywhere; initialised lazily.
_retriever: RAGRetriever | None = None


def get_retriever() -> RAGRetriever:
    """Return the shared RAGRetriever singleton.

    Thread-safety note: this is fine for the single-process FastAPI dev server.
    For production multi-worker deployments, move to a per-worker initialisation
    pattern in Phase 2.
    """
    global _retriever  # noqa: PLW0603
    if _retriever is None:
        _retriever = RAGRetriever()
    return _retriever
